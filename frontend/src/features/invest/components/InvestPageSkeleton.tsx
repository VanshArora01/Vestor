export function InvestPageSkeleton() {
  return (
    <div className="space-y-10 animate-pulse" aria-hidden>
      <div className="flex justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="space-y-2">
          <div className="h-9 w-40 rounded bg-slate-100" />
          <div className="h-4 w-72 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-slate-100" />
      </div>
      <div className="space-y-4 border-b border-slate-100 pb-8">
        <div className="h-3 w-24 rounded bg-slate-100" />
        <div className="h-14 w-56 rounded bg-slate-100" />
        <div className="grid grid-cols-3 gap-6">
          <div className="h-12 rounded bg-slate-100" />
          <div className="h-12 rounded bg-slate-100" />
          <div className="h-12 rounded bg-slate-100" />
        </div>
      </div>
      <div className="grid gap-10 lg:grid-cols-5">
        <div className="h-72 rounded-lg bg-slate-100 lg:col-span-3" />
        <div className="h-72 rounded-lg bg-slate-100 lg:col-span-2" />
      </div>
    </div>
  );
}
