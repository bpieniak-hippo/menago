# Menago

Panel agentów do prowadzenia kariery muzycznej — Haipeson × Winiu.
Pełna specyfikacja: [`MENAGO_SPEC.md`](./MENAGO_SPEC.md).

## Start lokalny

```bash
npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000). Bez skonfigurowanego
Supabase dashboard działa na danych przykładowych (`lib/mock-data.ts`), żeby
dało się od razu przejrzeć UI.

## Podłączenie Supabase

1. Utwórz projekt na [supabase.com](https://supabase.com).
2. W SQL Editor uruchom po kolei:
   - `supabase/schema.sql` — tabele i RLS
   - `supabase/seed.sql` — dane startowe (2 projekty, 8 agentów, przykładowe
     zadania/approvale/aktywność/trendy)
3. Skopiuj `.env.local.example` do `.env.local` i uzupełnij:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — z ustawień
     projektu Supabase (Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` — tylko do operacji serwerowych (agenci),
     nigdy nie eksponuj po stronie klienta
4. W Supabase Auth włącz logowanie e-mail (magic link) — strona `/login`
   tego używa.
5. Dodaj `ANTHROPIC_API_KEY` (do Agenta Managera) i opcjonalnie `CRON_SECRET`
   (zabezpiecza endpoint crona).
6. Uruchom ponownie `npm run dev`.

## Agent Manager

- Pole „Wydaj polecenie managerowi…” na dashboardzie wywołuje `lib/agents/manager.ts`
  (pętla tool-use na Anthropic Messages API — `@anthropic-ai/sdk`, nie
  `claude-agent-sdk`, bo ten drugi jest pomyślany pod lokalny/CLI harness
  z podprocesami, a nie pod serverless route Vercela).
- Narzędzia managera (`read_projects`, `read_activity`, `read_approvals`,
  `create_task`, `delegate_to`) działają na kliencie serwisowym Supabase
  (`SUPABASE_SERVICE_ROLE_KEY`) — wymaga prawdziwego, podłączonego projektu.
- Model: `claude-sonnet-4-6` (nadpisywalny przez `ANTHROPIC_MODEL`). W spec
  figuruje `claude-sonnet-5-5` jako placeholder — taki model jeszcze nie
  istnieje, więc używamy aktualnego Sonneta.
- Brief dnia: `GET /api/cron/daily-brief`, wpięty w `vercel.json` (cron
  `0 8 * * *` UTC ≈ 9:00 w Polsce zimą / 10:00 latem — Vercel Cron nie wspiera
  stref czasowych, więc to przybliżenie). Zapisuje wynik do tabeli `reports`
  i pokazuje go w sekcji „Brief Managera”.

## Kolejka zatwierdzeń

- `app/actions/approvals.ts` — `approveApproval` / `rejectApproval` jako
  server actions spięte z formularzami w `ApprovalItem`.
- Logika decyzji jest scentralizowana w `lib/approvals.ts` (`decideApproval`):
  odrzucenie tylko loguje aktywność; zatwierdzenie maila faktycznie wysyła
  szkic przez Gmail (patrz niżej), inne rodzaje (post itp.) czekają na
  integracje z kroku 6 i kończą się na statusie `approved`.
- Końcowy status w `approvals`/`emails`: `executed`/`sent` (sukces) albo
  `failed` (błąd wysyłki).

## Agent Promo + Gmail (krok 5)

- `/promo` — wybór projektu, generowanie planu kampanii (4 fazy) i szkiców
  maili do pasujących kontaktów z bazy (`lib/agents/promo.ts`, pętla
  tool-use jak w Agencie Managerze).
- Agent **nigdy nie wysyła sam** — `draft_email` tylko tworzy rekord w
  `emails` (status `draft`) + wpis w `approvals`. Wysyłka następuje dopiero
  po zatwierdzeniu w kolejce (pojedynczo albo zbiorczo przyciskiem
  „Zatwierdź i wyślij wszystkie”).
- Integracja Gmail (`lib/google/gmail.ts`) jest opcjonalna — bez niej szkice
  i tak powstają w bazie, po prostu nie tworzy się realny draft/wysyłka w
  Gmailu (dopóki nie skonfigurujesz env).
- **Konfiguracja Gmail** (jednorazowo, lokalnie):
  1. Utwórz projekt w [Google Cloud Console](https://console.cloud.google.com/),
     włącz Gmail API, utwórz OAuth Client ID (typ „Desktop app”) —
     skopiuj `Client ID` i `Client secret` do `.env.local` jako
     `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
  2. Uruchom `node scripts/google-oauth.mjs` — otworzy się przeglądarka z
     ekranem zgody Google, po zatwierdzeniu dostaniesz `GOOGLE_REFRESH_TOKEN`
     do wklejenia w `.env.local`. Zgodnie z zasadą „sekrety tylko w env”
     (spec §1) ten token NIE jest nigdzie zapisywany w bazie.
  3. Zrestartuj `npm run dev` / redeploy.
- **Follow-up po 7 dniach**: `GET /api/cron/promo-followup` (w `vercel.json`,
  `0 9 * * *`) sprawdza wysłane maile bez odpowiedzi starsze niż 7 dni
  (heurystyka: wątek Gmail ma >1 wiadomość = odpowiedź), oznacza odpowiedzi
  (`replied_at`), a dla reszty tworzy szkic follow-upu przez tę samą ścieżkę
  kolejki zatwierdzeń (`createEmailDraft` z `lib/agents/promo.ts`,
  reużywane też przez narzędzie `draft_email`).

## Agent Social + Instagram (krok 6)

- `/calendar` — wybór projektu, generowanie planu contentu (2 tygodnie) i
  kalendarz postów (`lib/agents/social.ts`, ta sama architektura pętli
  tool-use co Manager/Promo).
- Agent sprawdza dostępne media (`list_media`), zgłasza braki
  (`request_media`), zapisuje szkice postów (`propose_post`) i te gotowe do
  akceptacji wysyła do kolejki zatwierdzeń (`schedule_post`).
- **Zatwierdzenie ≠ publikacja.** Instagram Graph API publikuje „teraz”, nie
  ma natywnego planowania (spec §6) — po zatwierdzeniu post dostaje status
  `queued` i czeka na swój `scheduled_at`. Publikację wykonuje
  `GET /api/cron/social-publish` (w `vercel.json`, co 5 min).
- Wybrano **opcję B — Instagram Graph API** (`lib/instagram.ts`) zamiast
  Metricool (opcja A ze spec §6) — Graph API jest w pełni udokumentowane i
  sterowalne wyłącznie przez env, bez zależności od dostępu do API
  zewnętrznego narzędzia. Jeśli jednak masz dostęp do API Metricool, da się
  to podmienić bez zmiany reszty flow (sama logika `publishPost` jest
  odizolowana w `lib/instagram.ts`).
- **Konfiguracja** (`.env.local`):
  - Konto IG musi być **profesjonalne** i połączone ze stroną na Facebooku.
  - Utwórz aplikację w [Meta for Developers](https://developers.facebook.com/),
    dodaj produkt Instagram Graph API, wygeneruj długo działający token
    dostępu z uprawnieniami `instagram_content_publish` — wklej jako
    `IG_ACCESS_TOKEN`, a ID konta IG jako `IG_USER_ID`.
  - Media (`media_urls`) muszą być pod **publicznym URL** w momencie
    publikacji (np. publiczny bucket Supabase Storage).
  - Obrazy tylko JPEG; karuzela 2–20 elementów.
- Bez skonfigurowanego Instagrama plan contentu i szkice nadal powstają w
  bazie — po prostu cron publikujący nic nie robi, dopóki nie uzupełnisz env.

## Agent Trendy (krok 7)

- `/trendy` — feed insightów (filtr: polska scena / USA-piki), przycisk
  „Skanuj teraz” (uruchamia agenta na żądanie) i „Zaproponuj post na
  podstawie tego” (tworzy zadanie dla Agenta Social).
- `lib/agents/trendy.ts` — fokus na polskiej scenie rapowej
  (`fetch_charts("pl_rap")`: Spotify Top 50 + Viral 50 Polska, YouTube
  trending PL w kategorii Music), scena US tylko pobieżnie
  (`fetch_charts("us")`: top kilka z YouTube trending US). Zapisuje tylko
  insighty, które uzna za istotne (`propose_insight`) — nie każdy wiersz
  listy. Nigdy nie publikuje/wysyła sam.
- Jeśli insight nadaje się na konkretną akcję, agent może oznaczyć
  `suggest_action: true` — trafia wtedy też do kolejki zatwierdzeń (`kind:
  "other"`) jako sugestia do przejrzenia.
- Cron `GET /api/cron/trendy-scan` (domyślnie codziennie, `0 10 * * *`) —
  częstotliwość to jedna z otwartych kwestii ze spec §10, łatwa do zmiany
  w `vercel.json`.
- Bez `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` i/lub `YOUTUBE_API_KEY`
  agent po prostu pomija źródła, których nie ma — działa częściowo z tym,
  co skonfigurowane.
- ID edytorskich playlist Spotify („Top 50 Poland”, „Viral 50 Poland”) są
  zahardkodowane jako wartości domyślne w `lib/spotify.ts` — Spotify czasem
  je zmienia, więc w razie błędów nadpisz je przez
  `SPOTIFY_PL_TOP_PLAYLIST_ID` / `SPOTIFY_PL_VIRAL_PLAYLIST_ID`.
- **Otwarte pytania ze spec §10** (dokładny zakres źródeł, konkretni
  artyści/wytwórnie do obserwacji, częstotliwość skanu, definicja „piku”
  na scenie US) — MVP działa na ogólnych chartach, do doprecyzowania.

## Agent Album, Wydawniczy, Analityk, Katalog (krok 8)

- Lżejsi specjaliści bez własnych ekranów — spec nie przewiduje dla nich
  dedykowanych widoków (tylko Dashboard, `/promo`, `/trendy` są jawnie
  opisane w §7). Uruchamiane przez **Agenta Managera**: gdy w poleceniu z
  dashboardu wspomnisz jednego z nich, Manager użyje `delegate_to`, co
  **faktycznie uruchamia** ich pętlę tool-use (nie tylko zmienia status) i
  zbiera ich podsumowanie do feedu aktywności — zgodnie z zasadą „Manager
  deleguje i zbiera raporty” (spec §1.3).
- `lib/agents/album.ts` — etapy projektu, notatki, przypomnienia
  (`update_project_stage`, `add_project_note`, `create_reminder`).
- `lib/agents/wydawniczy.ts` — metadane wydania (zapisywane jako notatka —
  MVP, brak jeszcze dedykowanej tabeli metadanych) i checklisty dystrybucji
  (`update_release_metadata`, `create_checklist`).
- `lib/agents/analityk.ts` — statystyki postów/kampanii i raport tygodniowy
  (`fetch_social_stats`, `read_campaign_stats`, `write_report`); cron
  `GET /api/cron/weekly-report` (poniedziałek 9:00, spec §3.6).
- `lib/agents/katalog.ts` — przegląd katalogu i propozycje kampanii
  rocznicowych/sync (`read_releases`, `propose_campaign` — zapisuje do
  `campaigns` ze statusem `proposed`, do przejrzenia przez użytkownika,
  nie jest to jeszcze aktywna kampania promo).
- Promo/Social/Trendy **nie** są uruchamiane przez `delegate_to` — mają
  pełny, wieloetapowy flow z własnymi ekranami (`/promo`, `/calendar`,
  `/trendy`), gdzie wybiera się projekt i przegląda wynik krok po kroku.

## Projekty + tracklista (funkcja dodatkowa, poza build-orderem spec)

- Ekran `/projects` — lista projektów (kafelki z linkiem do szczegółów) +
  formularz „Nowy projekt" (nazwa, typ, etap — pola tekstowe z `<datalist>`
  zamiast `<select>`, żeby nie nadpisać istniejących, wolnotekstowych wartości
  typu/etapu, data premiery, notatki).
- Ekran `/projects/[id]` — edycja danych projektu (nazwa, typ, etap, data
  premiery, postęp %, notatki) oraz pełne zarządzanie tracklistą: dla
  każdego utworu można zapisać tytuł, kto zrobił bit (producent), kto
  rapuje/śpiewa, kto napisał tekst, kto nagrywał, czy grał DJ/inny muzyk,
  notatki i status (`pomysł → tekst → nagrany → zmiksowany → zmasterowany →
  gotowy`); formularz na dole dodaje nowy utwór (kolejna pozycja w tracklist).
- Nowa tabela `tracks` w `supabase/schema.sql` (FK do `projects`, kasowana
  kaskadowo), z RLS jak reszta tabel.
- `lib/data.ts` — `getProjectById`, `getTracksForProject`.
- `app/actions/projects.ts` — `createProject`, `updateProject`.
- `app/actions/tracks.ts` — `createTrack`, `updateTrack`, `deleteTrack`.
- `components/TrackItem.tsx` — formularz edycji/usuwania pojedynczego utworu.

## Status budowy (wg §8 specyfikacji)

- [x] 1. Fundament: Next.js + Tailwind + Supabase (schemat, seed, auth)
- [x] 2. Dashboard read-only na danych z bazy
- [x] 3. Agent Manager + pole poleceń + brief dnia (cron)
- [x] 4. Kolejka zatwierdzeń — akcje (zatwierdź/odrzuć) jako server actions
- [x] 5. Agent Promo + Gmail (plan kampanii, szkice maili, wysyłka po
      zatwierdzeniu, follow-up po 7 dniach)
- [x] 6. Agent Social + Instagram (plan contentu, kalendarz `/calendar`,
      publikacja po zatwierdzeniu przez cron)
- [x] 7. Agent Trendy (Spotify/YouTube, cron skanujący, ekran `/trendy`)
- [x] 8. Agent Album, Wydawniczy, Analityk, Katalog (uruchamiani przez
      `delegate_to` Managera; Analityk ma też cron raportu tygodniowego)

## Struktura

```
app/
  actions/           # server actions (manager, approvals, promo, projects, tracks)
  api/cron/          # endpointy cron (brief dnia, follow-up promo)
  projects/          # lista projektów + widok szczegółów z tracklistą
  ...                # strony (App Router)
components/          # komponenty UI dashboardu
lib/
  agents/manager.ts  # Agent Manager — pętla tool-use (Anthropic SDK)
  agents/promo.ts    # Agent Promo — plan kampanii + szkice maili
  agents/social.ts   # Agent Social — plan contentu + szkice postów
  agents/trendy.ts   # Agent Trendy — skan chartów PL/US + insighty
  agents/album.ts, wydawniczy.ts, analityk.ts, katalog.ts  # lżejsi specjaliści
  agents/loop.ts     # współdzielona pętla tool-use (Anthropic Messages API)
  approvals.ts       # centralna logika decyzji w kolejce zatwierdzeń
  google/gmail.ts    # integracja Gmail (szkice, wysyłka, detekcja odpowiedzi)
  instagram.ts       # integracja Instagram Graph API (publikacja postów)
  spotify.ts          # integracja Spotify Web API (charty PL)
  youtube.ts          # integracja YouTube Data API (trending)
  data.ts            # warstwa odczytu danych (Supabase + fallback mock)
  mock-data.ts        # dane przykładowe
  types.ts            # typy zgodne ze schematem bazy
  supabase/           # klienci Supabase (browser/server/admin) + middleware auth
scripts/
  google-oauth.mjs    # jednorazowy skrypt do uzyskania GOOGLE_REFRESH_TOKEN
supabase/
  schema.sql           # schemat bazy + RLS
  seed.sql             # dane startowe
vercel.json            # harmonogram cronów (brief dnia, follow-up promo, publikacja postów, skan trendów, raport tygodniowy)
```
