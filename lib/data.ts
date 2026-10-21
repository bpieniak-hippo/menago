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
  AgentSlug,
  Approval,
  Campaign,
  CampaignEmail,
  Post,
  Project,
  ProjectItem,
  Report,
  Task,
  Track,
  TrackItem,
  Trend,
  TrendScene,
  TrendType,
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
  return (data as Project[]).map((p) => ({ ...p, links: p.links ?? {} }));
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
  return { ...(data as Project), links: (data as Project).links ?? {} };
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

/** Checklista (wokale/muzyka/DJ/inne) dla podanych utworów. */
export async function getTrackItemsForTracks(
  trackIds: string[],
): Promise<TrackItem[]> {
  if (!isSupabaseConfigured() || trackIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("track_items")
    .select("*")
    .in("track_id", trackIds)
    .order("position", { ascending: true });
  if (error || !data) return [];
  return data as TrackItem[];
}

/** Dodatkowa checklista projektu (okładka, mastering, dystrybucja itp.). */
export async function getProjectItems(projectId: string): Promise<ProjectItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_items")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error || !data) return [];
  return data as ProjectItem[];
}

/** Wszystkie utwory wszystkich projektów (do listy projektów z podglądem tracklisty). */
export async function getAllTracks(): Promise<Track[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .order("position", { ascending: true });
  if (error || !data) return [];
  return data as Track[];
}

/** Wszystkie elementy checklisty projektów (do listy projektów z podglądem akcji). */
export async function getAllProjectItems(): Promise<ProjectItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_items")
    .select("*")
    .order("position", { ascending: true });
  if (error || !data) return [];
  return data as ProjectItem[];
}

export async function getAgents(): Promise<Agent[]> {
  if (!isSupabaseConfigured()) return mockAgents;
  const supabase = await createClient();
  const { data, error } = await supabase.from("agents").select("*");
  if (error || !data || data.length === 0) return mockAgents;
  return data as Agent[];
}

/** Jeden agent po slug (do strony szczegółów agenta). */
export async function getAgentBySlug(slug: AgentSlug): Promise<Agent | null> {
  const agents = await getAgents();
  return agents.find((a) => a.slug === slug) ?? null;
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

/** Aktywność konkretnego agenta (do strony szczegółów agenta). */
export async function getActivityForAgent(
  slug: AgentSlug,
  limit = 30,
): Promise<Activity[]> {
  if (!isSupabaseConfigured()) {
    return mockActivity.filter((a) => a.agent_slug === slug);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity")
    .select("*")
    .eq("agent_slug", slug)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as Activity[];
}

/** Pojedynczy wpis aktywności (do strony szczegółów). */
export async function getActivityById(id: string): Promise<Activity | null> {
  if (!isSupabaseConfigured()) {
    return mockActivity.find((a) => a.id === id) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Activity;
}

/** Pojedyncze zadanie (do strony szczegółów aktywności / archiwum). */
export async function getTaskById(id: string): Promise<Task | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Task;
}

/** Wszystkie zadania (Managera i innych agentów) — archiwum. */
export async function getAllTasks(limit = 200): Promise<Task[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as Task[];
}

/** Raporty napisane przez konkretnego agenta (tabela `reports`). */
export async function getReportsForAgent(
  slug: AgentSlug,
  limit = 10,
): Promise<Report[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("agent_slug", slug)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as Report[];
}

/** Propozycje (do zatwierdzenia/zdecydowane) utworzone przez konkretnego agenta. */
export async function getApprovalsForAgent(
  slug: AgentSlug,
  limit = 20,
): Promise<Approval[]> {
  if (!isSupabaseConfigured()) {
    return mockApprovals.filter((a) => a.agent_slug === slug);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approvals")
    .select("*")
    .eq("agent_slug", slug)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as Approval[];
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

/** Insighty Agenta Trendy, opcjonalnie filtrowane po scenie i/lub typie. */
export async function getTrends(
  scene?: TrendScene,
  type?: TrendType,
): Promise<Trend[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let query = supabase
    .from("trends")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(50);
  if (scene) query = query.eq("scene", scene);
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as Trend[];
}

/**
 * Newsy o zespole: type="mention" ORAZ wszystko, czego `entity` wskazuje na
 * sam zespół (np. gdy agent omyłkowo zapisał wzmiankę z innym typem) —
 * odporne na niedokładne etykietowanie przez agenta.
 */
export async function getTeamMentions(): Promise<Trend[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trends")
    .select("*")
    .or(
      "type.eq.mention,entity.ilike.%funkmaster winio%,entity.ilike.%haipeson%",
    )
    .order("detected_at", { ascending: false })
    .limit(50);
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
