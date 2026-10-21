import Link from "next/link";
import type { Activity, Approval } from "@/lib/types";
import { handleManagerCommand, requestManagerAdvice } from "@/app/actions/manager";

interface ManagerBriefProps {
  approvals: Approval[];
  managerActivity: Activity[];
}

export default function ManagerBrief({
  approvals,
  managerActivity,
}: ManagerBriefProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Brief Managera</h2>
        <div className="flex items-center gap-2">
          <form action={requestManagerAdvice}>
            <button
              type="submit"
              className="rounded-full border border-accent/60 px-2.5 py-1 font-mono text-xs text-accent transition hover:bg-accent/10"
            >
              Poproś o radę
            </button>
          </form>
          <span className="rounded-full bg-accent/15 px-2.5 py-1 font-mono text-xs text-accent">
            {approvals.length} do decyzji
          </span>
        </div>
      </div>

      <form action={handleManagerCommand} className="mt-4 flex gap-2">
        <input
          type="text"
          name="command"
          required
          placeholder="Wpisz zadanie dla managera…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          Wyślij
        </button>
      </form>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-muted">
            Ostatnie działania Managera
          </h3>
          <Link
            href="/archive"
            className="font-mono text-[11px] text-accent hover:underline"
          >
            Archiwum →
          </Link>
        </div>
        {managerActivity.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Manager jeszcze nic nie zrobił — wydaj mu polecenie powyżej.
          </p>
        ) : (
          <ol className="mt-2 flex flex-col gap-2">
            {managerActivity.slice(0, 3).map((a) => (
              <li key={a.id}>
                <Link
                  href={`/activity/${a.id}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm transition hover:border-accent/50"
                >
                  <span className="truncate text-foreground/90">
                    {a.message}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-muted">
                    {new Date(a.created_at).toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
