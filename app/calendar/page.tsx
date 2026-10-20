import Link from "next/link";
import Header from "@/components/Header";
import PostDraftItem from "@/components/PostDraftItem";
import {
  getPendingPostApprovalsForProject,
  getPostsForProject,
  getProjects,
} from "@/lib/data";
import { generateContentPlan } from "@/app/actions/social";

const SOCIAL_MESSAGES: Record<string, string> = {
  ok: "Wygenerowano plan contentu i propozycje postów.",
  no_key: "Brak ANTHROPIC_API_KEY — nie można uruchomić Agenta Social.",
  no_db: "Agent Social wymaga skonfigurowanego Supabase (service role).",
  error: "Wystąpił błąd podczas generowania planu contentu.",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "szkic",
  queued: "zakolejkowany",
  published: "opublikowany",
  failed: "błąd",
};

interface CalendarPageProps {
  searchParams: Promise<{
    project?: string;
    social?: string;
    approvals?: string;
  }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const projects = await getProjects();
  const selectedId = params.project ?? projects[0]?.id;
  const selected = projects.find((p) => p.id === selectedId);

  const posts = selected ? await getPostsForProject(selected.id) : [];
  const drafts = selected
    ? await getPendingPostApprovalsForProject(selected.id)
    : [];

  const banner =
    (params.social && SOCIAL_MESSAGES[params.social]) ||
    (params.approvals === "approved" ? "Zatwierdzono post." : null);

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        {banner && (
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">
            {banner}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/calendar?project=${p.id}`}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                p.id === selectedId
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {p.name}
            </Link>
          ))}
        </div>

        {!selected ? (
          <p className="text-sm text-muted">Brak projektów.</p>
        ) : (
          <>
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">
                    Plan contentu — {selected.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Agent Social zaproponuje posty na Instagram na 2 tygodnie
                    do przodu.
                  </p>
                </div>
                <form action={generateContentPlan}>
                  <input type="hidden" name="project_id" value={selected.id} />
                  <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
                    Generuj plan contentu
                  </button>
                </form>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">Kalendarz postów</h2>
              {posts.length === 0 ? (
                <p className="text-sm text-muted">Brak jeszcze postów.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="font-mono text-[11px] uppercase text-muted">
                      <th className="pb-2">Termin</th>
                      <th className="pb-2">Format</th>
                      <th className="pb-2">Opis</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="border-t border-border">
                        <td className="py-2 font-mono text-xs text-muted">
                          {post.scheduled_at
                            ? new Date(post.scheduled_at).toLocaleString("pl-PL")
                            : "—"}
                        </td>
                        <td className="py-2 text-muted">{post.format}</td>
                        <td className="max-w-xs truncate py-2">
                          {post.caption ?? "—"}
                        </td>
                        <td className="py-2 font-mono text-xs text-muted">
                          {STATUS_LABELS[post.status] ?? post.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold">Szkice do zatwierdzenia</h2>
              {drafts.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  Brak szkiców do zatwierdzenia.
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {drafts.map((d) => (
                    <PostDraftItem key={d.id} approval={d} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
