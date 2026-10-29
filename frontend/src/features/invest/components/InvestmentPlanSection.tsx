import { Link } from "react-router-dom";
import type { InvestPlan } from "../../../types/invest";
import { formatCurrency, formatMonthLabel } from "../../money/utils/format";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface InvestmentPlanSectionProps {
  plan: InvestPlan;
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onAdd: () => void;
}

function ProgressBar({ pct, over }: { pct: number; over: boolean }) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EFF3F0]">
      <div
        className={`h-full rounded-full transition-all ${
          over ? "bg-amber-500" : "bg-[#22C55E]"
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function InvestmentPlanSection({
  plan,
  year,
  month,
  onPrev,
  onNext,
  onAdd,
}: InvestmentPlanSectionProps) {
  const planned = Number(plan.totals.planned);
  const actual = Number(plan.totals.actual);
  const hasPlan = planned > 0;
  const hasActual = actual > 0;

  return (
    <div className="rounded-[28px] bg-white border border-[#DCE4DF] p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#DCE4DF]">
        <div>
          <h3 className="font-sans text-base font-bold text-[#141C16]">
            Monthly Investment Plan
          </h3>
          <p className="font-sans text-xs text-[#6C7A70] mt-0.5">
            Compare planned SIPs & capital contributions with executed orders
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-[#DCE4DF] bg-[#EFF3F0] p-1 shadow-xs">
          <button
            type="button"
            aria-label="Previous month"
            onClick={onPrev}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#6C7A70] hover:bg-white hover:text-[#141C16] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[7rem] text-center font-sans text-xs font-bold text-[#141C16]">
            {formatMonthLabel(year, month)}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={onNext}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#6C7A70] hover:bg-white hover:text-[#141C16] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!hasPlan ? (
        <div className="rounded-[22px] border border-dashed border-[#DCE4DF] p-8 text-center space-y-2">
          <p className="font-sans text-sm font-bold text-[#141C16]">
            No investment allocation planned for {formatMonthLabel(year, month)}
          </p>
          <p className="font-sans text-xs text-[#6C7A70] max-w-sm mx-auto">
            Commit capital to Stocks or Mutual Funds in your Money Plan to track automated execution here.
          </p>
          <div className="pt-2">
            <Link
              to={`/money?year=${year}&month=${month}`}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#121A15] hover:bg-[#1E2922] text-[#22C55E] px-4 py-2 font-sans text-xs font-bold transition-all shadow-sm"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Configure in Money Plan</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-[22px] bg-[#EFF3F0]/50 border border-[#DCE4DF] p-4">
              <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#6C7A70]">
                Planned Outflow
              </span>
              <p className="mt-1 font-sans text-xl font-bold tabular-nums text-[#141C16]">
                {formatCurrency(plan.totals.planned)}
              </p>
            </div>

            <div className="rounded-[22px] bg-[#EFF3F0]/50 border border-[#DCE4DF] p-4">
              <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#6C7A70]">
                Actually Invested
              </span>
              <p className="mt-1 font-sans text-xl font-bold tabular-nums text-[#22C55E]">
                {formatCurrency(plan.totals.actual)}
              </p>
            </div>

            <div className="rounded-[22px] bg-[#EFF3F0]/50 border border-[#DCE4DF] p-4">
              <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#6C7A70]">
                Remaining Target
              </span>
              <p className="mt-1 font-sans text-xl font-bold tabular-nums text-[#141C16]">
                {formatCurrency(plan.totals.remaining)}
              </p>
            </div>
          </div>

          {!hasActual && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-amber-50/70 border border-amber-200 p-4">
              <p className="font-sans text-xs text-amber-900 font-semibold">
                No purchases recorded for this month yet.
              </p>
              <button
                type="button"
                onClick={onAdd}
                className="flex items-center gap-1.5 rounded-xl bg-[#121A15] text-[#22C55E] hover:bg-[#1E2922] px-3.5 py-1.5 font-sans text-xs font-bold transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Investment</span>
              </button>
            </div>
          )}

          <div className="space-y-4 pt-1">
            {plan.categories.map((cat) => {
              const pct = Number(cat.percentage_of_plan ?? 0);
              const over = Number(cat.over_invested) > 0;
              return (
                <div
                  key={cat.category_slug}
                  className="rounded-[20px] bg-[#EFF3F0]/30 border border-[#DCE4DF] p-4 space-y-2"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-sans text-xs font-bold text-[#141C16]">
                      {cat.category}
                    </span>
                    <span className="font-sans text-xs tabular-nums text-[#141C16] font-semibold">
                      {formatCurrency(cat.actual)}{" "}
                      <span className="text-[#6C7A70] font-normal">
                        / {formatCurrency(cat.planned)}
                      </span>
                    </span>
                  </div>

                  <ProgressBar pct={over ? 100 : pct} over={over} />

                  <div className="flex justify-between text-[11px] font-sans text-[#6C7A70]">
                    <span className="font-semibold">
                      {over
                        ? `+${formatCurrency(cat.over_invested)} over plan`
                        : cat.status === "complete"
                        ? "100% Executed"
                        : cat.status === "not_started"
                        ? "Not started"
                        : `${pct.toFixed(0)}% fulfilled`}
                    </span>
                    {!over && Number(cat.remaining) > 0 && (
                      <span>{formatCurrency(cat.remaining)} remaining</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
