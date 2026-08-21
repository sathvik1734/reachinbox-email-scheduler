import { CalendarClock, MailCheck } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { EmailItem } from "../types/api";

interface EmailTableProps {
  items: EmailItem[];
  view: "scheduled" | "sent";
  loading: boolean;
  selectedId?: string;
  onSelect?: (item: EmailItem) => void;
}

const formatDate = (value: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
};

export function EmailTable({ items, view, loading, selectedId, onSelect }: EmailTableProps) {
  if (loading) {
    return <div className="divide-y divide-line" aria-busy="true">{[0, 1, 2, 3, 4].map((row) => <div className="space-y-2 px-4 py-4" key={row}><div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" /><div className="h-3 w-full animate-pulse rounded bg-slate-100" /></div>)}</div>;
  }

  if (!items.length) {
    const Icon = view === "scheduled" ? CalendarClock : MailCheck;
    return <div className="grid min-h-64 place-items-center px-6 text-center"><div><span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon className="h-4 w-4" /></span><h3 className="text-sm font-semibold text-ink">No {view} emails</h3><p className="mt-1 text-xs text-muted">Your {view} messages will appear here.</p></div></div>;
  }

  return (
    <div className="divide-y divide-line">
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <button className={`block w-full px-4 py-3 text-left transition ${active ? "bg-brand-50" : "bg-white hover:bg-[#f9fbfa]"}`} key={item.id} onClick={() => onSelect?.(item)} type="button">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-xs font-semibold text-ink">{item.recipient}</p>
              <time className="shrink-0 text-[10px] text-muted">{formatDate(view === "scheduled" ? item.scheduledAt : item.sentAt)}</time>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="truncate text-[11px] text-muted">{item.subject}</p>
              <StatusBadge status={item.status} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
