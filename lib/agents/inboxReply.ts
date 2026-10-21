import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createReplyDraft,
  getThreadDetail,
  isGmailConfigured,
} from "@/lib/google/gmail";
import { DEFAULT_MODEL } from "./loop";

const SYSTEM_PROMPT = `Jesteś asystentem Funkmaster Winio x Haipeson, piszesz krótki, uprzejmy
szkic odpowiedzi na maila do skrzynki artysty. Odpowiadaj po polsku, rzeczowo,
2-5 zdań. Odnieś się konkretnie do treści wiadomości, na którą odpowiadasz.
Nie wysyłaj maila — tylko napisz treść odpowiedzi (bez tematu, bez podpisu —
podpis "Pozdrawiam, Funkmaster Winio x Haipeson" dopisujemy automatycznie).`;

export interface DraftReplyResult {
  ok: boolean;
  message: string;
}

/**
 * Dla wskazanego wątku Gmail: pobiera treść ostatniej wiadomości, prosi
 * Claude o krótki szkic odpowiedzi, tworzy draft w Gmailu (w tym samym
 * wątku) i dodaje go do kolejki zatwierdzeń — zgodnie z zasadą, że żadna
 * wiadomość nie wychodzi bez akceptacji użytkownika.
 */
export async function draftReplyForThread(
  threadId: string,
): Promise<DraftReplyResult> {
  if (!isGmailConfigured()) {
    return { ok: false, message: "Gmail nie jest podłączony." };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, message: "Brak ANTHROPIC_API_KEY." };
  }

  const detail = await getThreadDetail(threadId);
  if (!detail) {
    return { ok: false, message: "Nie znaleziono wątku." };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content:
          `Od: ${detail.fromEmail}\nTemat: ${detail.subject}\n\nTreść:\n${detail.bodyText || "(brak treści tekstowej)"}`,
      },
    ],
  });
  const draftBody = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!draftBody) {
    return { ok: false, message: "Nie udało się wygenerować szkicu." };
  }

  const fullBody = `${draftBody}\n\nPozdrawiam,\nFunkmaster Winio x Haipeson`;
  const subject = detail.subject.toLowerCase().startsWith("re:")
    ? detail.subject
    : `Re: ${detail.subject}`;

  const draft = await createReplyDraft({
    threadId,
    to: detail.fromEmail,
    subject,
    body: fullBody,
    inReplyTo: detail.lastMessageId,
  });

  const supabase = createAdminClient();
  const { data: email, error } = await supabase
    .from("emails")
    .insert({
      subject,
      body: fullBody,
      status: "draft",
      gmail_message_id: draft.draftId,
      gmail_thread_id: threadId,
    })
    .select()
    .single();
  if (error) return { ok: false, message: error.message };

  await supabase.from("approvals").insert({
    agent_slug: "manager",
    kind: "email",
    title: `Odpowiedź do ${detail.fromEmail}: ${subject}`,
    payload: {
      email_id: email.id,
      to: detail.fromEmail,
      subject,
      body: fullBody,
    },
    status: "pending",
  });

  await supabase.from("activity").insert({
    agent_slug: "manager",
    message: `Przygotowano szkic odpowiedzi do ${detail.fromEmail}.`,
    ref_type: "email",
    ref_id: email.id,
  });

  return { ok: true, message: "Szkic odpowiedzi przygotowany." };
}
