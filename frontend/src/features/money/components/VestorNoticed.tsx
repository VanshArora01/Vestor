import { useState } from "react";
import type { InsightSignal } from "../../../types/money";
import { formatCurrency } from "../utils/format";
import { Sparkles, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface VestorNoticedProps {
  insights: InsightSignal[];
}

function InsightItem({ insight }: { insight: InsightSignal }) {
  const change = insight.data?.change;
  const changeLabel = change ? formatCurrency(change) : null;
  const headline =
    insight.type === "category_spending_increased" && insight.data?.category_name
      ? `${insight.data.category_name} spending increased`
      : insight.message.split(".")[0];

  const isAlert = insight.severity === "high";

  return (
    <li className="flex flex-col justify-between rounded-[22px] bg-white border border-[#DCE4DF] p-4 shadow-[0_2px_8px_rgba(20,28,22,0.02)] transition-all hover:border-[#22C55E]/40">
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
            isAlert ? "bg-rose-50 text-rose-600" : "bg-[#DCFCE7] text-[#16A34A]"
          }`}
        >
          {isAlert ? <AlertCircle className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
        </div>
        <div>
          <h4 className="font-sans text-xs font-bold text-[#141C16] leading-snug">
            {headline}
          </h4>
          <p className="mt-1 font-sans text-[11px] text-[#6C7A70] leading-relaxed">
            {changeLabel ? `${changeLabel} vs last month` : insight.message}
          </p>
        </div>
      </div>
    </li>
  );
}

export function VestorNoticed({ insights }: VestorNoticedProps) {
  const [expanded, setExpanded] = useState(false);
  if (insights.length === 0) return null;
  const visible = expanded ? insights : insights.slice(0, 3);

  return (
    <section className="space-y-3" aria-labelledby="vestor-noticed-heading">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#121A15] text-[#22C55E]">
            <Sparkles className="h-3 w-3" />
          </div>
          <h3 id="vestor-noticed-heading" className="font-sans text-xs font-bold uppercase tracking-wider text-[#141C16]">
            Worth noting
          </h3>
          <span className="font-sans text-[11px] text-[#6C7A70]">
            · Data verified patterns
          </span>
        </div>

        {insights.length > 3 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 font-sans text-xs font-semibold text-[#141C16] hover:text-[#22C55E] transition-colors"
          >
            <span>{expanded ? "Show less" : "Show all observations"}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((insight) => (
            <InsightItem key={`${insight.type}-${insight.message}`} insight={insight} />
          ))}
        </ul>
      }
    </section>
  );
}
