import { Card } from "../../../components/ui/Card";
import { formatCurrency, formatPercent } from "../../money/utils/format";
import type { GoalsSummary } from "../../../types/goals";
import { Target, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";

export function GoalsSummaryStrip({ summary }: { summary: GoalsSummary }) {
  const remaining = Math.max(0, Number(summary.total_target) - Number(summary.total_saved));
  const remainingLabel = Number.isFinite(remaining)
    ? formatCurrency(String(remaining))
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Goals Count */}
      <Card variant="surface" className="!p-5 flex items-center justify-between">
        <div>
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#6C7A70]">
            Active Targets
          </span>
          <div className="mt-1 font-sans text-2xl font-extrabold tracking-tight tabular-nums text-[#141C16]">
            {summary.total_goals}
          </div>
          <span className="font-sans text-[11px] text-[#6C7A70]">
            Tracked milestones
          </span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF3F0] text-[#141C16]">
          <Target className="h-5 w-5" />
        </div>
      </Card>

      {/* Total Target */}
      <Card variant="surface" className="!p-5 flex items-center justify-between">
        <div>
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#6C7A70]">
            Total Target
          </span>
          <div className="mt-1 font-sans text-2xl font-extrabold tracking-tight tabular-nums text-[#141C16]">
            {formatCurrency(summary.total_target)}
          </div>
          <span className="font-sans text-[11px] text-[#6C7A70]">
            Cumulative ambition
          </span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF3F0] text-[#6C7A70]">
          <Sparkles className="h-5 w-5" />
        </div>
      </Card>

      {/* Total Saved */}
      <Card variant="surface" className="!p-5 flex items-center justify-between">
        <div>
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#6C7A70]">
            Total Earmarked
          </span>
          <div className="mt-1 font-sans text-2xl font-extrabold tracking-tight tabular-nums text-[#22C55E]">
            {formatCurrency(summary.total_saved)}
          </div>
          <span className="font-sans text-[11px] text-[#6C7A70]">
            Funded across accounts
          </span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#16A34A]">
          <CheckCircle2 className="h-5 w-5" />
        </div>
      </Card>

      {/* Overall Progress */}
      <Card variant="surface" className="!p-5 flex items-center justify-between">
        <div>
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#6C7A70]">
            Overall Progress
          </span>
          <div className="mt-1 font-sans text-2xl font-extrabold tracking-tight tabular-nums text-[#141C16]">
            {formatPercent(summary.overall_progress_percentage)}
          </div>
          {remainingLabel && Number(summary.total_target) > 0 ? (
            <span className="font-sans text-[11px] text-[#6C7A70]">
              {remainingLabel} left
            </span>
          ) : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#121A15] text-[#22C55E]">
          <TrendingUp className="h-5 w-5" />
        </div>
      </Card>
    </div>
  );
}
