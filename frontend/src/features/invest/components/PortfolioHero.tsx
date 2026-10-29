import type { InvestSummary, Holding } from "../../../types/invest";
import {
  formatInr,
  formatSignedInr,
  formatSignedPercent,
} from "../utils/format";
import { TrendingUp, AlertCircle, ShieldCheck } from "lucide-react";

interface PortfolioHeroProps {
  summary: InvestSummary;
  holdings: Holding[];
  lastUpdatedAt?: string | null;
}

export function PortfolioHero({ summary, holdings, lastUpdatedAt }: PortfolioHeroProps) {
  const isPositive = Number(summary.absolute_gain_loss ?? 0) >= 0;
  const timestamp = lastUpdatedAt ?? holdings
    .filter((holding) => holding.price_status === "fresh")
    .map((holding) => holding.price_fetched_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
      {/* Obsidian Black Portfolio Value Hero */}
      <div className="lg:col-span-7 rounded-[28px] bg-[#121A15] p-6 lg:p-7 text-white shadow-sm flex flex-col justify-between min-h-[220px]">

        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[#B8C8BF]">
                Current Portfolio Value
              </span>
            </div>
            <div className="mt-2.5 font-sans text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight tabular-nums text-white">
              {summary.current_value != null ? formatInr(summary.current_value) : "Unavailable"}
            </div>
            <p className="mt-2 text-xs text-[#B8C8BF]">
              {summary.valuation_complete
                ? `${summary.valued_holdings} of ${summary.total_holdings} holdings valued`
                : `${summary.valued_holdings} of ${summary.total_holdings} holdings valued · partial total`}
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-[#22C55E] border border-white/10">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs text-[#B8C8BF]">
          <div className="flex items-center gap-3">
            {summary.absolute_gain_loss != null && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-sans font-bold tabular-nums ${
                    isPositive ? "text-[#22C55E]" : "text-rose-400"
                  }`}
                >
                  {formatSignedInr(summary.absolute_gain_loss)} ({formatSignedPercent(summary.return_pct)})
                </span>
                <span className="text-[#B8C8BF]">on valued holdings</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#B8C8BF]">
            <span>{timestamp ? `Updated ${new Date(timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : "No price update yet"}</span>
          </div>
        </div>
      </div>

      {/* Invested vs Returns Split Card */}
      <div className="lg:col-span-3 rounded-[28px] bg-white border border-[#DCE4DF] p-6 shadow-sm flex flex-col justify-between">
        <div>
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#6C7A70]">
            Invested Capital
          </span>

          <div className="mt-4 space-y-4">
            <div>
              <span className="font-sans text-xs text-[#6C7A70]">Recorded cost basis</span>
              <div className="font-sans text-2xl font-bold tracking-tight tabular-nums text-[#141C16] mt-0.5">
                {formatInr(summary.total_invested)}
              </div>
            </div>

            <div className="pt-3 border-t border-[#DCE4DF]">
              <span className="font-sans text-xs text-[#6C7A70]">Valuation Completeness</span>
              <div className="flex items-center gap-2 mt-1">
                {summary.valuation_complete ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#16A34A]">
                    <ShieldCheck className="h-4 w-4" />
                  <span>All holdings valued</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                  <span>{summary.unvalued_holdings} without valuation · {summary.stale_holdings} stale</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#DCE4DF] flex items-center justify-between text-xs text-[#6C7A70]">
          <span>Tracked Assets</span>
          <span className="font-bold text-[#141C16]">{summary.total_holdings} Instruments</span>
        </div>
      </div>
    </div>
  );
}
