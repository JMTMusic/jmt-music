import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/login/actions";

export function WorkspaceTopbar({ label = "Jonathan", showSignOut = false }: { label?: string; showSignOut?: boolean }) {
  const initials = label.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <div className="sticky top-0 z-20 border-b border-white/15 bg-[#080b10]/90 backdrop-blur-xl"><div className="mx-auto flex min-h-14 max-w-[1320px] items-center gap-3 px-5"><Link href="/studio" className="flex items-center gap-2.5 no-underline"><span className="grid h-7 w-7 place-items-center rounded-[5px] bg-blue-400 font-serif text-[10px] text-[#04101f]">JMT</span><strong className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-100">JMT Music</strong></Link><span className="ml-auto text-xs text-slate-400">{label}</span><span className="grid h-7 w-7 place-items-center rounded-full border border-white/25 bg-[#1c2431] text-[10px] font-semibold text-blue-200">{initials}</span>{showSignOut && <form action={logoutAction}><button className="text-xs text-slate-400 hover:text-slate-200">Sign out</button></form>}</div></div>;
}

export function WorkspaceShell({ children, label, showSignOut }: { children: ReactNode; label?: string; showSignOut?: boolean }) {
  return <main className="min-h-screen bg-[#05070a] text-[#f4f7fb] [background-image:radial-gradient(900px_500px_at_72%_-10%,rgba(96,165,250,.14),transparent_66%)]"><WorkspaceTopbar label={label} showSignOut={showSignOut} /><div className="mx-auto max-w-[1320px] px-5 pb-16">{children}</div></main>;
}

export const workspacePanel = "rounded-[6px] border border-white/15 bg-[#101722]";
export const workspaceEyebrow = "text-[10.5px] font-medium uppercase tracking-[.16em] text-[#7c8794]";
