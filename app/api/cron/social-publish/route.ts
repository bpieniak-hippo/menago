import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isInstagramConfigured, publishPost } from "@/lib/instagram";

export const dynamic = "force-dynamic";

/**
 * Cron (co 5 min — spec §6): Graph API publikuje „teraz”, więc posty
 * zatwierdzone przez użytkownika (status `queued`) czekają w bazie na swój
 * `scheduled_at`, a ten cron publikuje te, którym minął termin.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAdminConfigured() || !isInstagramConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "queued")
    .lte("scheduled_at", now);

  let published = 0;
  let failed = 0;

  for (const post of posts ?? []) {
    try {
      const result = await publishPost({
        format: post.format,
        caption: post.caption ?? undefined,
        mediaUrls: post.media_urls ?? [],
      });
      await supabase
        .from("posts")
        .update({ status: "published", external_id: result.externalId })
        .eq("id", post.id);
      await supabase.from("activity").insert({
        agent_slug: "social",
        message: `Opublikowano post (${post.format}) na Instagramie.`,
        ref_type: "post",
        ref_id: post.id,
      });
      published += 1;
    } catch (err) {
      await supabase.from("posts").update({ status: "failed" }).eq("id", post.id);
      await supabase.from("activity").insert({
        agent_slug: "social",
        message: `Błąd publikacji posta (${post.format}): ${(err as Error).message}`,
        ref_type: "post",
        ref_id: post.id,
      });
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, published, failed });
}
