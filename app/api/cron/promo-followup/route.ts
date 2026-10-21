import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isGmailConfigured, threadHasReply } from "@/lib/google/gmail";
import { createEmailDraft } from "@/lib/agents/promo";

export const dynamic = "force-dynamic";

/**
 * Cron (co 7 dni z góry, ale sprawdza per-mail): dla wysłanych maili bez
 * odpowiedzi po 7 dniach tworzy szkic follow-upu (przez kolejkę zatwierdzeń).
 * Spec §3.4: „Po wysyłce: follow-up po 7 dniach do osób bez odpowiedzi”.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAdminConfigured() || !isGmailConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const supabase = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: emails } = await supabase
    .from("emails")
    .select("*, contacts(name, email)")
    .eq("status", "sent")
    .is("replied_at", null)
    .eq("followup_sent", false)
    .lte("sent_at", sevenDaysAgo);

  let followupsCreated = 0;
  let repliesDetected = 0;

  for (const email of emails ?? []) {
    if (email.gmail_thread_id) {
      try {
        const replied = await threadHasReply(email.gmail_thread_id);
        if (replied) {
          await supabase
            .from("emails")
            .update({ replied_at: new Date().toISOString() })
            .eq("id", email.id);
          repliesDetected += 1;
          continue;
        }
      } catch {
        // błąd sprawdzania wątku — pomijamy ten mail w tym przebiegu
        continue;
      }
    }

    const contact = email.contacts;
    if (!contact?.email) continue;

    const result = await createEmailDraft({
      campaignId: email.campaign_id,
      contactId: email.contact_id,
      subject: `Nawiązanie: ${email.subject}`,
      body:
        `Cześć ${contact.name},\n\nChciałem/am nawiązać do poprzedniej wiadomości ` +
        `sprzed tygodnia — czy miał/a Pan/Pani okazję się z nią zapoznać?\n\n` +
        `Pozdrawiam,\nFunkmaster Winio x Haipeson`,
    });

    await supabase
      .from("emails")
      .update({ followup_sent: true })
      .eq("id", email.id);

    if (!("error" in result)) followupsCreated += 1;
  }

  return NextResponse.json({ ok: true, followupsCreated, repliesDetected });
}
