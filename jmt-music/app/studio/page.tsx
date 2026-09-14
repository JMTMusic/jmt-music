import { LockKeyhole } from "lucide-react";
import { getControlCenterRole } from "@/lib/control-center/access";
import { CreateProjectForm } from "./create-project-form";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const isOwner = (await getControlCenterRole()) === "owner";

  return (
    <main className="min-h-screen bg-[#070b12] px-5 py-12 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-xl">
        <header className="border-b border-white/10 pb-7">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-sky-300"><LockKeyhole className="h-4 w-4" />JMT Music · Owner Studio</p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Create a client project</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Set up the client, project workflow, four delivery stages, and secure portal link in one step.</p>
        </header>
        {isOwner ? <CreateProjectForm /> : <p className="mt-8 rounded-xl border border-red-300/20 bg-red-300/5 p-5 text-sm text-red-200">This workspace is restricted to the owner account.</p>}
      </div>
    </main>
  );
}
