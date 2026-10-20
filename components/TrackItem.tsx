import type { Track } from "@/lib/types";
import { updateTrack, deleteTrack } from "@/app/actions/tracks";

const STATUS_OPTIONS = [
  "pomysł",
  "tekst",
  "nagrany",
  "zmiksowany",
  "zmasterowany",
  "gotowy",
];

const inputClass =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";

export default function TrackItem({ track }: { track: Track }) {
  return (
    <form
      action={updateTrack}
      className="rounded-lg border border-border bg-background p-4"
    >
      <input type="hidden" name="id" value={track.id} />
      <input type="hidden" name="project_id" value={track.project_id} />

      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] text-muted">
          #{track.position}
        </p>
        <select
          name="status"
          defaultValue={track.status}
          className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] uppercase text-muted outline-none focus:border-accent"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
          Tytuł
          <input
            name="title"
            defaultValue={track.title}
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Bit (producent)
          <input
            name="beat_by"
            defaultValue={track.beat_by ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Kto rapuje / śpiewa
          <input
            name="performers"
            defaultValue={track.performers ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Kto napisał tekst
          <input
            name="written_by"
            defaultValue={track.written_by ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Kto nagrywał
          <input
            name="recorded_by"
            defaultValue={track.recorded_by ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
          DJ / inny muzyk
          <input
            name="additional_musicians"
            defaultValue={track.additional_musicians ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
          Notatki
          <textarea
            name="notes"
            defaultValue={track.notes ?? ""}
            rows={2}
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          formAction={deleteTrack}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
        >
          Usuń
        </button>
        <button className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90">
          Zapisz
        </button>
      </div>
    </form>
  );
}
