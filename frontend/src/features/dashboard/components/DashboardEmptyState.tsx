import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, Wallet, Target, Landmark } from "lucide-react";

interface DashboardEmptyStateProps {
  hasIncome: boolean;
  hasGoals: boolean;
  hasInvestments: boolean;
}

export function DashboardEmptyState({ hasIncome, hasGoals, hasInvestments }: DashboardEmptyStateProps) {
  const steps = [
    {
      id: "income",
      label: "Set your monthly income",
      desc: "Add your monthly income baseline to start allocations.",
      completed: hasIncome,
      path: "/money",
      icon: Wallet,
    },
    {
      id: "goals",
      label: "Create your first goal",
      desc: "Track targets like emergency funds or dream purchases.",
      completed: hasGoals,
      path: "/goals",
      icon: Target,
    },
    {
      id: "investments",
      label: "Record your first investment",
      desc: "Log stocks, mutual funds, gold, or FDs to value assets.",
      completed: hasInvestments,
      path: "/invest",
      icon: Landmark,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
        Onboarding Setup
      </p>
      
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
        Build your financial picture
      </h2>
      
      <p className="mt-3 text-sm text-ink-500 max-w-md mx-auto">
        Complete the foundational setup steps below to construct your integrated wealth dashboard, cash flow metrics, and asset breakdowns.
      </p>

      {/* Setup Flow Visual */}
      <div className="mt-8 flex items-center justify-center gap-4 text-xs font-semibold text-ink-400">
        <div className={`flex items-center gap-1.5 ${hasIncome ? 'text-accent' : 'opacity-60'}`}>
          <Wallet className="h-4 w-4" />
          <span>Income</span>
        </div>
        <span className="h-[1px] w-6 bg-slate-200" />
        <div className={`flex items-center gap-1.5 ${hasGoals ? 'text-accent' : 'opacity-60'}`}>
          <Target className="h-4 w-4" />
          <span>Goals</span>
        </div>
        <span className="h-[1px] w-6 bg-slate-200" />
        <div className={`flex items-center gap-1.5 ${hasInvestments ? 'text-accent' : 'opacity-60'}`}>
          <Landmark className="h-4 w-4" />
          <span>Investments</span>
        </div>
      </div>

      {/* Progress Strip */}
      <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-left">
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span className="font-semibold text-ink-700">Setup Checklist Progress</span>
          <span className="font-bold text-accent">{completedCount} of 3 complete</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Cards List */}
      <div className="mt-6 space-y-3 text-left">
        {steps.map((step) => {
          return (
            <Link
              key={step.id}
              to={step.path}
              className={`flex items-start justify-between gap-4 rounded-xl border p-4 shadow-sm transition hover:shadow ${
                step.completed
                  ? "bg-slate-50/20 border-slate-200"
                  : "bg-white border-slate-200 hover:border-teal-200"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`mt-0.5 shrink-0 ${step.completed ? "text-accent" : "text-ink-300"}`}>
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                
                <div>
                  <h4 className={`text-sm font-semibold ${step.completed ? "text-ink-500 line-through" : "text-ink-950"}`}>
                    {step.label}
                  </h4>
                  <p className="mt-0.5 text-xs text-ink-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>

              {!step.completed && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-700 hover:bg-teal-50 hover:text-accent">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
