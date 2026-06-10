"use client";

import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("ChangeMe123!");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Login failed");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f6] px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-line bg-white p-5">
        <h1 className="text-2xl font-semibold text-ink">Agents Console</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to manage agents and landing pages.</p>
        <label className="mt-5 flex flex-col gap-1 text-sm font-medium text-slate-700">
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 rounded border border-line bg-field px-3 text-sm font-normal"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 rounded border border-line bg-field px-3 text-sm font-normal"
          />
        </label>
        {message ? <div className="mt-3 text-sm text-red-700">{message}</div> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          <LogIn size={16} />
          Sign In
        </button>
      </form>
    </main>
  );
}
