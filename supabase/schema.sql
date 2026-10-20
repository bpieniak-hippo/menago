-- Menago — schemat bazy (Supabase / Postgres)
-- Zgodnie z MENAGO_SPEC.md §4

create extension if not exists "pgcrypto";

-- PROJECTS -------------------------------------------------------------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  stage text not null,
  progress int not null default 0 check (progress between 0 and 100),
  release_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- TRACKS (tracklista projektu) --------------------------------------------
create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  position int not null default 1,
  title text not null,
  beat_by text,              -- kto zrobił bit / producent
  performers text,           -- kto rapuje / śpiewa (w tym goście)
  written_by text,           -- kto napisał tekst
  recorded_by text,          -- kto nagrywał (inżynier / studio)
  additional_musicians text, -- DJ / scratche / inny muzyk
  status text not null default 'pomysł'
    check (status in ('pomysł', 'tekst', 'nagrany', 'zmiksowany', 'zmasterowany', 'gotowy')),
  notes text,
  created_at timestamptz not null default now()
);

-- AGENTS -----------------------------------------------------------------
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text not null,
  status text not null default 'w gotowości'
    check (status in ('w toku', 'czeka na Ciebie', 'w gotowości')),
  current_task text,
  progress int not null default 0 check (progress between 0 and 100),
  last_run_at timestamptz
);

-- TASKS --------------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  agent_slug text not null references agents(slug),
  project_id uuid references projects(id),
  title text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'done', 'failed')),
  due_at timestamptz,
  created_by text not null default 'manager',
  created_at timestamptz not null default now()
);

-- APPROVALS (kolejka zatwierdzeń) ------------------------------------------
create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  agent_slug text not null references agents(slug),
  kind text not null check (kind in ('email', 'post', 'metadata', 'other')),
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'executed', 'failed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- ACTIVITY (feed) ------------------------------------------------------------
create table if not exists activity (
  id uuid primary key default gen_random_uuid(),
  agent_slug text not null references agents(slug),
  message text not null,
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

-- CONTACTS -------------------------------------------------------------------
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  outlet text,
  type text not null check (type in ('media', 'radio', 'youtube', 'playlist', 'podcast', 'portal')),
  email text,
  notes text,
  last_contacted_at timestamptz
);

-- CAMPAIGNS --------------------------------------------------------------------
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  name text not null,
  plan jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

-- EMAILS ----------------------------------------------------------------------
create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id),
  contact_id uuid references contacts(id),
  subject text not null,
  body text not null,
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'sent', 'failed')),
  gmail_message_id text,
  gmail_thread_id text,
  sent_at timestamptz,
  replied_at timestamptz,
  followup_sent boolean not null default false
);

-- POSTS -------------------------------------------------------------------------
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  campaign_id uuid references campaigns(id),
  network text not null,
  format text not null check (format in ('post', 'karuzela', 'reel', 'story')),
  caption text,
  media_urls text[] not null default '{}',
  scheduled_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'published', 'failed')),
  external_id text
);

-- MEDIA -------------------------------------------------------------------------
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  storage_path text not null,
  public_url text,
  kind text not null,
  created_at timestamptz not null default now()
);

-- REPORTS -----------------------------------------------------------------------
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  agent_slug text not null references agents(slug),
  period_start date not null,
  period_end date not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- TRENDS (Agent Trendy) -----------------------------------------------------------
create table if not exists trends (
  id uuid primary key default gen_random_uuid(),
  scene text not null check (scene in ('pl_rap', 'us')),
  entity text not null,
  type text not null check (type in ('release', 'chart', 'collab', 'viral', 'other')),
  title text not null,
  source text,
  url text,
  detected_at timestamptz not null default now(),
  relevance_score int check (relevance_score between 0 and 100),
  notes text
);

-- RLS --------------------------------------------------------------------------
-- Na start: jeden użytkownik (Bartek), opcjonalnie drugi (Winiu).
-- Włączamy RLS na wszystkich tabelach; dostęp tylko dla zalogowanych (authenticated).
alter table projects enable row level security;
alter table tracks enable row level security;
alter table agents enable row level security;
alter table tasks enable row level security;
alter table approvals enable row level security;
alter table activity enable row level security;
alter table contacts enable row level security;
alter table campaigns enable row level security;
alter table emails enable row level security;
alter table posts enable row level security;
alter table media enable row level security;
alter table reports enable row level security;
alter table trends enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'projects', 'tracks', 'agents', 'tasks', 'approvals', 'activity', 'contacts',
    'campaigns', 'emails', 'posts', 'media', 'reports', 'trends'
  ])
  loop
    execute format(
      'create policy "authenticated_all_%1$s" on %1$s for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
