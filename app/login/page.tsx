"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
        <h1 className="font-mono text-xs uppercase tracking-widest text-muted">
          Funkmaster Winio x Haipeson
        </h1>
        <h2 className="mt-1 text-2xl font-semibold">Menago</h2>
        <p className="mt-2 text-sm text-muted">
          {mode === "password"
            ? "Zaloguj się e-mailem i hasłem."
            : "Zaloguj się linkiem wysłanym na maila."}
        </p>

        {mode === "password" ? (
          <form
            onSubmit={handlePassword}
            className="mt-6 flex flex-col gap-3"
          >
            <input
              type="email"
              required
              placeholder="twoj@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              type="password"
              required
              placeholder="hasło"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Logowanie…" : "Zaloguj się"}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        ) : sent ? (
          <p className="mt-6 text-sm text-foreground">
            Sprawdź skrzynkę <span className="text-accent">{email}</span> i
            kliknij link logowania.
          </p>
        ) : (
          <form onSubmit={handleMagicLink} className="mt-6 flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="twoj@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Wyślij link logowania
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "password" ? "magic" : "password");
            setError(null);
            setSent(false);
          }}
          className="mt-4 text-xs text-muted underline-offset-2 hover:underline"
        >
          {mode === "password"
            ? "Zaloguj linkiem e-mail zamiast hasła"
            : "Zaloguj hasłem zamiast linku"}
        </button>
      </div>
    </main>
  );
}
