import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";

/**
 * Integracja Gmail. Zgodnie z zasadą „sekrety tylko w env” (MENAGO_SPEC.md §1),
 * refresh token NIE jest trzymany w bazie — uzyskujesz go raz lokalnie
 * (patrz scripts/google-oauth.mjs + README) i wklejasz do env jako
 * GOOGLE_REFRESH_TOKEN.
 */

export function isGmailConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

function getClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth });
}

function buildRawMessage({
  to,
  subject,
  body,
  inReplyTo,
  references,
}: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString(
    "base64",
  )}?=`;
  const lines = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ];
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  if (references) lines.push(`References: ${references}`);
  lines.push("", body);
  const message = lines.join("\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createDraft(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ draftId: string; messageId: string | null }> {
  const gmail = getClient();
  const raw = buildRawMessage(params);
  const { data } = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw } },
  });
  return {
    draftId: data.id!,
    messageId: data.message?.id ?? null,
  };
}

export async function sendDraft(
  draftId: string,
): Promise<{ messageId: string; threadId: string | null }> {
  const gmail = getClient();
  const { data } = await gmail.users.drafts.send({
    userId: "me",
    requestBody: { id: draftId },
  });
  return { messageId: data.id!, threadId: data.threadId ?? null };
}

/**
 * Uproszczona heurystyka: jeśli w wątku jest więcej niż jedna wiadomość,
 * uznajemy to za odpowiedź. Wystarczające na MVP follow-upów (krok 5).
 */
export async function threadHasReply(threadId: string): Promise<boolean> {
  const gmail = getClient();
  const { data } = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
  });
  return (data.messages?.length ?? 0) > 1;
}

function headerValue(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())
    ?.value ?? "";
}

function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return (match ? match[1] : fromHeader).trim().toLowerCase();
}

export interface InboxThread {
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  date: string;
  snippet: string;
  messageCount: number;
  needsReply: boolean;
  unread: boolean;
  lastMessageId: string | null;
}

/**
 * Lista ostatnich wątków ze skrzynki odbiorczej. `needsReply` to heurystyka:
 * ostatnia wiadomość w wątku nie jest wysłana z naszego konta.
 */
export async function listInboxThreads(
  maxResults = 20,
): Promise<InboxThread[]> {
  const gmail = getClient();
  const { data: profile } = await gmail.users.getProfile({ userId: "me" });
  const myEmail = (profile.emailAddress ?? "").toLowerCase();

  const { data: list } = await gmail.users.threads.list({
    userId: "me",
    maxResults,
    q: "in:inbox",
  });

  const threads = list.threads ?? [];

  const results = await Promise.all(
    threads.map(async (t): Promise<InboxThread | null> => {
      if (!t.id) return null;
      const { data: thread } = await gmail.users.threads.get({
        userId: "me",
        id: t.id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date", "Message-ID"],
      });
      const messages = thread.messages ?? [];
      const last = messages[messages.length - 1];
      if (!last) return null;

      const headers = last.payload?.headers;
      const from = headerValue(headers, "From");
      const fromEmail = extractEmailAddress(from);

      return {
        threadId: t.id,
        subject: headerValue(headers, "Subject") || "(bez tematu)",
        from,
        fromEmail,
        date: headerValue(headers, "Date"),
        snippet: thread.snippet ?? "",
        messageCount: messages.length,
        needsReply: fromEmail !== myEmail && fromEmail !== "",
        unread: (last.labelIds ?? []).includes("UNREAD"),
        lastMessageId: headerValue(headers, "Message-ID") || null,
      };
    }),
  );

  return results.filter((r): r is InboxThread => r !== null);
}

function decodePart(part: gmail_v1.Schema$MessagePart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return Buffer.from(part.body.data, "base64").toString("utf-8");
  }
  if (part.parts) {
    for (const sub of part.parts) {
      const text = decodePart(sub);
      if (text) return text;
    }
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    const html = Buffer.from(part.body.data, "base64").toString("utf-8");
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  return "";
}

export interface ThreadDetail {
  threadId: string;
  subject: string;
  fromEmail: string;
  lastMessageId: string | null;
  bodyText: string;
}

/** Pełna treść ostatniej wiadomości w wątku — do przygotowania szkicu odpowiedzi. */
export async function getThreadDetail(
  threadId: string,
): Promise<ThreadDetail | null> {
  const gmail = getClient();
  const { data: thread } = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });
  const messages = thread.messages ?? [];
  const last = messages[messages.length - 1];
  if (!last) return null;

  const headers = last.payload?.headers;
  const from = headerValue(headers, "From");

  return {
    threadId,
    subject: headerValue(headers, "Subject") || "(bez tematu)",
    fromEmail: extractEmailAddress(from),
    lastMessageId: headerValue(headers, "Message-ID") || null,
    bodyText: decodePart(last.payload).slice(0, 4000),
  };
}

/** Tworzy szkic odpowiedzi w tym samym wątku Gmail (poprawne nagłówki In-Reply-To/References). */
export async function createReplyDraft(params: {
  threadId: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
}): Promise<{ draftId: string; messageId: string | null }> {
  const gmail = getClient();
  const raw = buildRawMessage({
    to: params.to,
    subject: params.subject,
    body: params.body,
    inReplyTo: params.inReplyTo ?? undefined,
    references: params.inReplyTo ?? undefined,
  });
  const { data } = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw, threadId: params.threadId } },
  });
  return {
    draftId: data.id!,
    messageId: data.message?.id ?? null,
  };
}
