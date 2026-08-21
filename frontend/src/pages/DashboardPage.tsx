import { useCallback, useEffect, useState } from "react";
import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Clock3, ExternalLink, LogOut, MailCheck, MoreHorizontal, Plus, RefreshCw, Search, Send } from "lucide-react";
import { Navigate } from "react-router-dom";
import { ComposeEmailModal } from "../components/ComposeEmailModal";
import { EmailTable } from "../components/EmailTable";
import { StatusBadge } from "../components/StatusBadge";
import { Toast, type ToastState } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import { useEmailList } from "../hooks/useEmailList";
import { api } from "../lib/api";
import type { EmailItem, Stats, SystemConfig } from "../types/api";

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [view, setView] = useState<"scheduled" | "sent">("scheduled");
  const [composeOpen, setComposeOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [stats, setStats] = useState<Stats>({ scheduled: 0, sent: 0, failed: 0 });
  const [config, setConfig] = useState<SystemConfig>({ minSendDelayMs: 2000, maxEmailsPerHourPerSender: 200, maxRecipientsPerCampaign: 5000 });
  const [selected, setSelected] = useState<EmailItem | null>(null);
  const emails = useEmailList(view);

  const loadStats = useCallback(async () => {
    try { setStats(await api.stats()); } catch { /* list exposes the request error */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadStats();
    void api.config().then(setConfig).catch(() => undefined);
  }, [loadStats, user]);

  useEffect(() => {
    if (!emails.items.length) { setSelected(null); return; }
    setSelected((current) => emails.items.find((item) => item.id === current?.id) ?? emails.items[0] ?? null);
  }, [emails.items]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (authLoading) return <div className="grid min-h-screen place-items-center bg-white"><div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" /></div>;
  if (!user) return <Navigate replace to="/login" />;

  const refresh = async () => Promise.all([emails.load(emails.pagination.page), loadStats()]);
  const handleScheduled = (count: number, recoveryPending: boolean) => {
    setToast({ type: "success", message: recoveryPending ? `${count} emails saved and waiting for Redis.` : `${count} emails scheduled successfully.` });
    setView("scheduled");
    void refresh();
  };

  return (
    <div className="flex h-screen min-h-[640px] overflow-hidden bg-white text-ink">
      <aside className="flex w-[76px] shrink-0 flex-col border-r border-line bg-[#fbfcfb] lg:w-[196px]">
        <div className="flex h-[54px] items-center border-b border-line px-4">
          <span className="text-base font-black tracking-[-.12em] text-ink">ONB</span>
        </div>
        <div className="border-b border-line px-3 py-3">
          <div className="flex items-center gap-2 rounded-md px-1.5 py-1">
            {user.avatarUrl ? <img alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" src={user.avatarUrl} /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">{user.name.charAt(0)}</span>}
            <div className="hidden min-w-0 flex-1 lg:block"><p className="truncate text-[10px] font-semibold">{user.name}</p><p className="truncate text-[9px] text-muted">{user.email}</p></div>
            <ChevronDown className="hidden h-3 w-3 text-muted lg:block" />
          </div>
        </div>
        <div className="px-3 py-4">
          <button className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-brand-500 bg-white text-[11px] font-semibold text-brand-700 hover:bg-brand-50" onClick={() => setComposeOpen(true)}><Plus className="h-3.5 w-3.5" /><span className="hidden lg:inline">Compose</span></button>
        </div>
        <nav className="space-y-1 px-2">
          <button className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-[11px] ${view === "scheduled" ? "bg-brand-50 font-semibold text-brand-700" : "text-muted hover:bg-white"}`} onClick={() => setView("scheduled")}><CalendarClock className="h-3.5 w-3.5 shrink-0" /><span className="hidden lg:inline">Scheduled</span><span className="ml-auto hidden text-[9px] lg:inline">{stats.scheduled}</span></button>
          <button className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-[11px] ${view === "sent" ? "bg-brand-50 font-semibold text-brand-700" : "text-muted hover:bg-white"}`} onClick={() => setView("sent")}><Send className="h-3.5 w-3.5 shrink-0" /><span className="hidden lg:inline">Sent</span><span className="ml-auto hidden text-[9px] lg:inline">{stats.sent}</span></button>
          <div className="flex h-8 items-center gap-2 px-2 text-[11px] text-muted"><MailCheck className="h-3.5 w-3.5" /><span className="hidden lg:inline">Failed</span><span className="ml-auto hidden text-[9px] lg:inline">{stats.failed}</span></div>
        </nav>
        <button className="mt-auto flex h-12 items-center justify-center gap-2 border-t border-line text-[10px] text-muted hover:bg-white hover:text-ink" onClick={() => void logout()}><LogOut className="h-3.5 w-3.5" /><span className="hidden lg:inline">Logout</span></button>
      </aside>

      <section className="flex w-[330px] shrink-0 flex-col border-r border-line bg-white md:w-[390px]">
        <div className="flex h-[54px] items-center gap-2 border-b border-line px-3">
          <div className="flex h-8 flex-1 items-center gap-2 rounded-md bg-[#f5f8f6] px-3"><Search className="h-3.5 w-3.5 text-muted" /><input aria-label="Search emails" className="w-full bg-transparent text-[11px] outline-none placeholder:text-slate-400" placeholder="Search" /></div>
          <button aria-label="Refresh" className="rounded p-1.5 text-muted hover:bg-brand-50 hover:text-brand-600" onClick={() => void refresh()}><RefreshCw className={`h-3.5 w-3.5 ${emails.loading ? "animate-spin" : ""}`} /></button>
        </div>
        <div className="flex h-11 items-center justify-between border-b border-line px-4">
          <div><h1 className="text-xs font-semibold capitalize">{view}</h1><p className="text-[9px] text-muted">{emails.pagination.total} email{emails.pagination.total === 1 ? "" : "s"}</p></div>
          <MoreHorizontal className="h-4 w-4 text-muted" />
        </div>
        {emails.error && <div className="m-3 rounded-md bg-red-50 p-2 text-[10px] text-red-700">{emails.error}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto"><EmailTable items={emails.items} loading={emails.loading} onSelect={setSelected} selectedId={selected?.id} view={view} /></div>
        {emails.pagination.total > 0 && <div className="flex h-10 items-center justify-between border-t border-line px-3 text-[9px] text-muted"><span>{emails.pagination.page} / {emails.pagination.pages}</span><div className="flex gap-1"><button disabled={emails.pagination.page <= 1} onClick={() => void emails.load(emails.pagination.page - 1)}><ChevronLeft className="h-3.5 w-3.5" /></button><button disabled={emails.pagination.page >= emails.pagination.pages} onClick={() => void emails.load(emails.pagination.page + 1)}><ChevronRight className="h-3.5 w-3.5" /></button></div></div>}
      </section>

      <main className="min-w-0 flex-1 overflow-y-auto bg-white">
        {selected ? (
          <article>
            <header className="flex h-[54px] items-center justify-between border-b border-line px-5">
              <div className="flex min-w-0 items-center gap-2"><ChevronLeft className="h-3.5 w-3.5 text-muted" /><h2 className="truncate text-xs font-semibold">{selected.subject}</h2></div>
              <div className="flex items-center gap-2"><StatusBadge status={selected.status} />{selected.previewUrl && <a aria-label="Open Ethereal preview" href={selected.previewUrl} rel="noreferrer" target="_blank"><ExternalLink className="h-3.5 w-3.5 text-brand-600" /></a>}<MoreHorizontal className="h-4 w-4 text-muted" /></div>
            </header>
            <div className="mx-auto max-w-3xl px-8 py-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">{selected.recipient.charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{selected.recipient}</p><p className="mt-0.5 truncate text-[9px] text-muted">from {selected.sender}</p></div></div>
                <time className="shrink-0 text-[9px] text-muted">{formatDate(view === "scheduled" ? selected.scheduledAt : selected.sentAt)}</time>
              </div>
              <div className="mt-8 whitespace-pre-wrap text-xs leading-6 text-[#4d5350]">{selected.body}</div>
              {selected.status === "scheduled" && <div className="mt-8 flex items-center gap-2 rounded-md border-l-2 border-brand-500 bg-brand-50 px-3 py-2 text-[10px] text-brand-700"><Clock3 className="h-3.5 w-3.5" /> Scheduled for {formatDate(selected.scheduledAt)}</div>}
              {selected.failureReason && <div className="mt-8 rounded-md bg-red-50 p-3 text-[10px] text-red-700">{selected.failureReason}</div>}
            </div>
          </article>
        ) : (
          <div className="grid h-full place-items-center text-center"><div><span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-600"><MailCheck className="h-5 w-5" /></span><p className="text-xs font-semibold">Select an email</p><p className="mt-1 text-[10px] text-muted">Choose a message from the list to view it.</p></div></div>
        )}
      </main>

      <ComposeEmailModal config={config} onClose={() => setComposeOpen(false)} onError={(message) => setToast({ type: "error", message })} onScheduled={handleScheduled} open={composeOpen} user={user} />
      <Toast onClose={() => setToast(null)} toast={toast} />
    </div>
  );
}
