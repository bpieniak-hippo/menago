"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { runTrendyScan } from "@/lib/agents/trendy";

export async function triggerTrendyScan() {
  if (!isAdminConfigured()) redirect("/trendy?trendy=no_db");

  let outcome: "ok" | "no_key" | "error" = "ok";
  try {
    const result = await runTrendyScan();
    outcome = result.ok ? "ok" : "no_key";
  } catch {
    outcome = "error";
  }

  revalidatePath("/trendy");
  redirect(`/trendy?trendy=${outcome}`);
}

export async function proposePostFromTrend(formData: FormData) {
  const trendId = String(formData.get("trend_id") ?? "");
  if (!trendId || !isAdminConfigured()) redirect("/trendy");

  const supabase = createAdminClient();
  const { data: trend } = await supabase
    .from("trends")
    .select("*")
    .eq("id", trendId)
    .single();

  if (trend) {
    await supabase.from("tasks").insert({
      agent_slug: "social",
      title: `Zaproponuj post na podstawie trendu: ${trend.title}`,
      description: trend.notes,
      created_by: "trendy",
    });
    await supabase.from("activity").insert({
      agent_slug: "trendy",
      message: `Przekazano Agentowi Social sugestię posta na podstawie: ${trend.title}`,
      ref_type: "trend",
      ref_id: trend.id,
    });
  }

  revalidatePath("/trendy");
  redirect("/trendy?trendy=task_sent");
}
