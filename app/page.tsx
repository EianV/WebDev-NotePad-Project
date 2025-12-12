"use client";

import { GithubAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  async function loginWithGitHub() {
    const provider = new GithubAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/notes");
    } catch (err) {
      alert("Login failed");
      console.error(err);
    }
  }

  return (
    <main className="center">
      <h1>Todo List</h1>
      <p>Login with GitHub to continue</p>
      <button onClick={loginWithGitHub}>Login with GitHub</button>
    </main>
  );
}
