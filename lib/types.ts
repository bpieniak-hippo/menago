// Typy zgodne ze schematem bazy (MENAGO_SPEC.md §4)

export type AgentSlug =
  | "manager"
  | "album"
  | "social"
  | "promo"
  | "wydawniczy"
  | "analityk"
  | "katalog"
  | "trendy";

export type AgentStatus = "w toku" | "czeka na Ciebie" | "w gotowości";

export interface Agent {
  id: string;
  slug: AgentSlug;
  name: string;
  role: string;
  status: AgentStatus;
  current_task: string | null;
  progress: number;
  last_run_at: string | null;
}

export type StreamingPlatform =
  | "spotify"
  | "apple_music"
  | "youtube_music"
  | "tidal"
  | "soundcloud";

export interface Project {
  id: string;
  name: string;
  type: string;
  stage: string;
  progress: number;
  release_date: string | null;
  notes: string | null;
  links: Partial<Record<StreamingPlatform, string>>;
  created_at: string;
}

export interface Track {
  id: string;
  project_id: string;
  position: number;
  title: string;
  beat_name: string | null;
  notes: string | null;
  created_at: string;
}

export type ItemStatus = "zrobione" | "do_zrobienia" | "nie_dotyczy";
export type TrackItemCategory = "wokale" | "muzyka" | "dj" | "inne";

export interface TrackItem {
  id: string;
  track_id: string;
  category: TrackItemCategory;
  label: string;
  assignee: string | null;
  status: ItemStatus;
  note: string | null;
  position: number;
  created_at: string;
}

export interface ProjectItem {
  id: string;
  project_id: string;
  label: string;
  assignee: string | null;
  status: ItemStatus;
  note: string | null;
  position: number;
  created_at: string;
}

export type TaskStatus = "pending" | "in_progress" | "done" | "failed";

export interface Task {
  id: string;
  agent_slug: AgentSlug;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_at: string | null;
  created_by: string;
  created_at: string;
}

export type ApprovalKind = "email" | "post" | "metadata" | "other";
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "failed";

export interface Approval {
  id: string;
  agent_slug: AgentSlug;
  kind: ApprovalKind;
  title: string;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  created_at: string;
  decided_at: string | null;
}

export interface Activity {
  id: string;
  agent_slug: AgentSlug;
  message: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  agent_slug: AgentSlug;
  period_start: string;
  period_end: string;
  content: string;
  created_at: string;
}

export type ContactType =
  | "media"
  | "radio"
  | "youtube"
  | "playlist"
  | "podcast"
  | "portal";

export interface Contact {
  id: string;
  name: string;
  outlet: string | null;
  type: ContactType;
  email: string | null;
  notes: string | null;
  last_contacted_at: string | null;
}

export interface CampaignPhase {
  name: string;
  description?: string;
  status?: string;
}

export interface Campaign {
  id: string;
  project_id: string | null;
  name: string;
  plan: { phases?: CampaignPhase[] } & Record<string, unknown>;
  status: string;
  created_at: string;
}

export type EmailStatus = "draft" | "queued" | "sent" | "failed";

export interface CampaignEmail {
  id: string;
  campaign_id: string | null;
  contact_id: string | null;
  subject: string;
  body: string;
  status: EmailStatus;
  gmail_message_id: string | null;
  sent_at: string | null;
  replied_at: string | null;
  contacts: Pick<Contact, "name" | "outlet" | "type"> | null;
}

export type PostFormat = "post" | "karuzela" | "reel" | "story";
export type PostStatus = "draft" | "queued" | "published" | "failed";

export interface Post {
  id: string;
  project_id: string | null;
  campaign_id: string | null;
  network: string;
  format: PostFormat;
  caption: string | null;
  media_urls: string[];
  scheduled_at: string | null;
  status: PostStatus;
  external_id: string | null;
}

export type TrendScene = "pl_rap" | "us";
export type TrendType =
  | "release"
  | "chart"
  | "collab"
  | "viral"
  | "mention"
  | "other";

export interface Trend {
  id: string;
  scene: TrendScene;
  entity: string;
  type: TrendType;
  title: string;
  source: string | null;
  url: string | null;
  detected_at: string;
  relevance_score: number | null;
  notes: string | null;
}
