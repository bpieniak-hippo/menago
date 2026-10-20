-- Menago — dane startowe (seed)

insert into projects (id, name, type, stage, progress, release_date, notes) values
  ('11111111-1111-1111-1111-111111111111', 'Haipeson × Funkmaster Winio feat. Masta Ace', 'singiel', 'mix/master', 60, '2026-12-05',
   'Czekamy na finalny mix od Winia, potem master i okładka.'),
  ('22222222-2222-2222-2222-222222222222', 'Kultura popularna – 10 lat', 'reedycja/kampania', 'promocja', 30, null,
   'Rocznica premiery: 17.10.2016. Plan: akcja rocznicowa w social media + pitch do mediów.')
on conflict (id) do nothing;

insert into agents (slug, name, role, status, current_task, progress, last_run_at) values
  ('manager', 'Agent Manager', 'Koordynacja sztabu', 'w gotowości', 'Czeka na polecenie', 0, now()),
  ('album', 'Agent Album', 'Prowadzenie produkcji utworów', 'w toku', 'Pilnuje etapu mix/master dla singla z Winiem', 60, now()),
  ('social', 'Agent Social', 'Plan contentu i publikacje', 'czeka na Ciebie', 'Plan contentu na 2 tygodnie — czeka na akceptację 3 postów', 40, now()),
  ('promo', 'Agent Promo', 'Kampanie promocyjne i outreach', 'czeka na Ciebie', 'Szkice maili do kampanii „Kultura popularna – 10 lat”', 25, now()),
  ('wydawniczy', 'Agent Wydawniczy', 'Metadane i dystrybucja', 'w gotowości', 'Brak aktywnych zadań', 0, now()),
  ('analityk', 'Agent Analityk', 'Raporty tygodniowe', 'w gotowości', 'Następny raport: poniedziałek 9:00', 0, now()),
  ('katalog', 'Agent Katalog', 'Katalog i rocznice', 'w toku', 'Przygotowuje propozycję akcji na 10-lecie „Kultury popularnej”', 50, now()),
  ('trendy', 'Agent Trendy', 'Monitoring sceny PL rap / piki US', 'w toku', 'Skanuje nowe wydania na polskiej scenie rapowej', 70, now())
on conflict (slug) do nothing;

insert into tasks (agent_slug, project_id, title, description, status, due_at) values
  ('album', '11111111-1111-1111-1111-111111111111', 'Odebrać finalny mix od Winia', 'Czeka na plik mixu do akceptacji.', 'in_progress', now() + interval '3 days'),
  ('social', '11111111-1111-1111-1111-111111111111', 'Zaplanować 3 posty zapowiadające singiel', 'Teasery przed premierą singla.', 'in_progress', now() + interval '5 days'),
  ('promo', '22222222-2222-2222-2222-222222222222', 'Dobrać adresatów do kampanii rocznicowej', 'Media hip-hopowe + playlisty.', 'in_progress', now() + interval '2 days'),
  ('katalog', '22222222-2222-2222-2222-222222222222', 'Przygotować plan akcji na 10-lecie', 'Posty, reedycja, możliwy sync.', 'in_progress', now() + interval '7 days')
on conflict do nothing;

insert into approvals (agent_slug, kind, title, payload, status) values
  ('social', 'post', 'Teaser singla — reel ze studia', '{"network":"instagram","format":"reel","caption":"Nowy kawałek w drodze 🔥 Haipeson × Funkmaster Winio feat. Masta Ace","media_urls":[]}'::jsonb, 'pending'),
  ('social', 'post', 'Karuzela: proces nagrywania', '{"network":"instagram","format":"karuzela","caption":"Zakulisowe kadry z sesji nagraniowej.","media_urls":[]}'::jsonb, 'pending'),
  ('promo', 'email', 'Pitch do Noizz.pl ws. 10-lecia „Kultury popularnej”', '{"to":"redakcja@noizz.pl","subject":"10 lat Kultury popularnej — materiał rocznicowy?","body":"Cześć, 17.10.2016 ukazała się Kultura popularna. W tym roku mija 10 lat..."}'::jsonb, 'pending')
on conflict do nothing;

insert into activity (agent_slug, message, ref_type) values
  ('album', 'Zaktualizowano etap projektu „Haipeson × Funkmaster Winio feat. Masta Ace” na mix/master.', 'project'),
  ('social', 'Przygotowano 2 propozycje postów do zatwierdzenia.', 'approval'),
  ('promo', 'Utworzono szkic maila do Noizz.pl.', 'email'),
  ('katalog', 'Rozpoczęto pracę nad planem akcji rocznicowej 10 lat Kultury popularnej.', 'project'),
  ('trendy', 'Wykryto nowy viral na polskiej scenie rapowej — potencjalna inspiracja na post.', 'trend')
on conflict do nothing;

insert into contacts (name, outlet, type, email, notes) values
  ('Redakcja Noizz.pl', 'Noizz.pl', 'portal', 'redakcja@noizz.pl', 'Piszą o polskim rapie, kontakt ogólny.'),
  ('Radio 357', 'Radio 357', 'radio', 'muzyka@radio357.pl', null),
  ('Impreza Festival Playlist', 'Spotify', 'playlist', null, 'Kurator playlisty polski rap/trap.')
on conflict do nothing;

insert into trends (scene, entity, type, title, source, relevance_score, notes) values
  ('pl_rap', 'przykładowy artysta PL', 'release', 'Nowy singiel wszedł na Viral 50 Poland', 'spotify', 70, 'Do doprecyzowania: lista śledzonych artystów.'),
  ('us', 'przykładowy artysta US', 'chart', 'Utwór w top 10 Billboard Hot 100', 'billboard', 40, 'Tylko podgląd pików sceny amerykańskiej.')
on conflict do nothing;
