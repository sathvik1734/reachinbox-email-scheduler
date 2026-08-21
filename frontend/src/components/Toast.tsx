import { CheckCircle2, CircleAlert, X } from "lucide-react";

export interface ToastState {
  message: string;
  type: "success" | "error";
}

export function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;
  const Icon = toast.type === "success" ? CheckCircle2 : CircleAlert;
  return (
    <div className={`fixed bottom-5 right-5 z-[60] flex max-w-sm items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-modal ${toast.type === "success" ? "border-emerald-200" : "border-red-200"}`} role="status">
      <Icon className={`h-5 w-5 shrink-0 ${toast.type === "success" ? "text-emerald-600" : "text-red-600"}`} />
      <p className="text-sm font-medium text-ink">{toast.message}</p>
      <button aria-label="Dismiss message" className="ml-2 text-muted hover:text-ink" onClick={onClose}><X className="h-4 w-4" /></button>
    </div>
  );
}
