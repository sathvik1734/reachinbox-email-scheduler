import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Bold, Image, Italic, Link2, List, Paperclip, Underline, UploadCloud } from "lucide-react";
import { api } from "../lib/api";
import { extractUniqueEmails } from "../lib/emailParser";
import type { SystemConfig, User } from "../types/api";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ComposeEmailModalProps {
  open: boolean;
  user: User;
  config: SystemConfig;
  onClose: () => void;
  onScheduled: (count: number, recovered: boolean) => void;
  onError: (message: string) => void;
}

function defaultStartTime() {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ComposeEmailModal({ open, user, config, onClose, onScheduled, onError }: ComposeEmailModalProps) {
  const [senderEmail, setSenderEmail] = useState(user.email);
  const [senderName, setSenderName] = useState(user.name);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [startAt, setStartAt] = useState(defaultStartTime);
  const [delaySeconds, setDelaySeconds] = useState(config.minSendDelayMs / 1000);
  const [hourlyLimit, setHourlyLimit] = useState(config.maxEmailsPerHourPerSender);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const estimatedFinish = useMemo(() => {
    if (recipients.length < 2 || !startAt) return null;
    return new Date(new Date(startAt).getTime() + (recipients.length - 1) * delaySeconds * 1000);
  }, [recipients.length, startAt, delaySeconds]);

  useEffect(() => {
    if (!open) {
      setErrors({});
      setDelaySeconds(config.minSendDelayMs / 1000);
      setHourlyLimit(config.maxEmailsPerHourPerSender);
    }
  }, [config.maxEmailsPerHourPerSender, config.minSendDelayMs, open]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setErrors((current) => ({ ...current, file: "Upload a .csv or .txt file" }));
      return;
    }
    const emails = extractUniqueEmails(await file.text());
    setRecipients(emails);
    setFileName(file.name);
    setErrors((current) => ({ ...current, file: emails.length ? "" : "No valid emails found" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!subject.trim()) next.subject = "Subject is required";
    if (!body.trim()) next.body = "Email body is required";
    if (!recipients.length) next.file = "Upload at least one email address";
    if (!startAt || new Date(startAt).getTime() < Date.now() - 60_000) next.startAt = "Choose a future start time";
    if (delaySeconds * 1000 < config.minSendDelayMs) next.delay = `Minimum ${config.minSendDelayMs / 1000} seconds`;
    if (hourlyLimit < 1 || hourlyLimit > config.maxEmailsPerHourPerSender) next.hourlyLimit = `Use 1–${config.maxEmailsPerHourPerSender}`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const response = await api.schedule({ senderEmail, senderName, subject: subject.trim(), body: body.trim(), recipients, startAt: new Date(startAt).toISOString(), delayMs: delaySeconds * 1000, hourlyLimit });
      onScheduled(response.campaign.recipientCount, response.campaign.queueState === "pending_recovery");
      setSubject(""); setBody(""); setRecipients([]); setFileName(""); setStartAt(defaultStartTime());
      if (fileRef.current) fileRef.current.value = "";
      onClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not schedule emails");
    } finally {
      setSubmitting(false);
    }
  };

  const lineInput = "h-9 w-full border-0 bg-transparent px-0 text-xs text-ink placeholder:text-slate-400 focus:outline-none";

  return (
    <Modal open={open} onClose={onClose} title="Compose New Email">
      <form onSubmit={handleSubmit}>
        <div className="grid min-h-[560px] lg:grid-cols-[1fr_250px]">
          <div className="px-7 py-5">
            <div className="grid grid-cols-[72px_1fr] items-center border-b border-line py-1.5">
              <label className="text-xs font-medium text-muted" htmlFor="senderEmail">From</label>
              <div className="flex gap-3"><input className={`${lineInput} max-w-40`} id="senderName" onChange={(event) => setSenderName(event.target.value)} value={senderName} /><input className={lineInput} id="senderEmail" onChange={(event) => setSenderEmail(event.target.value)} type="email" value={senderEmail} /></div>
            </div>
            <div className="grid min-h-12 grid-cols-[72px_1fr_auto] items-center border-b border-line py-1.5">
              <span className="text-xs font-medium text-muted">To</span>
              <div className="flex flex-wrap gap-1.5">
                {recipients.length ? <><span className="rounded-full border border-brand-100 bg-brand-50 px-2 py-1 text-[10px] font-medium text-brand-700">{recipients[0]}</span>{recipients.length > 1 && <span className="rounded-full border border-brand-100 px-2 py-1 text-[10px] text-brand-700">+{recipients.length - 1} more</span>}</> : <span className="text-[11px] text-slate-400">Upload recipients</span>}
              </div>
              <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline" onClick={() => fileRef.current?.click()} type="button"><UploadCloud className="h-3.5 w-3.5" /> Upload List</button>
              <input accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={(event) => void handleFile(event)} ref={fileRef} type="file" />
            </div>
            {errors.file && <p className="mt-1 text-[10px] text-red-600">{errors.file}</p>}
            {fileName && <p className="mt-1 text-[10px] text-muted">{fileName} · {recipients.length} unique addresses</p>}

            <div className="grid grid-cols-[72px_1fr] items-center border-b border-line py-1.5">
              <label className="text-xs font-medium text-muted" htmlFor="subject">Subject</label>
              <input className={lineInput} id="subject" maxLength={200} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" value={subject} />
            </div>
            {errors.subject && <p className="mt-1 text-[10px] text-red-600">{errors.subject}</p>}

            <div className="flex flex-wrap items-center gap-5 border-b border-line py-3">
              <label className="flex items-center gap-2 text-[10px] text-muted">Delay between emails <input className="h-7 w-16 rounded border border-line px-2 text-[11px] text-ink" min={config.minSendDelayMs / 1000} onChange={(event) => setDelaySeconds(Number(event.target.value))} step="0.1" type="number" value={delaySeconds} /> sec</label>
              <label className="flex items-center gap-2 text-[10px] text-muted">Hourly limit <input className="h-7 w-16 rounded border border-line px-2 text-[11px] text-ink" max={config.maxEmailsPerHourPerSender} min={1} onChange={(event) => setHourlyLimit(Number(event.target.value))} type="number" value={hourlyLimit} /></label>
            </div>
            {(errors.delay || errors.hourlyLimit) && <p className="mt-1 text-[10px] text-red-600">{errors.delay || errors.hourlyLimit}</p>}

            <div className="mt-4 overflow-hidden rounded-md border border-line">
              <div className="flex h-9 items-center gap-1 border-b border-line bg-[#fafcfb] px-2 text-muted">
                {[Bold, Italic, Underline, List, Link2, Image, Paperclip].map((Icon, index) => <button aria-label="Formatting control" className="rounded p-1.5 hover:bg-brand-50 hover:text-brand-600" key={index} type="button"><Icon className="h-3.5 w-3.5" /></button>)}
              </div>
              <textarea className="min-h-[280px] w-full resize-none border-0 px-4 py-3 text-xs leading-6 text-ink placeholder:text-slate-400 focus:outline-none" maxLength={50_000} onChange={(event) => setBody(event.target.value)} placeholder="Type Your Reply..." value={body} />
            </div>
            {errors.body && <p className="mt-1 text-[10px] text-red-600">{errors.body}</p>}
          </div>

          <aside className="border-l border-line bg-[#fbfcfb] px-5 py-6">
            <h3 className="text-xs font-semibold text-ink">Send Later</h3>
            <p className="mt-1 text-[10px] leading-4 text-muted">Pick a date and time for the first email.</p>
            <label className="mt-5 block text-[10px] font-medium text-muted" htmlFor="startAt">Start time</label>
            <input className="mt-2 h-9 w-full rounded-md border border-line bg-white px-2 text-[11px] text-ink" id="startAt" onChange={(event) => setStartAt(event.target.value)} type="datetime-local" value={startAt} />
            {errors.startAt && <p className="mt-1 text-[10px] text-red-600">{errors.startAt}</p>}
            <div className="mt-5 rounded-md border border-line bg-white p-3 text-[10px] leading-5 text-muted">
              <p><span className="font-semibold text-ink">Recipients:</span> {recipients.length}</p>
              <p><span className="font-semibold text-ink">Delay:</span> {delaySeconds}s</p>
              <p><span className="font-semibold text-ink">Hourly cap:</span> {hourlyLimit}</p>
              {estimatedFinish && <p><span className="font-semibold text-ink">Estimated finish:</span> {estimatedFinish.toLocaleString()}</p>}
            </div>
          </aside>
        </div>
        <footer className="flex justify-end gap-2 border-t border-line bg-white px-6 py-3">
          <Button onClick={onClose} type="button" variant="ghost">Cancel</Button>
          <Button loading={submitting} type="submit">Schedule</Button>
        </footer>
      </form>
    </Modal>
  );
}
