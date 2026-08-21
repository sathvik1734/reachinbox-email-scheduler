import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

interface FieldShellProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

function FieldShell({ label, htmlFor, hint, error, children }: FieldShellProps) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label className="text-sm font-semibold text-ink" htmlFor={htmlFor}>{label}</label>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function Input({
  label,
  hint,
  error,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & Omit<FieldShellProps, "htmlFor" | "children">) {
  const inputId = id ?? props.name;
  if (!inputId) throw new Error("Input requires id or name");
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error}>
      <input
        id={inputId}
        className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-ink placeholder:text-slate-400 transition focus:border-brand-500 ${error ? "border-red-400" : "border-line"} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export function Textarea({
  label,
  hint,
  error,
  id,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & Omit<FieldShellProps, "htmlFor" | "children">) {
  const inputId = id ?? props.name;
  if (!inputId) throw new Error("Textarea requires id or name");
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error}>
      <textarea
        id={inputId}
        className={`min-h-32 w-full resize-y rounded-lg border bg-white px-3.5 py-3 text-sm leading-6 text-ink placeholder:text-slate-400 transition focus:border-brand-500 ${error ? "border-red-400" : "border-line"} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}
