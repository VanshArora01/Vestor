import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { formatSignedInr, formatSignedPercent, toneClass, toneForNumber } from "../../invest/utils/format";

interface WhatChangedComparisonProps {
  spendingDiff: number | null;
  spendingDiffPct: number | null;
  incomeDiff: number | null;
  incomeDiffPct: number | null;
  surplusDiff: number | null;
  surplusDiffPct: number | null;
  portfolioDiff: number | null;
  portfolioDiffPct: number | null;
  goalsDiff: number | null;
}

export function WhatChangedComparison({
  spendingDiff,
  spendingDiffPct,
  incomeDiff,
  incomeDiffPct,
  surplusDiff,
  surplusDiffPct,
  portfolioDiff,
  portfolioDiffPct,
  goalsDiff,
}: WhatChangedComparisonProps) {
  
  const hasHistory =
    spendingDiff !== null ||
    incomeDiff !== null ||
    surplusDiff !== null ||
    portfolioDiff !== null ||
    goalsDiff !== null;

  if (!hasHistory) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <RefreshCw className="h-4.5 w-4.5 text-ink-500" />
          <h2 className="font-display text-lg font-semibold text-ink-950">Since Last Month</h2>
        </div>
        <p className="mt-4 text-center text-xs text-ink-400">
          Monthly recap data will populate here starting your second calendar month of tracking.
        </p>
      </section>
    );
  }

  // Define metric items list
  const metrics = [
    {
      label: "Monthly Income",
      value: incomeDiff,
      pct: incomeDiffPct,
      tone: toneForNumber(incomeDiff),
    },
    {
      label: "Monthly Spending",
      value: spendingDiff,
      pct: spendingDiffPct,
      // For spending, DOWN is good (green/up tone) and UP is bad (red/down tone)
      tone: spendingDiff !== null && spendingDiff !== 0 ? (spendingDiff < 0 ? "up" : "down") : "flat",
    },
    {
      label: "Monthly Cash Available",
      value: surplusDiff,
      pct: surplusDiffPct,
      tone: toneForNumber(surplusDiff),
    },
    {
      label: "Portfolio Valuation",
      value: portfolioDiff,
      pct: portfolioDiffPct,
      tone: toneForNumber(portfolioDiff),
    },
    {
      label: "Goal Accumulations",
      value: goalsDiff,
      pct: null,
      tone: toneForNumber(goalsDiff),
    },
  ].filter(m => m.value !== null && m.value !== 0);

  if (metrics.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <RefreshCw className="h-4.5 w-4.5 text-ink-500" />
          <h2 className="font-display text-lg font-semibold text-ink-950">Since Last Month</h2>
        </div>
        <p className="mt-4 text-center text-xs text-ink-400">
          No net balance changes detected since last month.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="changes-title">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <RefreshCw className="h-4.5 w-4.5 text-ink-500" />
        <div>
          <h2 id="changes-title" className="font-display text-lg font-semibold text-ink-950">
            Since Last Month
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">Recap of MoM balance changes</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 grid-cols-2 sm:grid-cols-5">
        {metrics.map((item, idx) => {
          const isUp = item.value !== null && item.value > 0;
          return (
            <div key={idx} className="rounded-xl border border-slate-50 bg-slate-50/20 p-3">
              <span className="text-[10px] font-medium text-ink-400 uppercase tracking-wide">{item.label}</span>
              <p className="mt-2 font-display text-lg font-bold tabular-nums text-ink-950">
                {formatSignedInr(item.value)}
              </p>
              
              <div className="mt-1 flex items-center gap-1 text-[10px]">
                {item.tone !== "flat" && (
                  <span>
                    {isUp ? (
                      <TrendingUp className={`h-3 w-3 ${item.tone === 'up' ? 'text-teal-700' : 'text-red-700'}`} />
                    ) : (
                      <TrendingDown className={`h-3 w-3 ${item.tone === 'up' ? 'text-teal-700' : 'text-red-700'}`} />
                    )}
                  </span>
                )}
                <span className={`font-semibold tabular-nums ${toneClass(item.tone as "flat" | "up" | "down")}`}>
                  {item.pct !== null ? formatSignedPercent(item.pct) : "change"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
