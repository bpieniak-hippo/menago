import type { TrackItem } from "@/lib/types";
import { updateTrackItem, deleteTrackItem } from "@/app/actions/trackItems";

const STATUS_OPTIONS = [
  { value: "zrobione", label: "Zrobione" },
  { value: "do_zrobienia", label: "Do zrobienia" },
  { value: "nie_dotyczy", label: "Nie dotyczy" },
];

const STATUS_STYLES: Record<string, string> = {
  zrobione: "border-green-500/40 bg-green-500/10",
  do_zrobienia: "border-amber-500/40 bg-amber-500/10",
  nie_dotyczy: "border-border bg-background",
};

const fieldClass =
  "rounded border border-transparent bg-transparent px-1 py-0.5 outline-none focus:border-border";

export default function TrackItemRow({
  item,
  projectId,
}: {
  item: TrackItem;
  projectId: string;
}) {
  return (
    <form
      action={updateTrackItem}
      className={`flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
        STATUS_STYLES[item.status] ?? STATUS_STYLES.do_zrobienia
      }`}
    >
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="track_id" value={item.track_id} />
      <input type="hidden" name="project_id" value={projectId} />
      <select
        name="category"
        defaultValue={item.category}
        className={`${fieldClass} text-[10px] uppercase`}
      >
        <option value="wokale">Wokale</option>
        <option value="muzyka">Muzyka</option>
        <option value="dj">DJ</option>
        <option value="inne">Inne</option>
      </select>
      <input
        name="label"
        defaultValue={item.label}
        className={`${fieldClass} min-w-[110px] flex-1`}
      />
      <input
        name="assignee"
        defaultValue={item.assignee ?? ""}
        placeholder="kto"
        className={`${fieldClass} w-24`}
      />
      <select
        name="status"
        defaultValue={item.status}
        className={`${fieldClass} text-[10px] uppercase`}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        name="note"
        defaultValue={item.note ?? ""}
        placeholder="notatka"
        className={`${fieldClass} min-w-[90px] flex-1`}
      />
      <button className="rounded border border-border/60 px-2 py-0.5 text-[10px]">
        Zapisz
      </button>
      <button
        formAction={deleteTrackItem}
        className="rounded border border-border/60 px-2 py-0.5 text-[10px] text-muted"
      >
        Usuń
      </button>
    </form>
  );
}
