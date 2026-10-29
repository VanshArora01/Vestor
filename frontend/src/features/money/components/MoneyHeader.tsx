export function MoneyHeader() {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#141C16]">
          Transactions & Money Plan
        </h1>
        <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-bold text-[#16A34A]">
          Active
        </span>
      </div>
      <p className="font-sans text-xs sm:text-sm text-[#6C7A70]">
        Reconcile verified bank spending and plan your take-home cash flow
      </p>
    </div>
  );
}
