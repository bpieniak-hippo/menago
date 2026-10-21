import Link from "next/link";
import Header from "@/components/Header";
import ActivityFeed from "@/components/ActivityFeed";
import { getAllTasks, getRecentActivity } from "@/lib/data";
import type { AgentSlug } from "@/lib/types";

const AGENT_SLUGS: AgentSlug[] = [
  "manager",
  "album",
  "social",
  "promo",
  "wydawniczy",
  "analityk",
  "katalog",
  "trendy",
];

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "do zrobienia",
  in_progress: "w trakcie",
  done: "zrobione",
  failed: "nieudane",
};

const TASK_STATUS_STYLES: Record<string, string> = {
  pending: "bg-border text-muted",
  in_progress: "bg-status-progress/15 text-status-progress",
  done: "bg-accent/15 text-accent",
  failed: "bg-red-500/15 text-red-500",
};

interface ArchivePageProps {
  searchParams: Promise<{ agent?: string }>;
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const params = await searchParams;
  const agent = AGENT_SLUGS.includes(params.agent as AgentSlug)
    ? (params.agent as AgentSlug)
    : null;

  const [allTasks, allActivity] = await Promise.all([
    getAllTasks(),
    getRecentActivity(200),
  ]);

  const tasks = agent ? allTasks.filter((t) => t.agent_slug === agent) : allTasks;
  const activity = agent
    ? allActivity.filter((a) => a.agent_slug === agent)
    : allActivity;

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <h1 className="text-lg font-semibold">Archiwum</h1>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/archive"
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              !agent
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            Wszyscy
          </Link>
          {AGENT_SLUGS.map((slug) => (
            <Link
              key={slug}
              href={`/archive?agent=${slug}`}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                agent === slug
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {slug}
            </Link>
          ))}
        </div>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-semibold">Zadania</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted">Brak zadań.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="font-mono text-[11px] uppercase text-muted">
                  <th className="pb-2">Tytuł</th>
                  <th className="pb-2">Agent</th>
                  <th className="pb-2">Zlecił</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Utworzono</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-2 pr-2">
                      <p>{t.title}</p>
                      {t.description && (
                        <p className="mt-0.5 text-xs text-muted">
                          {t.description}
                        </p>
                      )}
                    </td>
                    <td className="py-2 pr-2 font-mono text-xs text-accent">
                      {t.agent_slug}
                    </td>
                    <td className="py-2 pr-2 text-muted">{t.created_by}</td>
                    <td className="py-2 pr-2">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] ${
                          TASK_STATUS_STYLES[t.status] ?? ""
                        }`}
                      >
                        {TASK_STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-[11px] text-muted">
                      {new Date(t.created_at).toLocaleString("pl-PL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-semibold">Historia aktywności</h2>
          <ActivityFeed items={activity} />
        </section>
      </main>
    </>
  );
}
