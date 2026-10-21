import type { ProjectItem } from "@/lib/types";
import { updateProjectItem, deleteProjectItem } from "@/app/actions/projectItems";

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

export default function ProjectItemRow({ item }: { item: ProjectItem }) {
  return (
    <form
      action={updateProjectItem}
      className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${
        STATUS_STYLES[item.status] ?? STATUS_STYLES.do_zrobienia
      }`}
    >
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="project_id" value={item.project_id} />
      <input
        name="label"
        defaultValue={item.label}
        className={`${fieldClass} min-w-[120px] flex-1`}
      />
      <input
        name="assignee"
        defaultValue={item.assignee ?? ""}
        placeholder="kto"
        className={`${fieldClass} w-28`}
      />
      <select
        name="status"
        defaultValue={item.status}
        className={`${fieldClass} text-[11px] uppercase`}
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
        className={`${fieldClass} min-w-[100px] flex-1`}
      />
      <button className="rounded border border-border/60 px-2 py-0.5 text-[11px]">
        Zapisz
      </button>
      <button
        formAction={deleteProjectItem}
        className="rounded border border-border/60 px-2 py-0.5 text-[11px] text-muted"
      >
        Usuń
      </button>
    </form>
  );
}
