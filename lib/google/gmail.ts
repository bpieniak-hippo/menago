import { google } from "googleapis";

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
}: {
  to: string;
  subject: string;
  body: string;
}) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString(
    "base64",
  )}?=`;
  const message = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\n");

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
