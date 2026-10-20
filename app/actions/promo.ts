"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { runPromoCampaign } from "@/lib/agents/promo";
import { decideApproval } from "@/lib/approvals";

export async function generateCampaign(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) redirect("/promo");

  if (!isAdminConfigured()) {
    redirect(`/promo?project=${projectId}&promo=no_db`);
  }

  let outcome: "ok" | "no_key" | "error" = "ok";
  try {
    const result = await runPromoCampaign(projectId);
    outcome = result.ok ? "ok" : "no_key";
  } catch {
    outcome = "error";
  }

  revalidatePath("/promo");
  redirect(`/promo?project=${projectId}&promo=${outcome}`);
}

export async function approveAllCampaignEmails(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");

  if (!campaignId || !isAdminConfigured()) {
    redirect(`/promo?project=${projectId}`);
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
  redirect(`/promo?project=${projectId}&approvals=approved`);
}
