import type { ComparisonResponse } from "../../../types/money";
import { formatCurrency, formatMonthLabel, formatPercent } from "../utils/format";
import { ArrowUpRight, ArrowDownRight, Minus, Calendar } from "lucide-react";

interface MonthComparisonProps {
  comparison: ComparisonResponse | null;
  onGoToPreviousMonth?: () => void;
}

export function MonthComparison({ comparison, onGoToPreviousMonth }: MonthComparisonProps) {
  if (!comparison || !comparison.previous_year || !comparison.previous_month) {
    return (
      <div className="rounded-[28px] border border-[#DCE4DF] bg-white p-6 shadow-sm">
        <h3 className="font-sans text-sm font-bold text-[#141C16]">Month Comparison</h3>
        <p className="mt-1 font-sans text-xs text-[#6C7A70]">
          Complete previous monthly records to activate automated month-over-month reconciliation.
        </p>
        {onGoToPreviousMonth && (
          <button
            type="button"
            onClick={onGoToPreviousMonth}
            className="mt-3 font-sans text-xs font-bold text-[#22C55E] hover:underline"
          >
            ← Go to previous month
          </button>
        )}
      </div>
    );
  }

  const { changes, current, previous } = comparison.comparison;
  const fromLabel = formatMonthLabel(comparison.previous_year, comparison.previous_month);
  const toLabel = formatMonthLabel(comparison.year, comparison.month);

  const rows: Array<{
    label: string;
    metric: "income" | "spending" | "surplus";
    prev: string | null;
    curr: string | null;
    change: string | null;
    pct: string | null;
  }> = [
    {
      label: "Income",
      metric: "income",
      prev: previous.income,
      curr: current.income,
      change: changes.income,
      pct: changes.income_pct,
    },
    {
      label: "Spending",
      metric: "spending",
      prev: previous.spending,
      curr: current.spending,
      change: changes.spending,
      pct: changes.spending_pct,
    },
    {
      label: "Money Available",
      metric: "surplus",
      prev: previous.surplus,
      curr: current.surplus,
      change: changes.surplus,
      pct: changes.surplus_pct,
    },
  ];

  return (
    <div className="rounded-[28px] border border-[#DCE4DF] bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#DCE4DF]">
        <div>
          <h3 className="font-sans text-base font-bold text-[#141C16]">Month-over-Month Comparison</h3>
          <p className="font-sans text-xs text-[#6C7A70] mt-0.5">
            Comparing {fromLabel} with {toLabel}
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-[#EFF3F0] px-3 py-1 font-sans text-xs font-semibold text-[#141C16]">
          <Calendar className="h-3.5 w-3.5 text-[#6C7A70]" />
          <span>MoM Flow</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rows.map((row) => {
          const numChange = Number(row.change ?? 0);
          const isPositive = numChange > 0;
          const isZero = numChange === 0;

          return (
            <div
              key={row.label}
              className="rounded-[22px] bg-[#EFF3F0]/50 border border-[#DCE4DF] p-4 flex flex-col justify-between"
            >
              <div>
                <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#6C7A70]">
                  {row.label}
                </span>
                <div className="mt-1 font-sans text-xl font-bold tracking-tight tabular-nums text-[#141C16]">
                  {formatCurrency(row.curr)}
                </div>
                <div className="font-sans text-[11px] text-[#6C7A70] mt-0.5">
                  Previous: {formatCurrency(row.prev)}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#DCE4DF] flex items-center justify-between text-xs font-bold">
                <span className="text-[#6C7A70] font-normal">Change</span>
                <div
                  className={`flex items-center gap-1 ${
                    isZero
                      ? "text-[#6C7A70]"
                      : row.metric === "spending"
                      ? isPositive
                        ? "text-rose-600"
                        : "text-[#16A34A]"
                      : isPositive
                      ? "text-[#16A34A]"
                      : "text-rose-600"
                  }`}
                >
                  {isZero ? (
                    <Minus className="h-3.5 w-3.5" />
                  ) : isPositive ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  <span>{formatCurrency(row.change)}</span>
                  {row.pct && <span>({formatPercent(row.pct)})</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
