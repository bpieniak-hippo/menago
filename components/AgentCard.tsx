import type { Agent } from "@/lib/types";

const STATUS_STYLES: Record<Agent["status"], string> = {
  "w toku": "bg-status-progress/15 text-status-progress",
  "czeka na Ciebie": "bg-accent/15 text-accent",
  "w gotowości": "bg-border text-muted",
};

export default function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{agent.name}</h3>
          <p className="text-xs text-muted">{agent.role}</p>
        </div>
        <span
          className={`whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] ${STATUS_STYLES[agent.status]}`}
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
          {new Date(agent.last_run_at).toLocaleTimeString("pl-PL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
