"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
        <h1 className="font-mono text-xs uppercase tracking-widest text-muted">
          Haipeson × Winiu
        </h1>
        <h2 className="mt-1 text-2xl font-semibold">Menago</h2>
        <p className="mt-2 text-sm text-muted">
          Zaloguj się linkiem wysłanym na maila.
        </p>

        {sent ? (
          <p className="mt-6 text-sm text-foreground">
            Sprawdź skrzynkę <span className="text-accent">{email}</span> i
            kliknij link logowania.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
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
      </div>
    </main>
  );
}
