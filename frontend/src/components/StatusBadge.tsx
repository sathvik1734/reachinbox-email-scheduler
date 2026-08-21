import type { EmailStatus } from "../types/api";

export function StatusBadge({ status }: { status: EmailStatus }) {
  const styles: Record<EmailStatus, string> = {
    queued: "bg-slate-100 text-slate-600",
    scheduled: "bg-blue-50 text-blue-700",
    sending: "bg-amber-50 text-amber-700",
    sent: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize ${styles[status]}`}>
      <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  );
}
