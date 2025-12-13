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
} from "firebase/firestore";

type Note = {
  id: string;
  title: string;
  category: string;
  content: string;
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) window.location.href = "/";
      else {
        const q = query(
          collection(db, "notes"),
          where("uid", "==", user.uid)
        );

        onSnapshot(q, (snap) => {
          setNotes(
            snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            }))
          );
        });
      }
    });

    return () => unsubAuth();
  }, []);

  async function addNote() {
    if (!auth.currentUser) return;

    await addDoc(collection(db, "notes"), {
      uid: auth.currentUser.uid,
      title,
      category,
      content,
      createdAt: serverTimestamp(),
    });

    setTitle("");
    setCategory("");
    setContent("");
  }

  async function deleteNote(id: string) {
    await deleteDoc(doc(db, "notes", id));
  }

  return (
    <main className="container">
      <header className="row">
        <h2>Your Notes</h2>
        <button onClick={() => signOut(auth)}>Logout</button>
      </header>

      <section className="card">
        <h3>Add Note</h3>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <textarea
          placeholder="Note content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button onClick={addNote}>Add</button>
      </section>

      <section className="notes">
        {notes.map((n) => (
          <div key={n.id} className="note">
            <h4>{n.title}</h4>
            <small>{n.category}</small>
            <p>{n.content}</p>
            <button onClick={() => deleteNote(n.id)}>Delete</button>
          </div>
        ))}
      </section>
    </main>
  );
}
