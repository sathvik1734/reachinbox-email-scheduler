import { ArrowRight, Mail } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M21.8 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-.9 6.8-2.3l-3.3-2.6c-.9.6-2.1 1-3.5 1a6 6 0 0 1-5.6-4.2H3v2.7A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.7Z" fill="#FBBC05" />
      <path d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7A6 6 0 0 1 12 5.9Z" fill="#EA4335" />
    </svg>
  );
}

export function LoginPage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate replace to="/dashboard" />;

  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfcfb] px-5">
      <section className="w-full max-w-[370px] rounded-lg border border-line bg-white px-9 py-10 shadow-[0_8px_32px_rgba(20,60,38,.05)]">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-5 grid h-11 w-11 place-items-center rounded-lg bg-brand-600 text-white"><Mail className="h-5 w-5" /></span>
          <h1 className="text-xl font-semibold text-ink">Login</h1>
          <p className="mt-2 text-xs leading-5 text-muted">Welcome to the email scheduler</p>
        </div>
        <a className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-50 text-sm font-medium text-brand-700 transition hover:bg-brand-100" href={api.loginUrl}>
          <GoogleMark /> Login with Google <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-line" /> secure oauth <span className="h-px flex-1 bg-line" /></div>
        <div className="space-y-3" aria-hidden="true">
          <div className="h-10 rounded-md bg-[#f5f8f6] px-3 py-3 text-[11px] text-slate-400">Email ID</div>
          <div className="h-10 rounded-md bg-[#f5f8f6] px-3 py-3 text-[11px] text-slate-400">Password</div>
          <div className="grid h-10 place-items-center rounded-md bg-brand-600 text-xs font-semibold text-white opacity-60">Login</div>
        </div>
        <p className="mt-6 text-center text-[10px] leading-4 text-muted">Google OAuth is the only active sign-in method. Password fields are shown only to mirror the supplied design.</p>
      </section>
    </main>
  );
}
