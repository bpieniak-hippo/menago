import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ActivityFeed from "@/components/ActivityFeed";
import ApprovalItem from "@/components/ApprovalItem";
import {
  getActivityForAgent,
  getAgentBySlug,
  getApprovalsForAgent,
  getReportsForAgent,
} from "@/lib/data";
import type { AgentSlug } from "@/lib/types";

const VALID_SLUGS: AgentSlug[] = [
  "manager",
  "album",
  "social",
  "promo",
  "wydawniczy",
  "analityk",
  "katalog",
  "trendy",
];

const STATUS_STYLES: Record<string, string> = {
  "w toku": "bg-status-progress/15 text-status-progress",
  "czeka na Ciebie": "bg-accent/15 text-accent",
  "w gotowości": "bg-border text-muted",
};

interface AgentDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AgentDetailPage({
  params,
}: AgentDetailPageProps) {
  const { slug } = await params;
  if (!VALID_SLUGS.includes(slug as AgentSlug)) notFound();
  const agentSlug = slug as AgentSlug;

  const [agent, activity, reports, approvals] = await Promise.all([
    getAgentBySlug(agentSlug),
    getActivityForAgent(agentSlug),
    getReportsForAgent(agentSlug),
    getApprovalsForAgent(agentSlug),
  ]);

  if (!agent) notFound();

  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{agent.name}</h2>
              <p className="mt-1 text-sm text-muted">{agent.role}</p>
            </div>
            <span
              className={`whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] ${STATUS_STYLES[agent.status] ?? ""}`}
            >
              {agent.status}
            </span>
          </div>

          <p className="mt-3 text-sm text-foreground/90">
            {agent.current_task ?? "Brak aktywnych zadań"}
          </p>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${agent.progress}%` }}
            />
          </div>

          {agent.last_run_at && (
            <p className="mt-2 font-mono text-[11px] text-muted">
              ostatnia aktywność:{" "}
              {new Date(agent.last_run_at).toLocaleString("pl-PL")}
            </p>
          )}
        </section>

        {reports.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-base font-semibold">Raporty</h3>
            <div className="flex flex-col gap-4">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <p className="font-mono text-[11px] text-muted">
                    {new Date(report.period_start).toLocaleDateString("pl-PL")}
                    {" – "}
                    {new Date(report.period_end).toLocaleDateString("pl-PL")}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">
                    {report.content}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {pending.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-base font-semibold">Do zatwierdzenia</h3>
            <div className="flex flex-col gap-2">
              {pending.map((approval) => (
                <ApprovalItem key={approval.id} approval={approval} />
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-base font-semibold">Ostatnia aktywność</h3>
          <ActivityFeed items={activity} />
        </section>

        {decided.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-base font-semibold">
              Historia propozycji
            </h3>
            <div className="flex flex-col gap-2 text-sm">
              {decided.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-2"
                >
                  <span className="truncate">{approval.title}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted">
                    {approval.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
