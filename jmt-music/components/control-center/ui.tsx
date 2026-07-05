import type { ReactNode } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";

/** Shared glass panel used throughout the Control Center. */
export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/8 bg-white/[0.035] shadow-2xl shadow-black/10 backdrop-blur-xl ${className}`}>{children}</section>;
}

/** Standard heading treatment for dashboard sections. */
export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div><h2 className="font-sans text-lg font-semibold tracking-tight text-white">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
      {action}
    </div>
  );
}

/** Page title, description, and optional action area. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-300">{eyebrow}</p><h1 className="font-sans text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{description}</p></div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

/** Compact health row with a semantic status indicator. */
export function StatusRow({ label, detail, healthy = true }: { label: string; detail: string; healthy?: boolean }) {
  return <div className="flex items-center justify-between gap-4 border-b border-white/6 py-4 last:border-0"><div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${healthy ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.7)]" : "bg-amber-400"}`} /><div><p className="text-sm font-medium text-slate-100">{label}</p><p className="text-xs text-slate-500">{detail}</p></div></div><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">{healthy ? "Healthy" : "Check"}</span></div>;
}

/** Consistent action link styled for primary administrative tasks. */
export function ActionButton({ children, href = "#", primary = false }: { children: ReactNode; href?: string; primary?: boolean }) {
  return <a href={href} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition hover:-translate-y-0.5 ${primary ? "border-sky-300 bg-sky-300 text-slate-950 hover:bg-sky-200" : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-sky-300/40 hover:bg-sky-300/10"}`}>{children}<ArrowUpRight className="h-4 w-4" /></a>;
}

/** Reusable empty state for future data-backed modules. */
export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-8 text-center"><div><p className="font-medium text-slate-200">{title}</p><p className="mt-2 max-w-sm text-sm text-slate-500">{message}</p></div></div>;
}

/** Reusable loading state for async modules introduced in later phases. */
export function LoadingState({ label = "Loading workspace" }: { label?: string }) {
  return <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin text-sky-300" />{label}</div>;
}
