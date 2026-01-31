export default function AdminLoading() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="h-5 w-32 rounded-full bg-slate-100"></div>
        <div className="mt-4 h-8 w-56 rounded-xl bg-slate-100"></div>
        <div className="mt-2 h-4 w-96 max-w-full rounded-lg bg-slate-100"></div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-20 rounded-2xl bg-slate-100"></div>
          ))}
        </div>

        <div className="mt-8 h-10 rounded-xl bg-slate-100"></div>
        <div className="mt-6 h-64 rounded-2xl bg-slate-50"></div>
      </div>
    </section>
  );
}
