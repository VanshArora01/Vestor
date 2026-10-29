import { CheckCircle2, Circle, Trophy } from "lucide-react";

interface MilestonesListProps {
  totalGoals: number;
  totalTransactions: number;
  hasIncome: boolean;
  portfolioVal: number;
  emergencySaved: number;
  emergencyTarget: number;
}

export function MilestonesList({
  totalGoals,
  totalTransactions,
  hasIncome,
  portfolioVal,
  emergencySaved,
  emergencyTarget,
}: MilestonesListProps) {
  const milestones = [
    {
      id: "first_income",
      label: "First income tracked",
      completed: hasIncome,
    },
    {
      id: "first_goal",
      label: "First goal created",
      completed: totalGoals > 0,
    },
    {
      id: "first_invest",
      label: "First investment logged",
      completed: totalTransactions > 0,
    },
    {
      id: "invest_10k",
      label: "₹10K portfolio value reached",
      completed: portfolioVal >= 10000,
    },
    {
      id: "invest_1l",
      label: "₹1L portfolio value reached",
      completed: portfolioVal >= 100000,
    },
    {
      id: "ef_target",
      label: "Emergency fund target reached",
      completed: emergencyTarget > 0 && emergencySaved >= emergencyTarget,
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="milestones-title">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <Trophy className="h-4.5 w-4.5 text-accent" />
        <div>
          <h2 id="milestones-title" className="font-display text-lg font-semibold text-ink-950">
            Your Progress
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">Tracked financial milestones</p>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-center gap-3 text-xs">
            <span className={`shrink-0 ${m.completed ? "text-accent" : "text-ink-300"}`}>
              {m.completed ? (
                <CheckCircle2 className="h-4.5 w-4.5" />
              ) : (
                <Circle className="h-4.5 w-4.5" />
              )}
            </span>
            <span className={`font-medium ${m.completed ? "text-ink-500 line-through" : "text-ink-800"}`}>
              {m.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
