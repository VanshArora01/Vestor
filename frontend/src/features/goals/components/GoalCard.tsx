import { formatCurrency, formatPercent } from "../../money/utils/format";
import type { Goal } from "../../../types/goals";
import { MiniProgressRing } from "./MiniProgressRing";
import { PaceStatusBadge } from "./PaceStatusBadge";
import { Building2, Calendar, ChevronRight } from "lucide-react";

interface GoalCardProps {
  goal: Goal;
  onSelect: (goalId: string) => void;
}

export function GoalCard({ goal, onSelect }: GoalCardProps) {
  const progress = Number(goal.metrics.progress_percentage);
  const deadline = new Date(goal.deadline);

  return (
    <button
      type="button"
      onClick={() => onSelect(goal.id)}
      className="group flex h-full w-full flex-col justify-between rounded-[26px] bg-white border border-[#DCE4DF] p-6 text-left transition-all hover:border-[#22C55E]/50 hover:shadow-md focus:outline-none"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#6C7A70]">
              Goal
            </span>
            <h3 className="truncate font-sans text-base font-bold text-[#141C16] group-hover:text-[#22C55E] transition-colors mt-0.5">
              {goal.name}
            </h3>
            <div className="flex items-center gap-1.5 font-sans text-xs text-[#6C7A70] mt-1">
              <Calendar className="h-3 w-3" />
              <span>
                Target: {deadline.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <PaceStatusBadge status={goal.metrics.pace_status} />
            <MiniProgressRing percentage={progress} />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className="font-sans text-xl font-extrabold tabular-nums text-[#141C16]">
              {formatCurrency(goal.current_amount)}
              <span className="ml-1 font-sans text-xs font-semibold text-[#6C7A70]">
                / {formatCurrency(goal.target_amount)}
              </span>
            </div>
            <span className="font-sans text-xs font-bold tabular-nums text-[#22C55E]">
              {formatPercent(goal.metrics.progress_percentage)}
            </span>
          </div>

          {/* FinAI Neon Progress Track */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFF3F0]">
            <div
              className="h-full rounded-full bg-[#22C55E] transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-sans text-[#6C7A70] pt-1">
            <span>{formatCurrency(goal.metrics.remaining_amount)} to go</span>
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span className="truncate max-w-[140px]">
                {goal.linked_account ? goal.linked_account.institution_name : "Cash Earmark"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-[#DCE4DF] flex items-center justify-between font-sans text-xs font-bold text-[#141C16] group-hover:text-[#22C55E] transition-colors">
        <span>Manage Earmarks</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}
