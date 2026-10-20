import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Klient serwisowy (service role) — używany wyłącznie po stronie serwera
 * przez agentów i cron joby. Omija RLS, więc NIGDY nie importuj go w kodzie
 * wysyłanym do przeglądarki.
 */
export function isAdminConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
