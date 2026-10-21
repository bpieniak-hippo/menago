"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { runPromoCampaign } from "@/lib/agents/promo";
import { decideApproval } from "@/lib/approvals";

export async function generateCampaign(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const returnTo =
    String(formData.get("return_to") ?? "") || `/promo?project=${projectId}`;
  if (!projectId) redirect("/promo");

  if (!isAdminConfigured()) {
    redirect(`${returnTo}&promo=no_db`);
  }

  let outcome: "ok" | "no_key" | "error" = "ok";
  try {
    const result = await runPromoCampaign(projectId);
    outcome = result.ok ? "ok" : "no_key";
  } catch {
    outcome = "error";
  }

  revalidatePath("/promo");
  revalidatePath(returnTo.split("?")[0]);
  redirect(`${returnTo}&promo=${outcome}`);
}

export async function approveAllCampaignEmails(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const returnTo =
    String(formData.get("return_to") ?? "") || `/promo?project=${projectId}`;

  if (!campaignId || !isAdminConfigured()) {
    redirect(returnTo);
  }

  const supabase = createAdminClient();
  const { data: approvals } = await supabase
    .from("approvals")
    .select("id")
    .eq("kind", "email")
    .eq("status", "pending")
    .eq("payload->>campaign_id", campaignId);

  for (const approval of approvals ?? []) {
    await decideApproval(approval.id, "approved");
  }

  revalidatePath("/promo");
  revalidatePath("/");
  revalidatePath(returnTo.split("?")[0]);
  redirect(`${returnTo}&approvals=approved`);
}
