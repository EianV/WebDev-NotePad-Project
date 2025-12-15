"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../_utils/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

type Note = {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: any;
  uid: string;
  updatedAt?: any;
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "category">("date");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      } else {
        console.log("User authenticated:", user.email);
        const q = query(
          collection(db, "notes"),
          where("uid", "==", user.uid)
        );

        // Set up real-time listener
        const unsubscribeSnapshot = onSnapshot(
          q,
          (snap) => {
            const notesData = snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            })) as Note[];
            
            // Sort notes based on selected sort option
            const sortedNotes = sortNotes(notesData, sortBy);
            
            // Remove duplicates based on id
            const uniqueNotes = sortedNotes.filter((note, index, self) =>
              index === self.findIndex((n) => n.id === note.id)
            );
            
            setNotes(uniqueNotes);
            console.log("Notes loaded from Firebase:", uniqueNotes.length);
            
            // Select the first note if none selected
            if (uniqueNotes.length > 0 && !selectedNote) {
              setSelectedNote(uniqueNotes[0]);
              setTitle(uniqueNotes[0].title);
              setCategory(uniqueNotes[0].category);
              setContent(uniqueNotes[0].content);
            }
          },
          (error) => {
            console.error("Firestore error:", error);
            setError("Failed to load notes from database");
          }
        );
        return () => unsubscribeSnapshot();
      }
    });

    return () => unsub();
  }, []);

  // Sort Function
  const sortNotes = (notesToSort: Note[], sortOption: "date" | "name" | "category") => {
    const sorted = [...notesToSort];
    
    if (sortOption === "date") {
      // Sort by latest
      sorted.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
    } else if (sortOption === "name") {
      // Sort by alphabetically
      sorted.sort((a, b) => {
        const titleA = a.title?.toLowerCase() || "";
        const titleB = b.title?.toLowerCase() || "";
        return titleA.localeCompare(titleB);
      });
    } else if (sortOption === "category") {
      // Sort by category, then title
      sorted.sort((a, b) => {
        const categoryA = a.category?.toLowerCase() || "";
        const categoryB = b.category?.toLowerCase() || "";
        if (categoryA === categoryB) {
          // If same category, sort title
          const titleA = a.title?.toLowerCase() || "";
          const titleB = b.title?.toLowerCase() || "";
          return titleA.localeCompare(titleB);
        }
        return categoryA.localeCompare(categoryB);
      });
    }
    
    return sorted;
  };

  // Sort notes when sortBy changes
  useEffect(() => {
    if (notes.length > 0) {
      const sorted = sortNotes(notes, sortBy);
      setNotes(sorted);
    }
  }, [sortBy]);
  //creating a new note function
  async function addNote() {
    if (!auth.currentUser) {
      setError("You must be logged in to save notes");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title for your note");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const newNote = {
        uid: auth.currentUser.uid,
        title: title.trim(),
        category: category.trim() || "Category",
        content: content.trim(),
        createdAt: serverTimestamp(),
      };

      console.log("Saving new note to Firebase...");
      const docRef = await addDoc(collection(db, "notes"), newNote);
      console.log("Note saved with ID:", docRef.id);
      
      setSaveMessage("Note saved successfully!");
      
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error: any) {
      console.error("Error saving note:", error);
      setError(`Failed to save note: ${error.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  }
  //updating a selected note
  async function updateNote() {
    if (!selectedNote) return;
    
    setIsSaving(true);
    setError("");

    try {
      console.log("Updating note in Firebase:", selectedNote.id);
      await updateDoc(doc(db, "notes", selectedNote.id), {
        title: title.trim(),
        category: category.trim() || "Category",
        content: content.trim(),
        updatedAt: serverTimestamp(),
      });
      
      console.log("Note updated successfully");
      setSaveMessage("Note updated successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error: any) {
      console.error("Error updating note:", error);
      setError(`Failed to update note: ${error.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  }
  // deleting a note function
  async function deleteNote(id: string) {
    if (!confirm("Are you sure you want to delete this note?")) return;
    
    try {
      console.log("Deleting note from Firebase:", id);
      await deleteDoc(doc(db, "notes", id));
      console.log("Note deleted successfully");
      
      // Update local state 
      setNotes(prev => prev.filter(note => note.id !== id));
      
      // If deleting the currently selected note, clear the form
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setTitle("");
        setCategory("");
        setContent("");
      }
    } catch (error: any) {
      console.error("Error deleting note:", error);
      setError(`Failed to delete note: ${error.message || "Unknown error"}`);
    }
  }
  // Select note
  function handleNoteSelect(note: Note) {
    setSelectedNote(note);
    setTitle(note.title);
    setCategory(note.category);
    setContent(note.content);
    setIsEditingTitle(false);
    setIsEditingCategory(false);
    setError("");
  }

  function handleSave() {
    if (!title.trim()) {
      setError("Please enter a title for your note");
      return;
    }
    
    if (selectedNote) {
      updateNote();
    } else {
      addNote();
    }
  }

  function handleCreateNew() {
    setSelectedNote(null);
    setTitle("");
    setCategory("");
    setContent("");
    setIsEditingTitle(false);
    setIsEditingCategory(false);
    setError("");
    setSaveMessage("");
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Sideheader */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">NotePad</h1>
          <p className="text-sm text-gray-500 mt-1">Your personal notes</p>
          {notes.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {notes.length} saved {notes.length === 1 ? 'note' : 'notes'}
            </p>
          )}
        </div>

        {/* Sorting Buttons */}
        <div className="mt-4 px-4">
          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={() => setSortBy("date")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                sortBy === "date"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}>Date</button>
            <button
              onClick={() => setSortBy("name")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                sortBy === "name"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}>Name</button>

            <button
              onClick={() => setSortBy("category")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                sortBy === "category"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}>Category</button>
          </div>
        </div>

        {/* Saved Notes List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Saved Notes
          </h2>
          
          {notes.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No saved notes yet</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedNote?.id === note.id
                      ? "bg-blue-50 border border-blue-100"
                      : "bg-gray-50 hover:bg-gray-100 border border-transparent"
                  }`}
                  onClick={() => handleNoteSelect(note)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-800 truncate">
                      {note.title || "Untitled Note"}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="text-gray-400 hover:text-red-500 text-sm px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
                      title="Delete note">×</button>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full">
                      {note.category || "Category"}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {note.createdAt?.toDate?.()?.toLocaleDateString() || "Today"}
                    </span>
                  </div>
                  {note.content && (
                    <p className="text-sm text-gray-600 truncate mt-2">{note.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Note Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleCreateNew}
            className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center"
          ><span className="mr-2">+</span> New Note</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Status Messages */}
        {(error || saveMessage) && (
          <div className="px-6 pt-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
            )}
            {saveMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{saveMessage}</div>
            )}
          </div>
        )}

        {/* Header with Title, Category, and Log out */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {/* Editable Title */}
              <div className="flex items-center">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-2xl font-bold text-gray-800 border-b-2 border-blue-500 bg-transparent outline-none px-1"
                    autoFocus
                  />
                ) : (
                  <h2
                    className="text-2xl font-bold text-gray-800 cursor-pointer hover:bg-gray-100 px-1 rounded"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {title || "Untitled Note"}
                  </h2>
                )}
              </div>

              {/* Separator */}
              <span className="text-gray-300">/</span>

              {/* Editable Category */}
              <div className="flex items-center">
                {isEditingCategory ? (
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="text-lg text-gray-600 border-b-2 border-blue-500 bg-transparent outline-none px-1"
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-lg text-gray-600 cursor-pointer hover:bg-gray-100 px-1 rounded"
                    onClick={() => setIsEditingCategory(true)}
                    >{category || "Category"}</span>)}
              </div>
            </div>

            {/* Log out Button */}
            <button
              onClick={() => signOut(auth)}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors flex items-center"
            >
              <span className="mr-2">Log Out</span>
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </header>

        {/* Content Editor Area */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            {/* Content Textarea */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your note here..."
              className="flex-1 p-6 resize-none border-none focus:outline-none focus:ring-0 text-gray-700"
              rows={10}
            />
            
            {/* Save Button and Status */}
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {selectedNote ? (
                  <span>
                    {selectedNote.updatedAt 
                      ? `Updated: ${selectedNote.updatedAt.toDate?.()?.toLocaleTimeString()}` 
                      : `Created: ${selectedNote.createdAt?.toDate?.()?.toLocaleDateString()}`}
                  </span>) : (<span>New note - not saved yet</span>)}
              </div>
              
              <button
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center ${
                  isSaving || !title.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-500 text-white hover:bg-green-600"}`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Saving...</>
                ) : selectedNote ? ("Update Note") : ("Save Note")}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}