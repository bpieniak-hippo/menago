// Dane przykładowe — używane, dopóki Supabase nie jest skonfigurowany
// (brak zmiennych NEXT_PUBLIC_SUPABASE_URL / ANON_KEY) lub baza jest pusta.

import type { Activity, Agent, Approval, Project } from "./types";

export const mockProjects: Project[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Haipeson × Funkmaster Winio feat. Masta Ace",
    type: "singiel",
    stage: "mix/master",
    progress: 60,
    release_date: "2026-12-05",
    notes: "Czekamy na finalny mix od Winia, potem master i okładka.",
    created_at: new Date().toISOString(),
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Kultura popularna – 10 lat",
    type: "reedycja/kampania",
    stage: "promocja",
    progress: 30,
    release_date: null,
    notes:
      "Rocznica premiery: 17.10.2016. Plan: akcja rocznicowa w social media + pitch do mediów.",
    created_at: new Date().toISOString(),
  },
];

export const mockAgents: Agent[] = [
  {
    id: "a-manager",
    slug: "manager",
    name: "Agent Manager",
    role: "Koordynacja sztabu",
    status: "w gotowości",
    current_task: "Czeka na polecenie",
    progress: 0,
    last_run_at: new Date().toISOString(),
  },
  {
    id: "a-album",
    slug: "album",
    name: "Agent Album",
    role: "Prowadzenie produkcji utworów",
    status: "w toku",
    current_task: "Pilnuje etapu mix/master dla singla z Winiem",
    progress: 60,
    last_run_at: new Date().toISOString(),
  },
  {
    id: "a-social",
    slug: "social",
    name: "Agent Social",
    role: "Plan contentu i publikacje",
    status: "czeka na Ciebie",
    current_task: "Plan contentu na 2 tygodnie — czeka na akceptację 3 postów",
    progress: 40,
    last_run_at: new Date().toISOString(),
  },
  {
    id: "a-promo",
    slug: "promo",
    name: "Agent Promo",
    role: "Kampanie promocyjne i outreach",
    status: "czeka na Ciebie",
    current_task: 'Szkice maili do kampanii „Kultura popularna – 10 lat”',
    progress: 25,
    last_run_at: new Date().toISOString(),
  },
  {
    id: "a-wydawniczy",
    slug: "wydawniczy",
    name: "Agent Wydawniczy",
    role: "Metadane i dystrybucja",
    status: "w gotowości",
    current_task: "Brak aktywnych zadań",
    progress: 0,
    last_run_at: new Date().toISOString(),
  },
  {
    id: "a-analityk",
    slug: "analityk",
    name: "Agent Analityk",
    role: "Raporty tygodniowe",
    status: "w gotowości",
    current_task: "Następny raport: poniedziałek 9:00",
    progress: 0,
    last_run_at: new Date().toISOString(),
  },
  {
    id: "a-katalog",
    slug: "katalog",
    name: "Agent Katalog",
    role: "Katalog i rocznice",
    status: "w toku",
    current_task: "Przygotowuje propozycję akcji na 10-lecie „Kultury popularnej”",
    progress: 50,
    last_run_at: new Date().toISOString(),
  },
  {
    id: "a-trendy",
    slug: "trendy",
    name: "Agent Trendy",
    role: "Monitoring sceny PL rap / piki US",
    status: "w toku",
    current_task: "Skanuje nowe wydania na polskiej scenie rapowej",
    progress: 70,
    last_run_at: new Date().toISOString(),
  },
];

export const mockApprovals: Approval[] = [
  {
    id: "ap-1",
    agent_slug: "social",
    kind: "post",
    title: "Teaser singla — reel ze studia",
    payload: {
      network: "instagram",
      format: "reel",
      caption:
        "Nowy kawałek w drodze 🔥 Haipeson × Funkmaster Winio feat. Masta Ace",
    },
    status: "pending",
    created_at: new Date().toISOString(),
    decided_at: null,
  },
  {
    id: "ap-2",
    agent_slug: "social",
    kind: "post",
    title: "Karuzela: proces nagrywania",
    payload: {
      network: "instagram",
      format: "karuzela",
      caption: "Zakulisowe kadry z sesji nagraniowej.",
    },
    status: "pending",
    created_at: new Date().toISOString(),
    decided_at: null,
  },
  {
    id: "ap-3",
    agent_slug: "promo",
    kind: "email",
    title: "Pitch do Noizz.pl ws. 10-lecia „Kultury popularnej”",
    payload: {
      to: "redakcja@noizz.pl",
      subject: "10 lat Kultury popularnej — materiał rocznicowy?",
    },
    status: "pending",
    created_at: new Date().toISOString(),
    decided_at: null,
  },
];

export const mockActivity: Activity[] = [
  {
    id: "act-1",
    agent_slug: "album",
    message:
      'Zaktualizowano etap projektu „Haipeson × Funkmaster Winio feat. Masta Ace” na mix/master.',
    ref_type: "project",
    ref_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: "act-2",
    agent_slug: "social",
    message: "Przygotowano 2 propozycje postów do zatwierdzenia.",
    ref_type: "approval",
    ref_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
  },
  {
    id: "act-3",
    agent_slug: "promo",
    message: "Utworzono szkic maila do Noizz.pl.",
    ref_type: "email",
    ref_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "act-4",
    agent_slug: "katalog",
    message:
      "Rozpoczęto pracę nad planem akcji rocznicowej 10 lat Kultury popularnej.",
    ref_type: "project",
    ref_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: "act-5",
    agent_slug: "trendy",
    message:
      "Wykryto nowy viral na polskiej scenie rapowej — potencjalna inspiracja na post.",
    ref_type: "trend",
    ref_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
];
