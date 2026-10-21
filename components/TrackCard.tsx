import type { Track, TrackItem, TrackItemCategory } from "@/lib/types";
import { updateTrack, deleteTrack } from "@/app/actions/tracks";
import { createTrackItem } from "@/app/actions/trackItems";
import TrackItemRow from "@/components/TrackItemRow";

const CATEGORY_LABELS: Record<TrackItemCategory, string> = {
  wokale: "Wokale / rapy",
  muzyka: "Muzyka",
  dj: "DJ",
  inne: "Inne",
};
const CATEGORY_ORDER: TrackItemCategory[] = ["wokale", "muzyka", "dj", "inne"];

const inputClass =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";

function calcPct(items: TrackItem[]) {
  const applicable = items.filter((i) => i.status !== "nie_dotyczy");
  if (applicable.length === 0) return null;
  const done = applicable.filter((i) => i.status === "zrobione").length;
  return Math.round((done / applicable.length) * 100);
}

export default function TrackCard({
  track,
  items,
}: {
  track: Track;
  items: TrackItem[];
}) {
  const pct = calcPct(items);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <form
        action={updateTrack}
        className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1fr_auto]"
      >
        <input type="hidden" name="id" value={track.id} />
        <input type="hidden" name="project_id" value={track.project_id} />
        <p className="self-center font-mono text-[11px] text-muted">
          #{track.position}
        </p>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tytuł
          <input
            name="title"
            defaultValue={track.title}
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Bit
          <input
            name="beat_name"
            defaultValue={track.beat_name ?? ""}
            className={inputClass}
          />
        </label>
        <div className="flex items-end gap-2">
          <button className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90">
            Zapisz
          </button>
          <button
            formAction={deleteTrack}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
          >
            Usuń
          </button>
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-4">
          Notatki
          <textarea
            name="notes"
            defaultValue={track.notes ?? ""}
            rows={2}
            className={inputClass}
          />
        </label>
      </form>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-status-progress"
            style={{ width: `${pct ?? 0}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-muted">
          {pct === null ? "brak elementów" : `${pct}%`}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {CATEGORY_ORDER.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          if (catItems.length === 0) return null;
          return (
            <div key={cat}>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="flex flex-col gap-1.5">
                {catItems.map((item) => (
                  <TrackItemRow
                    key={item.id}
                    item={item}
                    projectId={track.project_id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <form
        action={createTrackItem}
        className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3"
      >
        <input type="hidden" name="track_id" value={track.id} />
        <input type="hidden" name="project_id" value={track.project_id} />
        <label className="flex flex-col gap-1 text-[11px] text-muted">
          Kategoria
          <select
            name="category"
            defaultValue="inne"
            className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
          >
            <option value="wokale">Wokale / rapy</option>
            <option value="muzyka">Muzyka</option>
            <option value="dj">DJ</option>
            <option value="inne">Inne</option>
          </select>
        </label>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[11px] text-muted">
          Element
          <input
            name="label"
            required
            placeholder="np. Rap — Winio"
            className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted">
          Kto
          <input
            name="assignee"
            placeholder="opcjonalnie"
            className="w-28 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
          />
        </label>
        <button className="rounded-md border border-accent/60 px-3 py-1.5 text-xs text-accent transition hover:bg-accent/10">
          + Dodaj element
        </button>
      </form>
    </div>
  );
}
