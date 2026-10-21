import Link from "next/link";
import Header from "@/components/Header";
import ProjectCampaignPanel from "@/components/ProjectCampaignPanel";
import {
  getCampaignEmails,
  getCampaignForProject,
  getPendingEmailApprovalsForCampaign,
  getProjects,
} from "@/lib/data";

const PROMO_MESSAGES: Record<string, string> = {
  ok: "Wygenerowano plan kampanii i szkice maili.",
  no_key: "Brak ANTHROPIC_API_KEY — nie można uruchomić Agenta Promo.",
  no_db: "Agent Promo wymaga skonfigurowanego Supabase (service role).",
  error: "Wystąpił błąd podczas generowania kampanii.",
};

interface PromoPageProps {
  searchParams: Promise<{
    project?: string;
    promo?: string;
    approvals?: string;
  }>;
}

export default async function PromoPage({ searchParams }: PromoPageProps) {
  const params = await searchParams;
  const projects = await getProjects();
  const selectedId = params.project ?? projects[0]?.id;
  const selected = projects.find((p) => p.id === selectedId);

  const campaign = selected ? await getCampaignForProject(selected.id) : null;
  const emails = campaign ? await getCampaignEmails(campaign.id) : [];
  const drafts = campaign
    ? await getPendingEmailApprovalsForCampaign(campaign.id)
    : [];

  const banner =
    (params.promo && PROMO_MESSAGES[params.promo]) ||
    (params.approvals === "approved"
      ? "Zatwierdzono i wysłano szkice."
      : null);

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
              href={`/promo?project=${p.id}`}
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
          <ProjectCampaignPanel
            project={selected}
            campaign={campaign}
            emails={emails}
            drafts={drafts}
            returnTo={`/promo?project=${selected.id}`}
          />
        )}
      </main>
    </>
  );
}
