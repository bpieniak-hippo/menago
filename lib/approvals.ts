import { createAdminClient } from "@/lib/supabase/admin";
import { isGmailConfigured, sendDraft } from "@/lib/google/gmail";

async function logActivity(
  agentSlug: string,
  message: string,
  refType?: string,
  refId?: string,
) {
  const supabase = createAdminClient();
  await supabase
    .from("activity")
    .insert({ agent_slug: agentSlug, message, ref_type: refType, ref_id: refId });
}

export interface DecisionResult {
  ok: boolean;
  message: string;
}

/**
 * Centralna logika decyzji w kolejce zatwierdzeń (§5 spec).
 * Używana zarówno przez pojedyncze Zatwierdź/Odrzuć, jak i masowe
 * zatwierdzanie kampanii promo.
 */
export async function decideApproval(
  id: string,
  decision: "approved" | "rejected",
): Promise<DecisionResult> {
  const supabase = createAdminClient();
  const { data: approval } = await supabase
    .from("approvals")
    .select("*")
    .eq("id", id)
    .single();

  if (!approval) return { ok: false, message: "Nie znaleziono propozycji." };

  const now = new Date().toISOString();

  if (decision === "rejected") {
    await supabase
      .from("approvals")
      .update({ status: "rejected", decided_at: now })
      .eq("id", id);
    await logActivity(
      approval.agent_slug,
      `Odrzucono: „${approval.title}”.`,
      "approval",
      id,
    );
    return { ok: true, message: "Odrzucono." };
  }

  if (approval.kind === "email") {
    return executeEmailApproval(approval);
  }

  if (approval.kind === "post") {
    return executePostApproval(approval);
  }

  // metadata / other — integracje wpinamy w kolejnych krokach.
  await supabase
    .from("approvals")
    .update({ status: "approved", decided_at: now })
    .eq("id", id);
  await logActivity(
    approval.agent_slug,
    `Zatwierdzono: „${approval.title}”. Realizacja nastąpi po podłączeniu integracji (krok 6).`,
    "approval",
    id,
  );
  return { ok: true, message: "Zatwierdzono." };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeEmailApproval(approval: any): Promise<DecisionResult> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const emailId = approval.payload?.email_id as string | undefined;

  if (!emailId) {
    await supabase
      .from("approvals")
      .update({ status: "failed", decided_at: now })
      .eq("id", approval.id);
    return { ok: false, message: "Brak powiązanego maila." };
  }

  const { data: email } = await supabase
    .from("emails")
    .select("*")
    .eq("id", emailId)
    .single();

  if (!email) {
    await supabase
      .from("approvals")
      .update({ status: "failed", decided_at: now })
      .eq("id", approval.id);
    return { ok: false, message: "Nie znaleziono maila do wysyłki." };
  }

  if (!isGmailConfigured() || !email.gmail_message_id) {
    await supabase
      .from("approvals")
      .update({ status: "approved", decided_at: now })
      .eq("id", approval.id);
    await logActivity(
      "promo",
      `Zatwierdzono mail „${approval.title}”, ale Gmail nie jest podłączony (brak GOOGLE_REFRESH_TOKEN) — wyślij ręcznie.`,
      "email",
      emailId,
    );
    return {
      ok: true,
      message: "Zatwierdzono (Gmail niepodłączony — brak automatycznej wysyłki).",
    };
  }

  try {
    const sent = await sendDraft(email.gmail_message_id);
    await supabase
      .from("emails")
      .update({
        status: "sent",
        gmail_message_id: sent.messageId,
        gmail_thread_id: sent.threadId,
        sent_at: now,
      })
      .eq("id", emailId);
    await supabase
      .from("approvals")
      .update({ status: "executed", decided_at: now })
      .eq("id", approval.id);
    await logActivity(
      "promo",
      `Wysłano mail: „${approval.title}”.`,
      "email",
      emailId,
    );
    return { ok: true, message: "Wysłano." };
  } catch (err) {
    await supabase.from("emails").update({ status: "failed" }).eq("id", emailId);
    await supabase
      .from("approvals")
      .update({ status: "failed", decided_at: now })
      .eq("id", approval.id);
    await logActivity(
      "promo",
      `Błąd wysyłki maila „${approval.title}”: ${(err as Error).message}`,
      "email",
      emailId,
    );
    return { ok: false, message: "Błąd wysyłki." };
  }
}

/**
 * Zatwierdzenie posta nie publikuje go od razu — tylko oznacza jako
 * zakolejkowany (`queued`). Realną publikację wykonuje
 * `/api/cron/social-publish`, gdy minie `scheduled_at` (spec §6: Graph API
 * publikuje „teraz”, nie ma natywnego planowania).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executePostApproval(approval: any): Promise<DecisionResult> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const postId = approval.payload?.post_id as string | undefined;

  if (!postId) {
    await supabase
      .from("approvals")
      .update({ status: "failed", decided_at: now })
      .eq("id", approval.id);
    return { ok: false, message: "Brak powiązanego posta." };
  }

  await supabase.from("posts").update({ status: "queued" }).eq("id", postId);
  await supabase
    .from("approvals")
    .update({ status: "approved", decided_at: now })
    .eq("id", approval.id);
  await logActivity(
    "social",
    `Zaplanowano publikację: „${approval.title}”.`,
    "post",
    postId,
  );
  return { ok: true, message: "Zaplanowano publikację." };
}
