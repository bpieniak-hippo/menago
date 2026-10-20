import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { runTrendyScan } from "@/lib/agents/trendy";

export const dynamic = "force-dynamic";

/**
 * Cron skanu trendów. Częstotliwość (codziennie vs co tydzień) to jedna
 * z kwestii „do ustalenia z użytkownikiem” (spec §10) — domyślnie codziennie,
 * do zmiany w `vercel.json` jak tylko zapadnie decyzja.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const result = await runTrendyScan();
  return NextResponse.json(result);
}
