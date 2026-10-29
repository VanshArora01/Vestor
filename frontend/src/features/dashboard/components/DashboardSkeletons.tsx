export function FinancialHeroSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse sm:p-8">
      <div className="h-3 w-32 rounded bg-slate-200" />
      <div className="mt-3 h-12 w-64 rounded bg-slate-200" />
      <div className="mt-8 border-t border-slate-100 pt-6">
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded bg-slate-200" />
          <div className="h-6 w-20 rounded bg-slate-200" />
        </div>
        <div className="mt-4 h-16 w-full rounded bg-slate-200" />
      </div>
    </div>
  );
}

export function InsightPanelSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-3 w-28 rounded bg-slate-200" />
      <div className="rounded-xl border border-slate-100 p-4 space-y-3">
        <div className="h-4 w-20 rounded bg-slate-200" />
        <div className="h-10 w-full rounded bg-slate-200" />
      </div>
    </div>
  );
}

export function MoneyFlowSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="h-3 w-16 rounded bg-slate-200" />
      </div>
      <div className="h-4 w-full rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="h-16 rounded bg-slate-200" />
        <div className="h-16 rounded bg-slate-200" />
        <div className="h-16 rounded bg-slate-200" />
        <div className="h-16 rounded bg-slate-200" />
      </div>
    </div>
  );
}

export function AllocationSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse space-y-6">
      <div className="h-4 w-36 rounded bg-slate-200" />
      <div className="flex flex-col items-center gap-4">
        <div className="h-32 w-32 rounded-full border-8 border-slate-100 bg-transparent" />
        <div className="h-4 w-full rounded bg-slate-200" />
      </div>
    </div>
  );
}

export function PerformanceSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-4 w-44 rounded bg-slate-200" />
        <div className="h-6 w-32 rounded bg-slate-200" />
      </div>
      <div className="h-56 w-full rounded bg-slate-200" />
    </div>
  );
}

export function GoalsSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse sm:p-8 space-y-6">
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="h-12 w-full rounded bg-slate-200" />
      <div className="space-y-2">
        <div className="h-16 w-full rounded bg-slate-200" />
        <div className="h-16 w-full rounded bg-slate-200" />
      </div>
    </div>
  );
}
