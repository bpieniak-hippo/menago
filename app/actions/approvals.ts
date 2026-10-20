"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { decideApproval } from "@/lib/approvals";

async function handle(formData: FormData, decision: "approved" | "rejected") {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/");

  if (!isAdminConfigured()) {
    redirect("/?approvals=no_db");
  }

  const result = await decideApproval(id, decision);
  revalidatePath("/");
  revalidatePath("/promo");
  redirect(`/?approvals=${result.ok ? decision : "error"}`);
}

export async function approveApproval(formData: FormData) {
  await handle(formData, "approved");
}

export async function rejectApproval(formData: FormData) {
  await handle(formData, "rejected");
}
