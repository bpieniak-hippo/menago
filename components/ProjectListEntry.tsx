import Link from "next/link";
import type { ProjectSummary } from "@/lib/projectSummary";

export default function ProjectListEntry({ summary }: { summary: ProjectSummary }) {
  const { project, tracks, todo, done, isReleased } = summary;

  return (
    <details className="group rounded-xl border border-border bg-card p-4 open:pb-3">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{project.name}</h3>
            {isReleased && (
              <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-green-400">
                ✓ Wydany
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">
            {project.stage}
            {project.release_date ? ` · premiera ${project.release_date}` : ""}
          </p>
          <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-status-progress"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-muted">
            {project.progress}% · {done.length} zrobione · {todo.length} do zrobienia
            {tracks.length > 0 ? ` · ${tracks.length} utworów` : ""}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-muted transition group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
        {tracks.length > 0 && (
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
              Tracklista
            </p>
            <ul className="flex flex-col gap-0.5 text-sm">
              {tracks.map((t) => (
                <li key={t.id} className="text-foreground/80">
                  #{t.position} {t.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {todo.length > 0 && (
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-amber-400">
              Do zrobienia ({todo.length})
            </p>
            <ul className="flex flex-col gap-0.5 text-sm">
              {todo.slice(0, 8).map((a) => (
                <li key={a.id} className="text-foreground/80">
                  {a.trackTitle ? `${a.trackTitle} — ${a.label}` : a.label}
                </li>
              ))}
              {todo.length > 8 && (
                <li className="text-muted">…i {todo.length - 8} więcej</li>
              )}
            </ul>
          </div>
        )}

        {done.length > 0 && (
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-green-500">
              Zrobione ({done.length})
            </p>
            <ul className="flex flex-col gap-0.5 text-sm text-muted">
              {done.slice(0, 5).map((a) => (
                <li key={a.id}>
                  {a.trackTitle ? `${a.trackTitle} — ${a.label}` : a.label}
                </li>
              ))}
              {done.length > 5 && <li>…i {done.length - 5} więcej</li>}
            </ul>
          </div>
        )}

        {tracks.length === 0 && todo.length === 0 && done.length === 0 && (
          <p className="text-sm text-muted">
            Brak jeszcze tracklisty ani elementów checklisty.
          </p>
        )}

        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-accent hover:underline"
        >
          Otwórz pełny widok →
        </Link>
      </div>
    </details>
  );
}
