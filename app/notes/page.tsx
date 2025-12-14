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
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) window.location.href = "/";
      else {
        const q = query(
          collection(db, "notes"),
          where("uid", "==", user.uid)
        );

        onSnapshot(q, (snap) => {
          const notesData = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as Note[];
          
          // Sort by creation date (newest first)
          notesData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
          setNotes(notesData);
          
          // Select the first note if none selected
          if (notesData.length > 0 && !selectedNote) {
            setSelectedNote(notesData[0]);
            setTitle(notesData[0].title);
            setCategory(notesData[0].category);
            setContent(notesData[0].content);
          }
        });
      }
    });

    return () => unsub();
  }, []);

  async function addNote() {
    if (!auth.currentUser) return;

    const newNote = {
      uid: auth.currentUser.uid,
      title: title || "Untitled Note",
      category: category || "General",
      content: content || "",
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "notes"), newNote);
    
    // Select the newly created note
    const noteWithId = { id: docRef.id, ...newNote } as Note;
    setSelectedNote(noteWithId);
    
    // Reset form only if we're creating a brand new note
    if (!selectedNote) {
      setTitle("");
      setCategory("");
      setContent("");
    }
  }

  async function updateNote() {
    if (!selectedNote) return;
    
    await updateDoc(doc(db, "notes", selectedNote.id), {
      title,
      category,
      content,
      updatedAt: serverTimestamp(),
    });
  }

  async function deleteNote(id: string) {
    await deleteDoc(doc(db, "notes", id));
    
    // If deleting the currently selected note, clear the form
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setTitle("");
      setCategory("");
      setContent("");
    }
  }

  function handleNoteSelect(note: Note) {
    setSelectedNote(note);
    setTitle(note.title);
    setCategory(note.category);
    setContent(note.content);
    setIsEditingTitle(false);
    setIsEditingCategory(false);
  }

  function handleSave() {
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
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">NotePad</h1>
          <p className="text-sm text-gray-500 mt-1">Your personal notes</p>
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
                      className="text-gray-400 hover:text-red-500 text-xs"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full">
                      {note.category || "General"}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {note.createdAt?.toDate().toLocaleDateString()}
                    </span>
                  </div>
                  {note.content && (
                    <p className="text-sm text-gray-600 truncate mt-2">
                      {note.content}
                    </p>
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
          >
            <span className="mr-2">+</span> New Note</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Header with Title, Category, and Logout */}
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
                    onBlur={() => {
                      setIsEditingTitle(false);
                      if (selectedNote) updateNote();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsEditingTitle(false);
                        if (selectedNote) updateNote();
                      }
                    }}
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
                    onBlur={() => {
                      setIsEditingCategory(false);
                      if (selectedNote) updateNote();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsEditingCategory(false);
                        if (selectedNote) updateNote();
                      }
                    }}
                    className="text-lg text-gray-600 border-b-2 border-blue-500 bg-transparent outline-none px-1"
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-lg text-gray-600 cursor-pointer hover:bg-gray-100 px-1 rounded"
                    onClick={() => setIsEditingCategory(true)}
                  >
                    {category || "General"}
                  </span>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => signOut(auth)}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors flex items-center"
            >
              <span className="mr-2">LogOut</span>
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
            
            {/* Save Button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center"
              >
                <span className="mr-2">
                  {selectedNote ? "Update Note" : "Save Note"}
                </span>
                <i className="fas fa-save"></i>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}