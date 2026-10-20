import type { Approval } from "@/lib/types";
import { approveApproval, rejectApproval } from "@/app/actions/approvals";

interface PostPayload {
  format?: string;
  caption?: string;
  scheduled_at?: string;
}

export default function PostDraftItem({ approval }: { approval: Approval }) {
  const payload = approval.payload as PostPayload;

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-muted">
            {payload.format} · {payload.scheduled_at}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm">{payload.caption}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <form action={rejectApproval}>
            <input type="hidden" name="id" value={approval.id} />
            <button className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground">
              Odrzuć
            </button>
          </form>
          <form action={approveApproval}>
            <input type="hidden" name="id" value={approval.id} />
            <button className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90">
              Zatwierdź
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
