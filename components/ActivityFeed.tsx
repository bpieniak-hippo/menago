import type { Activity } from "@/lib/types";

export default function ActivityFeed({ items }: { items: Activity[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Brak aktywności.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 text-sm">
          <span className="shrink-0 font-mono text-[11px] text-muted">
            {new Date(item.created_at).toLocaleTimeString("pl-PL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-accent">
            {item.agent_slug}
          </span>
          <span className="text-foreground/90">{item.message}</span>
        </li>
      ))}
    </ol>
  );
}
