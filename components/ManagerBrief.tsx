import type { Agent, Approval } from "@/lib/types";
import { handleManagerCommand } from "@/app/actions/manager";

function buildPriorities(agents: Agent[], approvals: Approval[]): string[] {
  const priorities: string[] = [];

  if (approvals.length > 0) {
    priorities.push(
      `Zatwierdź ${approvals.length} ${
        approvals.length === 1 ? "propozycję" : "propozycje"
      } w kolejce (${approvals.map((a) => a.agent_slug).join(", ")}).`,
    );
  }

  const waiting = agents.filter((a) => a.status === "czeka na Ciebie");
  for (const agent of waiting) {
    if (agent.current_task) priorities.push(`${agent.name}: ${agent.current_task}`);
  }

  const inProgress = agents.filter((a) => a.status === "w toku");
  if (priorities.length < 3 && inProgress.length > 0) {
    priorities.push(
      `${inProgress.length} ${
        inProgress.length === 1 ? "agent pracuje" : "agentów pracuje"
      } w tle — sprawdź postępy niżej.`,
    );
  }

  return priorities.slice(0, 3);
}

interface ManagerBriefProps {
  agents: Agent[];
  approvals: Approval[];
  dailyBrief: string | null;
}

export default function ManagerBrief({
  agents,
  approvals,
  dailyBrief,
}: ManagerBriefProps) {
  const priorities = buildPriorities(agents, approvals);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Brief Managera</h2>
        <span className="rounded-full bg-accent/15 px-2.5 py-1 font-mono text-xs text-accent">
          {approvals.length} do decyzji
        </span>
      </div>

      <p className="mt-2 whitespace-pre-line text-sm text-muted">
        {dailyBrief ??
          "Codzienne podsumowanie tego, co wymaga Twojej uwagi i nad czym pracuje sztab. (Brak jeszcze wygenerowanego briefu dnia — zostanie utworzony przez cron o 9:00.)"}
      </p>

      <form action={handleManagerCommand} className="mt-4 flex gap-2">
        <input
          type="text"
          name="command"
          required
          placeholder="Wydaj polecenie managerowi…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          Wyślij
        </button>
      </form>

      {priorities.length > 0 && (
        <ol className="mt-4 flex flex-col gap-2 text-sm">
          {priorities.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-accent">{i + 1}.</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
