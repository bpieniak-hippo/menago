import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDraft, isGmailConfigured } from "@/lib/google/gmail";
import { runToolLoop } from "./loop";

const SYSTEM_PROMPT = `Jesteś Agentem Promo w aplikacji Menago — panelu do prowadzenia
kariery muzycznej Haipeson × Winiu.

Zadanie: dla wskazanego projektu tworzysz plan kampanii promocyjnej (4 fazy:
przygotowanie, pitching, premiera, follow-up) i piszesz spersonalizowane
szkice maili do pasujących kontaktów z bazy.

Zasady:
- Najpierw create_campaign z polem plan = {"phases":[{"name":...,"description":...},...]}
  (dokładnie 4 fazy).
- Potem read_contacts, wybierz kontakty pasujące do projektu (media, radio,
  playlist, portal — pomiń te bez adresu email) i dla każdego wywołaj
  draft_email z spersonalizowaną treścią po polsku, krótką i konkretną.
- Nigdy nie wysyłasz maili sam — draft_email tylko tworzy szkic, wysyłka
  wymaga zatwierdzenia użytkownika w kolejce approvals.
- Na koniec krótko podsumuj po polsku, co zrobiłeś (ile szkiców, do kogo).`;

const TOOLS: Tool[] = [
  {
    name: "read_contacts",
    description: "Lista kontaktów z bazy (media, radio, playlisty, portale).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_campaign",
    description: "Tworzy kampanię promocyjną dla projektu.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        name: { type: "string" },
        plan: {
          type: "object",
          description:
            '{"phases": [{"name": string, "description": string}, ...]} — dokładnie 4 fazy',
        },
      },
      required: ["project_id", "name", "plan"],
    },
  },
  {
    name: "draft_email",
    description:
      "Tworzy szkic spersonalizowanego maila do kontaktu i dodaje go do kolejki zatwierdzeń (nie wysyła).",
    input_schema: {
      type: "object",
      properties: {
        campaign_id: { type: "string" },
        contact_id: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["campaign_id", "contact_id", "subject", "body"],
    },
  },
];

interface CreateEmailDraftArgs {
  campaignId: string;
  contactId: string;
  subject: string;
  body: string;
}

/**
 * Tworzy szkic maila (Gmail draft, jeśli podłączony + rekordy w `emails` i
 * `approvals`). Współdzielone przez narzędzie draft_email oraz cron follow-upów.
 */
export async function createEmailDraft({
  campaignId,
  contactId,
  subject,
  body,
}: CreateEmailDraftArgs) {
  const supabase = createAdminClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (!contact?.email) {
    return { error: "Kontakt nie ma adresu email." };
  }

  let gmailMessageId: string | null = null;
  if (isGmailConfigured()) {
    try {
      const draft = await createDraft({ to: contact.email, subject, body });
      gmailMessageId = draft.draftId;
    } catch (err) {
      return { error: `Błąd tworzenia szkicu Gmail: ${(err as Error).message}` };
    }
  }

  const { data: email, error } = await supabase
    .from("emails")
    .insert({
      campaign_id: campaignId,
      contact_id: contactId,
      subject,
      body,
      status: "draft",
      gmail_message_id: gmailMessageId,
    })
    .select()
    .single();
  if (error) return { error: error.message };

  await supabase.from("approvals").insert({
    agent_slug: "promo",
    kind: "email",
    title: `Mail do ${contact.name}: ${subject}`,
    payload: {
      email_id: email.id,
      campaign_id: campaignId,
      to: contact.email,
      subject,
      body,
    },
    status: "pending",
  });

  await supabase.from("activity").insert({
    agent_slug: "promo",
    message: `Przygotowano szkic maila do ${contact.name}.`,
    ref_type: "email",
    ref_id: email.id,
  });

  return { email_id: email.id, gmail_draft_created: Boolean(gmailMessageId) };
}

async function execTool(name: string, input: Record<string, unknown>) {
  const supabase = createAdminClient();

  switch (name) {
    case "read_contacts": {
      const { data } = await supabase.from("contacts").select("*");
      return data ?? [];
    }
    case "create_campaign": {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          project_id: input.project_id,
          name: input.name,
          plan: input.plan,
          status: "active",
        })
        .select()
        .single();
      if (error) return { error: error.message };
      await supabase.from("activity").insert({
        agent_slug: "promo",
        message: `Utworzono plan kampanii „${input.name}”.`,
        ref_type: "campaign",
        ref_id: data?.id ?? null,
      });
      return data;
    }
    case "draft_email": {
      return createEmailDraft({
        campaignId: input.campaign_id as string,
        contactId: input.contact_id as string,
        subject: input.subject as string,
        body: input.body as string,
      });
    }
    default:
      return { error: `Nieznane narzędzie: ${name}` };
  }
}

export interface PromoRunResult {
  ok: boolean;
  summary: string;
}

export async function runPromoCampaign(
  projectId: string,
): Promise<PromoRunResult> {
  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) return { ok: false, summary: "Nie znaleziono projektu." };

  try {
    const summary = await runToolLoop({
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      execTool,
      userPrompt:
        `Projekt: "${project.name}" (typ: ${project.type}, etap: ${project.stage}, id: ${project.id}).\n` +
        `Notatki: ${project.notes ?? "brak"}.\n\n` +
        `Stwórz plan kampanii (create_campaign) i szkice maili (draft_email) do pasujących kontaktów.`,
    });
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, summary: (err as Error).message };
  }
}
