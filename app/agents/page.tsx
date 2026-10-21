import Header from "@/components/Header";
import AgentCard from "@/components/AgentCard";
import { getAgents } from "@/lib/data";

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Agenci</h2>
          <p className="mt-1 text-sm text-muted">
            Kliknij agenta, żeby zobaczyć wyniki jego pracy — aktywność,
            raporty i propozycje.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </main>
    </>
  );
}
