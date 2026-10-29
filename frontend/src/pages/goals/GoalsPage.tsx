import { useMemo, useState } from "react";
import { CreateGoalModal } from "../../features/goals/components/CreateGoalModal";
import { GoalCard } from "../../features/goals/components/GoalCard";
import { GoalDetailPanel } from "../../features/goals/components/GoalDetailPanel";
import { GoalInsightCard } from "../../features/goals/components/GoalInsightCard";
import { GoalsEmptyState } from "../../features/goals/components/GoalsEmptyState";
import { GoalsPageSkeleton } from "../../features/goals/components/GoalsPageSkeleton";
import { GoalsSummaryStrip } from "../../features/goals/components/GoalsSummaryStrip";
import { useGoal, useGoalMutations, useGoals } from "../../features/goals/hooks/useGoals";
import { buildStaticGoalInsight } from "../../features/goals/utils/buildStaticGoalInsight";
import type { Goal } from "../../types/goals";
import { useRegisterPageContext } from "../../context/PageContext";
import { Plus, RefreshCcw } from "lucide-react";

export function GoalsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch, isFetching } = useGoals();
  const { data: selectedGoal } = useGoal(selectedGoalId);
  const { create, contribute, archive } = useGoalMutations();

  const activeGoals = data?.goals.filter((goal: Goal) => goal.status === "active") ?? [];
  const completedGoals =
    data?.goals.filter((goal: Goal) => goal.status === "completed") ?? [];

  useRegisterPageContext({
    page: "goals",
    route_title: "Savings Goals",
    selected_item_id: selectedGoalId || undefined,
    selected_item_name: selectedGoal?.name,
    metadata: {
      totalGoals: data?.goals?.length ?? 0,
      activeGoalsCount: activeGoals.length,
      completedGoalsCount: completedGoals.length,
      selectedGoalTarget: selectedGoal ? Number(selectedGoal.target_amount) : 0,
      selectedGoalProgress: selectedGoal ? Number(selectedGoal.current_amount) : 0,
    },
    suggestedPrompts: selectedGoal
      ? [
          `How much more do I need to reach my ${selectedGoal.name} goal?`,
          "Is this goal's balance backed by a connected bank account?",
          "How does a Money Plan allocation toward this goal work?",
        ]
      : [
          "How much more do I need to reach my active targets?",
          "Explain the difference between real bank accounts and virtual goal earmarks",
          "What is an ideal target for an emergency fund?",
        ],
  });

  const insight = useMemo(
    () => (data?.goals ? buildStaticGoalInsight(data.goals) : null),
    [data?.goals],
  );

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-[#141C16]">
            Savings Goals
          </h1>
          <p className="font-sans text-xs text-[#6C7A70] mt-0.5">
            Turn your money into measurable targets with account-backed reserve earmarks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#121A15] hover:bg-[#1E2922] px-4 py-2.5 font-sans text-xs font-bold text-[#22C55E] shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Goal</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <GoalsPageSkeleton />
      ) : isError ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50/50 p-8 text-center">
          <p className="font-sans text-sm font-bold text-rose-800">Failed to load goals</p>
          <p className="mt-1 font-sans text-xs text-rose-600">
            Check your network connection and try again.
          </p>
          <button
            type="button"
            disabled={isFetching}
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#121A15] text-white px-4 py-2 font-sans text-xs font-bold transition hover:bg-[#1E2922]"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <>
          {data?.summary ? <GoalsSummaryStrip summary={data.summary} /> : null}

          {insight ? <GoalInsightCard insight={insight} /> : null}

          {activeGoals.length === 0 && completedGoals.length === 0 ? (
            <GoalsEmptyState onCreate={() => setIsCreateOpen(true)} />
          ) : (
            <div className="space-y-6">
              {activeGoals.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-[#6C7A70]">
                      Active Targets ({activeGoals.length})
                    </h2>
                    <span className="font-sans text-xs text-[#6C7A70]">
                      Live Progress
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {activeGoals.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} onSelect={setSelectedGoalId} />
                    ))}
                  </div>
                </div>
              )}

              {completedGoals.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-[#6C7A70]">
                      Completed Milestones ({completedGoals.length})
                    </h2>
                    <span className="font-sans text-xs text-[#22C55E] font-bold">
                      100% Achieved
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {completedGoals.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} onSelect={setSelectedGoalId} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <CreateGoalModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={(payload) => create.mutateAsync(payload)}
      />

      {selectedGoal && (
        <GoalDetailPanel
          goal={selectedGoal}
          onClose={() => setSelectedGoalId(null)}
          onContribute={(amount) =>
            contribute.mutateAsync({ goalId: selectedGoal.id, payload: { amount } })
          }
          onArchive={async () => {
            await archive.mutateAsync(selectedGoal.id);
            setSelectedGoalId(null);
          }}
        />
      )}
    </div>
  );
}
