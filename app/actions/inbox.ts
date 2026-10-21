"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { draftReplyForThread } from "@/lib/agents/inboxReply";

export async function requestReplyDraft(formData: FormData) {
  const threadId = String(formData.get("thread_id") ?? "");
  if (!threadId) redirect("/inbox");

  if (!isAdminConfigured()) {
    redirect("/inbox?inbox=no_db");
  }

  let outcome: "draft_ok" | "no_gmail" | "no_key" | "error";
  try {
    const result = await draftReplyForThread(threadId);
    outcome = result.ok
      ? "draft_ok"
      : result.message.includes("Gmail")
        ? "no_gmail"
        : result.message.includes("ANTHROPIC")
          ? "no_key"
          : "error";
  } catch {
    outcome = "error";
  }

  revalidatePath("/inbox");
  revalidatePath("/");
  redirect(`/inbox?inbox=${outcome}`);
}
