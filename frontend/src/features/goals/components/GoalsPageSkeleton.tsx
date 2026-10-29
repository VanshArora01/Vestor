export function GoalsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading goals">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100/80"
          />
        ))}
      </div>
      <div className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-100/80" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-slate-100/80" />
        <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-slate-100/80" />
      </div>
    </div>
  );
}
