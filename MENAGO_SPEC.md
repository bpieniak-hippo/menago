# Menago — panel agentów do prowadzenia kariery muzycznej

> Specyfikacja dla Claude Code. Projekt: **Haipeson × Winiu**.
> Cel: dashboard webowy, w którym **Agent Manager** koordynuje mniejsze agenty (Album, Social, Promo, Wydawniczy, Analityk, Katalog, Trendy). Każde działanie wychodzące na zewnątrz (mail, post) przechodzi przez **kolejkę zatwierdzeń**.

---

## 1. Zasady nadrzędne

1. **Human-in-the-loop.** Żaden agent nie wysyła maila ani nie publikuje posta bez akceptacji użytkownika. Agenci tworzą *propozycje* (`approval`), użytkownik je zatwierdza w UI. Dopiero wtedy wykonuje się akcja.
2. **Wszystko jest logowane.** Każde działanie agenta trafia do tabeli `activity` i jest widoczne w feedzie na dashboardzie.
3. **Manager nie robi pracy sam.** Manager deleguje zadania do agentów specjalistycznych i zbiera ich raporty.
4. **Sekrety tylko w env.** Żadnych tokenów w kodzie ani w bazie w postaci jawnej.
5. **Język UI i treści: polski.**

---

## 2. Stack

| Warstwa | Technologia |
|---|---|
| Frontend + API | Next.js (App Router), TypeScript, React |
| Styl | Tailwind CSS |
| Baza + auth + storage | Supabase (Postgres, Auth, Storage na media) |
| Agenci | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) — Manager jako agent główny, specjaliści jako subagenci |
| Model | `claude-sonnet-5-5` domyślnie; `claude-haiku-5-5` do prostych zadań (klasyfikacja, krótkie teksty, skanowanie trendów) |
| Maile | Gmail API (OAuth) — tworzenie szkiców, wysyłka po akceptacji |
| Social media | Metricool API **lub** Instagram Graph API (patrz §6) |
| Dane o trendach | Spotify Web API (charts/playlisty), YouTube Data API (trending/viral), opcjonalnie Genius API, scraping serwisów branżowych (patrz §6) |
| Harmonogram | Vercel Cron (brief dnia, raport tygodniowy, publikacja zaplanowanych postów, follow-upy, skan trendów) |
| Hosting | Vercel |

---

## 3. Agenci

Każdy agent = osobny subagent z własnym system promptem, zestawem narzędzi (tools) i zakresem uprawnień.

### 3.1 Agent Manager (główny)
- Generuje **brief dnia** (cron, codziennie 9:00 Europe/Warsaw): priorytety, co czeka na decyzję, co zrobili agenci.
- Przyjmuje polecenia użytkownika z pola tekstowego na dashboardzie (np. „zaplanuj promo singla na listopad”) i rozdziela je na zadania dla agentów.
- Narzędzia: `create_task`, `assign_task`, `read_activity`, `read_projects`, `read_approvals`, `delegate_to(agent, task)`.

### 3.2 Agent Album
- Śledzi etapy projektu: `pomysł → nagrania → mix → master → okładka → metadane → wydanie`.
- Pilnuje terminów, przypomina o feedbacku, prowadzi listę poprawek (np. do mixu).
- Narzędzia: `update_project_stage`, `add_project_note`, `create_reminder`.

### 3.3 Agent Social
- Plan contentu na 2 tygodnie do przodu, propozycje postów (opis, hashtagi, format: post/karuzela/reel/story, termin).
- Wskazuje, jakich materiałów brakuje (np. „potrzebne 3 klipy ze studia”).
- Po akceptacji planuje publikację (Metricool lub IG API).
- Może korzystać z insightów Agenta Trendy przy doborze formatów i tematów.
- Narzędzia: `propose_post`, `list_media`, `request_media`, `schedule_post` (wymaga zatwierdzenia).

### 3.4 Agent Promo
- Użytkownik wybiera **projekt** → agent tworzy **plan kampanii** (fazy: przygotowanie, pitching, premiera, follow-up).
- Dobiera adresatów z bazy `contacts`, pisze **spersonalizowane maile** i dodaje je do kolejki zatwierdzeń.
- Po wysyłce: follow-up po 7 dniach do osób bez odpowiedzi (też przez kolejkę).
- Zleca Agentowi Social posty powiązane z kampanią.
- Narzędzia: `create_campaign`, `select_contacts`, `draft_email`, `send_email` (wymaga zatwierdzenia), `check_replies`.

### 3.5 Agent Wydawniczy
- Metadane, kredyty, ISRC, checklisty dystrybucji, przypomnienie o pitchu do playlist redakcyjnych przed premierą, rejestracja utworów (ZAiKS/STOART).
- Narzędzia: `update_release_metadata`, `create_checklist`.

### 3.6 Agent Analityk
- Raport tygodniowy (poniedziałek 9:00): wyniki postów, statystyki kampanii mailowych (wysłane / odpowiedzi), postęp projektów.
- Narzędzia: `fetch_social_stats`, `read_campaign_stats`, `write_report`.

### 3.7 Agent Katalog
- Pilnuje rocznic wydawnictw (np. 10 lat „Kultury popularnej” — premiera 17.10.2016), proponuje akcje wokół starego katalogu, zbiera okazje do licencji (sync).
- Narzędzia: `read_releases`, `propose_campaign`.

### 3.8 Agent Trendy (nowy)
- **Fokus główny: polska scena rapowa.** Śledzi nowe wydania (single, albumy, EP-ki), freestyle'y, collaby, zmiany w obsadzie wytwórni, viralowe momenty, ruchy na listach (Spotify Polska, YouTube trending PL), powroty/comebacki artystów, aktywność producentów i bitmejkerów.
- **Scena amerykańska: tylko podgląd pików.** Nie monitoruje szczegółowo — zerka na największe hity i momentum (np. szczyty Billboard Hot 100 / viral TikTok), żeby wychwycić inspiracje i kierunki brzmieniowe, które mogą dotrzeć do PL.
- Zestawia znalezione sygnały w krótkie **insighty** (co, kto, kiedy, dlaczego ważne) i przekazuje je Managerowi — mogą stać się inspiracją dla Agenta Social (tematy postów) lub Agenta Promo (okazje do kolaboracji/komentarza).
- Nie publikuje i nie wysyła nic sam — tylko raportuje i proponuje (`propose_insight` może trafiać do `approvals` jako typ `other`, jeśli ma skutkować konkretną akcją, np. sugestią posta).
- **Zakres źródeł i dokładne kryteria śledzenia do doprecyzowania z użytkownikiem** (patrz §10) — na start zbiera dane z dostępnych API (Spotify, YouTube) i daje się rozbudować o kolejne źródła.
- Narzędzia: `fetch_pl_rap_releases`, `fetch_charts(scene)`, `detect_trend`, `propose_insight`.

---

## 4. Model danych (Supabase)

```sql
projects      (id, name, type, stage, progress, release_date, notes, created_at)
agents        (id, slug, name, role, status, current_task, progress, last_run_at)
tasks         (id, agent_slug, project_id, title, description, status, due_at, created_by, created_at)
approvals     (id, agent_slug, kind, title, payload jsonb, status, created_at, decided_at)
               -- kind: 'email' | 'post' | 'metadata' | 'other'
               -- status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed'
activity      (id, agent_slug, message, ref_type, ref_id, created_at)
contacts      (id, name, outlet, type, email, notes, last_contacted_at)
               -- type: 'media' | 'radio' | 'youtube' | 'playlist' | 'podcast' | 'portal'
campaigns     (id, project_id, name, plan jsonb, status, created_at)
emails        (id, campaign_id, contact_id, subject, body, status, gmail_message_id, sent_at, replied_at)
posts         (id, project_id, campaign_id, network, format, caption, media_urls text[], scheduled_at, status, external_id)
media         (id, project_id, storage_path, public_url, kind, created_at)
reports       (id, agent_slug, period_start, period_end, content, created_at)
trends        (id, scene, entity, type, title, source, url, detected_at, relevance_score, notes)
               -- scene: 'pl_rap' | 'us'
               -- type: 'release' | 'chart' | 'collab' | 'viral' | 'other'
```

Włącz RLS; na start jeden użytkownik (Bartek) + opcjonalnie drugi (Winiu).

---

## 5. Flow zatwierdzeń

1. Agent wywołuje narzędzie z efektem zewnętrznym (`send_email`, `schedule_post`) → **nie wykonuje akcji**, tylko tworzy rekord `approvals` ze statusem `pending` i pełnym `payload`.
2. Dashboard pokazuje kolejkę „Do zatwierdzenia” z podglądem.
3. Użytkownik: **Zatwierdź** / **Edytuj** / **Odrzuć**. Edycja zmienia `payload`.
4. Po zatwierdzeniu: server action wykonuje akcję (Gmail send / zaplanowanie posta), ustawia `executed` lub `failed` i loguje w `activity`.
5. Masowe „Zatwierdź wszystkie” dla kampanii mailowej, ale z podglądem każdego maila.

---

## 6. Integracje

### Gmail
- OAuth z zakresem do tworzenia szkiców i wysyłania.
- `draft_email` → tworzy szkic w Gmailu i rekord w `emails`.
- `send_email` → po akceptacji wysyła szkic.
- `check_replies` → sprawdza wątki kampanii, ustawia `replied_at`.

### Instagram — dwie opcje (zacznij od A)
**A. Metricool** (już używany w Claude): sprawdź, czy plan Metricool daje dostęp do ich API. Jeśli tak — użyj go do planowania postów i statystyk.
**B. Instagram Graph API (Content Publishing)** — gdyby A odpadło:
- Wymaga konta **profesjonalnego** IG, aplikacji w Meta for Developers i uprawnień do publikacji.
- API publikuje *teraz*, nie ma natywnego planowania → posty trzymamy w `posts` ze `scheduled_at`, **Vercel Cron co 5 min** publikuje te, którym minął termin.
- Media muszą być pod **publicznym URL** w momencie publikacji (Supabase Storage, public bucket lub signed URL).
- Obrazy tylko **JPEG**; karuzela do 20 elementów; obsługiwane: post, karuzela, reel, story.
- Pilnuj limitu publikacji na dobę (sprawdzanie przez endpoint `content_publishing_limit`).

### Dane o trendach (Agent Trendy)
- **Spotify Web API** — polskie playlisty wirusowe/top (np. „Viral 50 Poland”, „Top 50 Poland”), nowe wydania obserwowanych artystów/wytwórni.
- **YouTube Data API** — trending PL, statystyki świeżych teledysków.
- Opcjonalnie: Genius API (teksty, credity), RSS/scraping serwisów branżowych (np. polskie portale hip-hopowe) — do ustalenia z użytkownikiem.
- Dla sceny US: lekki, rzadszy skan czołówki (np. Billboard Hot 100 / Spotify Global Top), bez pełnego monitoringu.

---

## 7. Ekrany (zgodnie z mockupem)

### `/` — Dashboard
- Nagłówek: **HAIPESON × WINIU · Menago**, nawigacja: Dashboard, Projekty, Agenci, Promo, Kalendarz, Trendy.
- **Brief Managera**: nagłówek z liczbą rzeczy do decyzji, krótki opis, pole „Wydaj polecenie managerowi…”, lista 3 priorytetów.
- **Agenci**: siatka kart (nazwa, rola, status: `w toku` / `czeka na Ciebie` / `w gotowości`, bieżące zadanie, pasek postępu, ostatnia aktywność).
- **Do zatwierdzenia**: lista z przyciskami Podgląd / Zatwierdź.
- **Projekty**: nazwa, etap, pasek postępu.
- **Aktywność agentów**: feed z godziną i nazwą agenta.

### `/promo` — Agent Promo
- Wybór projektu (przyciski-pigułki).
- **Plan kampanii**: 4 fazy jako karty.
- **Adresaci**: tabela (kontakt, typ, status).
- **Szkic maila**: podgląd + Zatwierdź i wyślij wszystkie / Edytuj / Następny szkic.

### `/trendy` — Agent Trendy (MVP+)
- Feed insightów: data, encja (artysta/utwór/wytwórnia), typ (wydanie/chart/collab/viral), krótki opis, link do źródła.
- Filtr: polska scena / USA (piki).
- Przycisk „Zaproponuj post na podstawie tego" → wysyła sugestię do Agenta Social jako zadanie.

### Pozostałe (MVP+)
- `/projects/[id]` — etapy, notatki, media.
- `/calendar` — kalendarz postów i deadline’ów.
- `/contacts` — baza kontaktów (CRUD, import CSV).

### Styl
- Ciemne tło `#121211`, karty `#1C1B19`, ramki `#2C2A27`, tekst `#F2EDE4`, tekst drugorzędny `#A8A196`.
- Akcent pomarańczowy `#F08A3C`; status „w toku” niebieski `#6FA8FF`.
- Fonty: **Archivo** (nagłówki, tekst), **IBM Plex Mono** (etykiety, godziny, statusy).
- Responsywnie: musi działać na telefonie.

---

## 8. Kolejność budowy

1. **Fundament:** Next.js + Supabase + auth, schemat bazy, seed z przykładowymi projektami:
   - „Haipeson × Funkmaster Winio feat. Masta Ace” (etap: mix/master)
   - „Kultura popularna – 10 lat” (etap: promocja)
2. **Dashboard read-only** na danych z bazy (feed, agenci, projekty, approvals).
3. **Agent Manager** + pole poleceń + brief dnia (cron).
4. **Kolejka zatwierdzeń** (UI + server actions).
5. **Agent Promo + Gmail** (kampania, szkice, wysyłka po akceptacji, follow-up).
6. **Agent Social + Instagram** (Metricool lub Graph API + cron publikujący).
7. **Agent Trendy** (integracja Spotify/YouTube, cron skanujący, feed insightów, ekran `/trendy`).
8. Agent Album, Wydawniczy, Analityk, Katalog.

Po każdym kroku: działająca wersja, krótkie podsumowanie zmian.

---

## 9. Zmienne środowiskowe

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
METRICOOL_API_TOKEN=        # jeśli opcja A
META_APP_ID=                # jeśli opcja B
META_APP_SECRET=
IG_USER_ID=
IG_ACCESS_TOKEN=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
YOUTUBE_API_KEY=
CRON_SECRET=
```

---

## 10. Do ustalenia z użytkownikiem

- Czy Winiu ma mieć własne konto w panelu?
- Jedno wspólne konto IG czy osobne (Haipeson / Winiu)?
- Skąd wziąć początkową bazę kontaktów do promo?
- Metricool czy bezpośrednio Instagram API?
- **Agent Trendy**: dokładny zakres śledzenia polskiej sceny (konkretni artyści/wytwórnie do obserwacji vs. cała scena ogólnie?), jakie źródła poza Spotify/YouTube (portale branżowe, social media?), jak często ma skanować (codziennie? co tydzień?), co dokładnie liczy się jako „pik” na scenie US.
