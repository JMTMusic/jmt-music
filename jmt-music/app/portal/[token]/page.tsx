import { notFound } from "next/navigation";
import { Download, ExternalLink, MessageSquare, ShieldCheck } from "lucide-react";
import { addPortalCommentAction, setPortalApprovalAction } from "./actions";
import { getClientPortalByToken } from "@/lib/client-portal/repository";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function ClientPortalPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ access?: string }> }) {
  const { token } = await params;
  const { access } = await searchParams;
  const accessToken = access || token;
  const result = await getClientPortalByToken(accessToken);
  if (result.status === "not_found" || result.status === "revoked") notFound();
  if (result.status === "error") {
    return <main className="min-h-screen bg-[#05070a] p-8 text-slate-100"><div className="mx-auto max-w-2xl rounded-xl border border-amber-300/20 bg-amber-300/5 p-6 text-amber-100">{result.message}</div></main>;
  }
  if (result.status !== "found") notFound();

  const { view } = result;
  const clientName = view.client.contactName || view.client.artistName || "Client";
  return (
    <main className="min-h-screen bg-[#05070a] px-5 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-300">JMT Music · Private Client Portal</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">{view.project.title}</h1><p className="mt-3 text-slate-400">Welcome, {clientName}. Files are managed by JMT Music and delivered from Google Drive.</p></div>
          <div className="flex flex-col items-end gap-3"><div className="flex items-center gap-2 text-xs text-emerald-300"><ShieldCheck className="h-4 w-4" />Private project access</div><a href={`/project-setup/${accessToken}`} className="text-xs font-semibold text-sky-300 hover:text-sky-200">Open project setup →</a></div>
        </header>

      <section className="py-8">
        <h2 className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Project progress</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">{view.stages.map((item) => <div key={item.stage} className="rounded-2xl border border-white/10 bg-[#101722] p-5"><p className="text-xs font-bold uppercase tracking-wider text-sky-300">{item.stage}</p><p className="mt-2 text-sm font-semibold capitalize text-slate-100">{item.status.replaceAll("_", " ")}</p>{item.clientNote && <p className="mt-2 text-xs leading-5 text-slate-400">{item.clientNote}</p>}</div>)}</div>
      </section>

      <section className="pb-8">
          <h2 className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Project files</h2>
          {view.files.length === 0 ? <div className="mt-4 rounded-2xl border border-white/10 bg-[#101722] p-8 text-slate-400">No files have been shared yet. JMT Music will add them here when they are ready.</div> : (
            <div className="mt-4 space-y-5">{view.files.map((file) => {
              const commentAction = addPortalCommentAction.bind(null, accessToken);
              const approvalAction = setPortalApprovalAction.bind(null, accessToken);
              return <article key={file.id} className="rounded-2xl border border-white/10 bg-[#101722] p-5 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-sky-300"><span>{file.fileType}</span>{file.versionLabel && <span>· {file.versionLabel}</span>}</div><h3 className="mt-2 font-serif text-2xl">{file.title}</h3>{file.note && <p className="mt-2 max-w-2xl text-sm text-slate-400">{file.note}</p>}<p className="mt-2 text-xs text-slate-600">Added {formatDate(file.createdAt)}</p></div>
                  <a href={file.driveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-300 px-4 text-sm font-semibold text-slate-950"><Download className="h-4 w-4" />Open in Drive<ExternalLink className="h-3.5 w-3.5" /></a>
                </div>
                {file.approval && <div className={`mt-5 rounded-xl border p-3 text-sm ${file.approval.status === "approved" ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-200" : "border-amber-300/20 bg-amber-300/5 text-amber-100"}`}>{file.approval.status === "approved" ? "Approved" : "Changes requested"} by {file.approval.clientName}{file.approval.note ? ` — ${file.approval.note}` : ""}</div>}
                <div className="mt-6 grid gap-5 border-t border-white/8 pt-5 lg:grid-cols-2">
                  <div><h4 className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-sky-300" />Comments</h4><div className="mt-3 space-y-2">{file.comments.map((comment) => <div key={comment.id} className="rounded-lg bg-white/[.035] p-3 text-sm"><p className="text-slate-300">{comment.body}</p><p className="mt-1 text-[11px] text-slate-600">{comment.authorName}{comment.timestampSeconds !== null ? ` · ${Math.floor(comment.timestampSeconds / 60)}:${String(comment.timestampSeconds % 60).padStart(2, "0")}` : ""}</p></div>)}</div>
                    <form action={commentAction} className="mt-3 grid gap-2"><input type="hidden" name="fileId" value={file.id} /><input name="authorName" required defaultValue={clientName} aria-label="Your name" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" /><textarea name="body" required maxLength={2000} placeholder="Leave a comment" className="min-h-24 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" /><input name="timestamp" type="number" min="0" placeholder="Optional timestamp in seconds" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" /><button className="justify-self-start rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold hover:border-sky-300/50">Add comment</button></form>
                  </div>
                  <form action={approvalAction} className="grid content-start gap-2"><h4 className="text-sm font-semibold">Review this file</h4><input type="hidden" name="fileId" value={file.id} /><input name="clientName" required defaultValue={clientName} aria-label="Your name" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" /><textarea name="note" maxLength={2000} placeholder="Optional review note" className="min-h-24 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" /><div className="flex flex-wrap gap-2"><button name="status" value="approved" className="rounded-lg bg-emerald-300 px-3 py-2 text-sm font-semibold text-slate-950">Approve</button><button name="status" value="changes_requested" className="rounded-lg border border-amber-300/30 px-3 py-2 text-sm font-semibold text-amber-100">Request changes</button></div></form>
                </div>
              </article>;
            })}</div>
          )}
        </section>
      </div>
    </main>
  );
}
