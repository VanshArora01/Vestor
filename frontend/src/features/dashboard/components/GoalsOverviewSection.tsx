import { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import type { Goal, GoalsSummary } from "../../../types/goals";
import { formatCurrency } from "../../money/utils/format";

interface GoalsOverviewSectionProps {
  goals: Goal[];
  summary: GoalsSummary | null;
  onSelectGoal: (goalId: string) => void;
}

export function GoalsOverviewSection({ goals, summary, onSelectGoal }: GoalsOverviewSectionProps) {
  const sortedGoals = useMemo(() => {
    return [...goals]
      .filter((g) => g.status === "active")
      .sort((a, b) => {
        const aPct = Number(a.metrics.progress_percentage);
        const bPct = Number(b.metrics.progress_percentage);

        // 1. Closest to completion (highest percentage under 100)
        const aUnder100 = aPct < 100;
        const bUnder100 = bPct < 100;
        if (aUnder100 && !bUnder100) return -1;
        if (!aUnder100 && bUnder100) return 1;

        if (aUnder100 && bUnder100) {
          if (bPct !== aPct) return bPct - aPct;
        }

        // 2. Behind pace status has priority
        const paceOrder: Record<string, number> = { BEHIND: 0, ON_TRACK: 1, COMPLETED: 2 };
        const aPace = paceOrder[a.metrics.pace_status] ?? 3;
        const bPace = paceOrder[b.metrics.pace_status] ?? 3;
        if (aPace !== bPace) return aPace - bPace;

        // 3. Fallback: earlier deadline first
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      })
      .slice(0, 3); // Take top 3
  }, [goals]);

  const overallProgress = summary ? Number(summary.overall_progress_percentage) : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="goals-landscape-title">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 id="goals-landscape-title" className="font-display text-lg font-semibold text-ink-950">
            Goals Progress
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">Target metrics and milestone deadlines</p>
        </div>
        <RouterLink
          to="/goals"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-teal-800"
        >
          <span>Goals Page</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </RouterLink>
      </div>

      {goals.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-500">
          <p className="font-medium text-ink-700">No active goals yet</p>
          <RouterLink
            to="/goals"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ink-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-900"
          >
            <span>Create Goal</span>
          </RouterLink>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Header composition visual goals metrics */}
          <div className="rounded-xl bg-slate-50/50 p-4 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Total Saved Targets</span>
            <div className="mt-1 flex items-baseline justify-between">
              <p className="font-display text-2xl font-bold tabular-nums text-ink-950">
                {summary ? formatCurrency(summary.total_saved) : "—"}
                <span className="ml-1 text-xs font-normal text-ink-500">
                  of {summary ? formatCurrency(summary.total_target) : "—"}
                </span>
              </p>
              <span className="text-sm font-bold tabular-nums text-accent">{overallProgress.toFixed(0)}%</span>
            </div>
            
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* List of active targets */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Top Active Goals</span>
            
            <div className="space-y-3">
              {sortedGoals.map((goal) => {
                const pct = Number(goal.metrics.progress_percentage);
                const deadline = new Date(goal.deadline);

                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => onSelectGoal(goal.id)}
                    className="w-full rounded-xl border border-slate-100 p-4 text-left transition hover:border-teal-100 hover:bg-slate-50/20"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink-950 truncate">{goal.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        goal.metrics.pace_status === "BEHIND"
                          ? "bg-red-50 text-red-700"
                          : "bg-teal-50 text-teal-800"
                      }`}>
                        {goal.metrics.pace_status.toLowerCase().replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between text-xs text-ink-500">
                      <span className="font-semibold tabular-nums text-ink-900">
                        {formatCurrency(goal.current_amount)}
                        <span className="font-normal text-ink-500"> / {formatCurrency(goal.target_amount)}</span>
                      </span>
                      <span className="font-bold tabular-nums text-accent">{pct.toFixed(0)}%</span>
                    </div>

                    {/* Progress Rail bar */}
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-ink-400">
                      <Calendar className="h-3 w-3" />
                      <span>Target: {deadline.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
