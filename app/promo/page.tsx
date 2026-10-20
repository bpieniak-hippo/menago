import Link from "next/link";
import Header from "@/components/Header";
import EmailDraftItem from "@/components/EmailDraftItem";
import {
  getCampaignEmails,
  getCampaignForProject,
  getPendingEmailApprovalsForCampaign,
  getProjects,
} from "@/lib/data";
import { approveAllCampaignEmails, generateCampaign } from "@/app/actions/promo";

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
        ) : !campaign ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">
              Brak kampanii dla „{selected.name}”
            </h2>
            <p className="mt-2 text-sm text-muted">
              Agent Promo wygeneruje plan kampanii (4 fazy) i szkice maili do
              pasujących kontaktów z bazy.
            </p>
            <form action={generateCampaign} className="mt-4">
              <input type="hidden" name="project_id" value={selected.id} />
              <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
                Wygeneruj plan kampanii
              </button>
            </form>
          </section>
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-base font-semibold">
                Plan kampanii — {campaign.name}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(campaign.plan.phases ?? []).map((phase, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                      Faza {i + 1}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold">
                      {phase.name}
                    </h3>
                    {phase.description && (
                      <p className="mt-2 text-sm text-foreground/80">
                        {phase.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">Adresaci</h2>
              {emails.length === 0 ? (
                <p className="text-sm text-muted">Brak jeszcze szkiców.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="font-mono text-[11px] uppercase text-muted">
                      <th className="pb-2">Kontakt</th>
                      <th className="pb-2">Typ</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map((e) => (
                      <tr key={e.id} className="border-t border-border">
                        <td className="py-2">{e.contacts?.name ?? "—"}</td>
                        <td className="py-2 text-muted">
                          {e.contacts?.type ?? "—"}
                        </td>
                        <td className="py-2 font-mono text-xs text-muted">
                          {e.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Szkice maili</h2>
                {drafts.length > 0 && (
                  <form action={approveAllCampaignEmails}>
                    <input type="hidden" name="campaign_id" value={campaign.id} />
                    <input type="hidden" name="project_id" value={selected.id} />
                    <button className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-background transition hover:opacity-90">
                      Zatwierdź i wyślij wszystkie
                    </button>
                  </form>
                )}
              </div>
              {drafts.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  Brak szkiców do zatwierdzenia.
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {drafts.map((d) => (
                    <EmailDraftItem key={d.id} approval={d} />
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
