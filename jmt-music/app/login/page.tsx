import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-[#05070a] p-5 text-[#f4f7fb] [background-image:radial-gradient(900px_500px_at_72%_-10%,rgba(96,165,250,.14),transparent_66%)]">
      <div className="w-full max-w-[400px] rounded-[6px] border border-white/15 bg-[#101722] p-7">
        <span className="mb-4 grid h-[38px] w-[38px] place-items-center border border-[rgba(96,165,250,.65)] font-serif text-xs text-blue-400">JMT</span>
        <h1 className="font-serif text-[25px] font-normal leading-tight">Admin Login</h1>
        <p className="mb-5 mt-2 text-[13px] text-slate-400">Sign in to manage JMT Music.</p>
        <LoginForm next={next || "/dashboard"} />
        <div className="mt-4 border-t border-white/15 pt-3.5">
          <Link href="/" className="text-[11.5px] text-slate-500 hover:text-slate-300">&larr; Back to jmtmusic.studio</Link>
        </div>
      </div>
    </main>
  );
}
