"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { status: "idle", message: "" };
const fieldClass = "min-h-11 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-blue-400/60";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="grid gap-1.5 text-xs text-slate-400">
        Username
        <input className={fieldClass} name="username" autoComplete="username" required autoFocus />
      </label>
      <label className="grid gap-1.5 text-xs text-slate-400">
        Password
        <input className={fieldClass} name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.message && <p className="text-xs text-red-300">{state.message}</p>}
      <button disabled={pending} className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-blue-400 px-4 text-sm font-medium text-[#04101f] hover:bg-blue-300 disabled:opacity-60">
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
        Sign in
      </button>
    </form>
  );
}
