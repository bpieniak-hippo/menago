import type { Approval } from "@/lib/types";
import { approveApproval, rejectApproval } from "@/app/actions/approvals";

const KIND_LABELS: Record<Approval["kind"], string> = {
  email: "Mail",
  post: "Post",
  metadata: "Metadane",
  other: "Inne",
};

export default function ApprovalItem({ approval }: { approval: Approval }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-border px-2 py-0.5 font-mono text-[11px] text-muted">
              {KIND_LABELS[approval.kind]}
            </span>
            <span className="font-mono text-[11px] text-muted">
              {approval.agent_slug}
            </span>
          </div>
          <p className="mt-1 truncate text-sm">{approval.title}</p>
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
      <details className="mt-2">
        <summary className="cursor-pointer font-mono text-[11px] text-muted">
          Podgląd
        </summary>
        <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-card p-3 font-mono text-[11px] text-foreground/80">
          {JSON.stringify(approval.payload, null, 2)}
        </pre>
      </details>
    </div>
  );
}
