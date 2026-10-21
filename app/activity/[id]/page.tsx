import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { getActivityById, getTaskById } from "@/lib/data";

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "do zrobienia",
  in_progress: "w trakcie",
  done: "zrobione",
  failed: "nieudane",
};

interface ActivityDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ActivityDetailPage({
  params,
}: ActivityDetailPageProps) {
  const { id } = await params;
  const activity = await getActivityById(id);
  if (!activity) notFound();

  const task =
    activity.ref_type === "task" && activity.ref_id
      ? await getTaskById(activity.ref_id)
      : null;

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        <Link href="/" className="font-mono text-xs text-muted hover:text-foreground">
          ← Wróć do dashboardu
        </Link>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-[11px] text-accent">
              {activity.agent_slug}
            </span>
            <span className="font-mono text-[11px] text-muted">
              {new Date(activity.created_at).toLocaleString("pl-PL")}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm text-foreground/90">
            {activity.message}
          </p>
        </section>

        {task && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-base font-semibold">
              Zlecone zadanie
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="font-mono text-[11px] text-muted">
                  Komu zlecono:{" "}
                </span>
                <Link
                  href={`/agents/${task.agent_slug}`}
                  className="text-accent hover:underline"
                >
                  {task.agent_slug}
                </Link>
              </p>
              <p>
                <span className="font-mono text-[11px] text-muted">
                  Tytuł:{" "}
                </span>
                {task.title}
              </p>
              {task.description && (
                <p>
                  <span className="font-mono text-[11px] text-muted">
                    Opis:{" "}
                  </span>
                  {task.description}
                </p>
              )}
              <p>
                <span className="font-mono text-[11px] text-muted">
                  Status:{" "}
                </span>
                {TASK_STATUS_LABELS[task.status] ?? task.status}
              </p>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
