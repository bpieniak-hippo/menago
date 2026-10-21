import type { Approval } from "@/lib/types";
import { approveApproval, rejectApproval } from "@/app/actions/approvals";

interface EmailPayload {
  to?: string;
  subject?: string;
  body?: string;
}

export default function EmailDraftItem({
  approval,
  returnTo,
}: {
  approval: Approval;
  returnTo?: string;
}) {
  const payload = approval.payload as EmailPayload;

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-muted">Do: {payload.to}</p>
          <p className="mt-1 text-sm font-semibold">{payload.subject}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <form action={rejectApproval}>
            <input type="hidden" name="id" value={approval.id} />
            {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
            <button className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground">
              Odrzuć
            </button>
          </form>
          <form action={approveApproval}>
            <input type="hidden" name="id" value={approval.id} />
            {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
            <button className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90">
              Zatwierdź i wyślij
            </button>
          </form>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm text-foreground/80">
        {payload.body}
      </p>
    </div>
  );
}
