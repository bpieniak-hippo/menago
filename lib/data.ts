import { createClient, isSupabaseConfigured } from "./supabase/server";
import {
  mockActivity,
  mockAgents,
  mockApprovals,
  mockProjects,
} from "./mock-data";
import type {
  Activity,
  Agent,
  Approval,
  Campaign,
  CampaignEmail,
  Post,
  Project,
  Track,
  Trend,
  TrendScene,
} from "./types";

/**
 * Warstwa danych dashboardu.
 * Jeśli Supabase nie jest skonfigurowany (brak env) albo zapytanie się nie
 * powiedzie (np. pusta baza przed seedem), zwracamy dane przykładowe,
 * żeby dashboard zawsze dało się przejrzeć.
 */

export async function getProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) return mockProjects;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !data || data.length === 0) return mockProjects;
  return data as Project[];
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured()) {
    return mockProjects.find((p) => p.id === id) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Project;
}

export async function getTracksForProject(projectId: string): Promise<Track[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error || !data) return [];
  return data as Track[];
}

export async function getAgents(): Promise<Agent[]> {
  if (!isSupabaseConfigured()) return mockAgents;
  const supabase = await createClient();
  const { data, error } = await supabase.from("agents").select("*");
  if (error || !data || data.length === 0) return mockAgents;
  return data as Agent[];
}

export async function getPendingApprovals(): Promise<Approval[]> {
  if (!isSupabaseConfigured()) return mockApprovals;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approvals")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error || !data) return mockApprovals;
  return data as Approval[];
}

export async function getRecentActivity(limit = 15): Promise<Activity[]> {
  if (!isSupabaseConfigured()) return mockActivity;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data || data.length === 0) return mockActivity;
  return data as Activity[];
}

/** Treść ostatniego briefu dnia Agenta Managera (tabela `reports`), jeśli istnieje. */
export async function getLatestManagerBrief(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("content, created_at")
    .eq("agent_slug", "manager")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.content as string;
}

/** Najnowsza kampania dla projektu (Agent Promo), jeśli istnieje. */
export async function getCampaignForProject(
  projectId: string,
): Promise<Campaign | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as Campaign;
}

/** Adresaci kampanii (emails + dane kontaktu). */
export async function getCampaignEmails(
  campaignId: string,
): Promise<CampaignEmail[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("emails")
    .select("*, contacts(name, outlet, type)")
    .eq("campaign_id", campaignId);
  if (error || !data) return [];
  return data as unknown as CampaignEmail[];
}

/** Szkice maili kampanii czekające w kolejce zatwierdzeń. */
export async function getPendingEmailApprovalsForCampaign(
  campaignId: string,
): Promise<Approval[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approvals")
    .select("*")
    .eq("kind", "email")
    .eq("status", "pending")
    .eq("payload->>campaign_id", campaignId);
  if (error || !data) return [];
  return data as Approval[];
}

/** Insighty Agenta Trendy, opcjonalnie filtrowane po scenie. */
export async function getTrends(scene?: TrendScene): Promise<Trend[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let query = supabase
    .from("trends")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(50);
  if (scene) query = query.eq("scene", scene);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as Trend[];
}

/** Posty (szkice + zakolejkowane + opublikowane) dla projektu (Agent Social). */
export async function getPostsForProject(projectId: string): Promise<Post[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("project_id", projectId)
    .order("scheduled_at", { ascending: true });
  if (error || !data) return [];
  return data as Post[];
}

/** Szkice postów projektu czekające w kolejce zatwierdzeń. */
export async function getPendingPostApprovalsForProject(
  projectId: string,
): Promise<Approval[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approvals")
    .select("*")
    .eq("kind", "post")
    .eq("status", "pending")
    .eq("payload->>project_id", projectId);
  if (error || !data) return [];
  return data as Approval[];
}
