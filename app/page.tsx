import Header from "@/components/Header";
import ManagerBrief from "@/components/ManagerBrief";
import AgentCard from "@/components/AgentCard";
import ApprovalItem from "@/components/ApprovalItem";
import ProjectCard from "@/components/ProjectCard";
import ActivityFeed from "@/components/ActivityFeed";
import {
  getActivityForAgent,
  getAgents,
  getPendingApprovals,
  getProjects,
  getRecentActivity,
} from "@/lib/data";

const MANAGER_MESSAGES: Record<string, string> = {
  ok: "Agent Manager wykonał polecenie — sprawdź aktywność poniżej.",
  advice_ok: "Agent Manager przygotował radę — zobacz brief powyżej.",
  no_db:
    "Polecenia managera wymagają skonfigurowanego Supabase (service role) — zobacz README.",
  no_key: "Brak ANTHROPIC_API_KEY — nie można uruchomić Agenta Managera.",
  error: "Wystąpił błąd podczas wykonywania polecenia.",
};

const APPROVALS_MESSAGES: Record<string, string> = {
  approved: "Zatwierdzono propozycję.",
  rejected: "Odrzucono propozycję.",
  no_db: "Kolejka zatwierdzeń wymaga skonfigurowanego Supabase.",
  not_found: "Nie znaleziono propozycji.",
};

interface DashboardPageProps {
  searchParams: Promise<{ manager?: string; approvals?: string }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const [agents, approvals, projects, activity, managerActivity] =
    await Promise.all([
      getAgents(),
      getPendingApprovals(),
      getProjects(),
      getRecentActivity(),
      getActivityForAgent("manager", 3),
    ]);

  const banner =
    (params.manager && MANAGER_MESSAGES[params.manager]) ||
    (params.approvals && APPROVALS_MESSAGES[params.approvals]);

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        {banner && (
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">
            {banner}
          </div>
        )}

        <ManagerBrief approvals={approvals} managerActivity={managerActivity} />

        <section>
          <h2 className="mb-3 text-base font-semibold">Agenci</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-semibold">Do zatwierdzenia</h2>
          {approvals.length === 0 ? (
            <p className="text-sm text-muted">Kolejka jest pusta.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {approvals.map((approval) => (
                <ApprovalItem key={approval.id} approval={approval} />
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-base font-semibold">Projekty</h2>
            <div className="flex flex-col gap-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-base font-semibold">
              Aktywność agentów
            </h2>
            <ActivityFeed items={activity} />
          </section>
        </div>
      </main>
    </>
  );
}
