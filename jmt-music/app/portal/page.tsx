export default function PortalLandingPage() {
  return (
    <main className="min-h-screen bg-[#05070a] px-5 py-20 text-slate-100">
      <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#101722] p-8">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-300">JMT Music</p>
        <h1 className="mt-4 font-serif text-4xl">Client Portal</h1>
        <p className="mt-4 leading-7 text-slate-400">Your private portal is available through the secure project link sent by JMT Music.</p>
        <a className="mt-7 inline-flex rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold hover:border-sky-300/50" href="mailto:hello@jmtmusic.studio">Request a new link</a>
      </section>
    </main>
  );
}
