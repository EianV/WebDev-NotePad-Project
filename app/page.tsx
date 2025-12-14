"use client";

import { GithubAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./_utils/firebase";
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
    <main className="min-h-screen flex items-center justify-center bg-gray-200">
      <div className="bg-white rounded-2xl shadow-md w-[500px] h-[300px] flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-2xl font-semibold mb-2">Welcome to Todo List</h1>

        <p className="text-gray-600 mb-8">Log in with Github to continue</p>

        <button
          onClick={loginWithGitHub}
          className="px-6 py-2 rounded-full border border-gray-300 bg-gray-100 hover:bg-gray-200 transition">Login</button>
      </div>
    </main>
  );
}
