import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Activity } from "lucide-react";
import { formatInr, toneForNumber } from "../../invest/utils/format";

interface MonthlyMoneyFlowProps {
  income: number;
  allocated: number;
  spent: number;
  available: number;
  actualInvestment: number;
  plannedInvestment: number;
  spendingChange: number | null;
  spendingChangePct: number | null;
  savingsRate: number | null;
}

export function MonthlyMoneyFlow({
  income,
  allocated,
  spent,
  available,
  actualInvestment,
  plannedInvestment,
  spendingChange,
  spendingChangePct,
  savingsRate,
}: MonthlyMoneyFlowProps) {
  // Proportional percentages
  const allocatedPct = income > 0 ? (allocated / income) * 100 : 0;
  const spentPct = income > 0 ? (spent / income) * 100 : 0;
  const availablePct = income > 0 ? (available / income) * 100 : 0;

  // Investment rates
  const actualInvestRate = income > 0 ? (actualInvestment / income) * 100 : 0;
  const plannedInvestRate = income > 0 ? (plannedInvestment / income) * 100 : 0;

  // Plan adherence (actual investment vs planned investment)
  const planAdherence = plannedInvestment > 0 ? (actualInvestment / plannedInvestment) * 100 : 0;

  const spendTone = toneForNumber(spendingChange);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="flow-title">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 id="flow-title" className="font-display text-lg font-semibold text-ink-950">
            Monthly Financial Flow
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">Flow metrics of plan allocations vs current spent</p>
        </div>
        <Link
          to="/money"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-teal-800"
        >
          <span>View Money</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {income === 0 ? (
        <div className="py-8 text-center text-sm text-ink-500">
          <p className="font-medium text-ink-700">No monthly plan initialized</p>
          <p className="mt-1 text-xs max-w-xs mx-auto">
            Set your income in the Money plan module to start budgeting allocations.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* Proportional visual story bars */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Cash Flow Proportions</span>
            
            <div className="space-y-3.5">
              {/* Income Line */}
              <div>
                <div className="flex justify-between text-xs text-ink-700 mb-1">
                  <span className="font-medium">Total Income</span>
                  <span className="font-semibold tabular-nums">{formatInr(income)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-ink-900" style={{ width: "100%" }} />
                </div>
              </div>

              {/* Planned Allocations Line */}
              {allocated > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-ink-500 mb-1">
                    <span>Planned Allocations</span>
                    <span className="font-medium tabular-nums">{formatInr(allocated)} ({allocatedPct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${allocatedPct}%` }}
                      transition={{ duration: 0.4 }}
                      className="h-full rounded-full bg-teal-700/40"
                    />
                  </div>
                </div>
              )}

              {/* Spent Line */}
              {spent > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-ink-500 mb-1">
                    <span>Actual Spent</span>
                    <span className="font-medium tabular-nums">{formatInr(spent)} ({spentPct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${spentPct}%` }}
                      transition={{ duration: 0.4 }}
                      className="h-full rounded-full bg-red-700/80"
                    />
                  </div>
                </div>
              )}

              {/* Available Surplus Line */}
              {available > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-ink-500 mb-1">
                    <span>Surplus Available</span>
                    <span className="font-medium tabular-nums">{formatInr(available)} ({availablePct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${availablePct}%` }}
                      transition={{ duration: 0.4 }}
                      className="h-full rounded-full bg-teal-700"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Pulse Section */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center gap-1.5 text-ink-500 mb-4">
              <Activity className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Financial Pulse</span>
            </div>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              {/* Savings Rate */}
              <div className="rounded-xl border border-slate-100 p-3">
                <span className="text-[10px] font-medium text-ink-400 uppercase">Savings Rate</span>
                <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-ink-950">
                  {savingsRate !== null ? `${savingsRate.toFixed(1)}%` : "Not enough data"}
                </p>
                <p className="mt-1 text-[9px] text-ink-500 leading-normal">
                  {savingsRate !== null ? (savingsRate >= 20 ? "Above the 20% savings rule" : "Below the 20% recommendation") : "Set income/spends to track"}
                </p>
              </div>

              {/* Investment Rate */}
              <div className="rounded-xl border border-slate-100 p-3">
                <span className="text-[10px] font-medium text-ink-400 uppercase">Investment Rate</span>
                <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-ink-950">
                  {actualInvestRate.toFixed(1)}%
                </p>
                <p className="mt-1 text-[9px] text-ink-500 leading-normal">
                  Planned: {plannedInvestRate.toFixed(0)}% this month
                </p>
              </div>

              {/* Plan Adherence */}
              <div className="rounded-xl border border-slate-100 p-3">
                <span className="text-[10px] font-medium text-ink-400 uppercase">Plan Adherence</span>
                <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-ink-950">
                  {planAdherence.toFixed(0)}%
                </p>
                <p className="mt-1 text-[9px] text-ink-500 leading-normal">
                  {planAdherence >= 100 ? "Plan fully satisfied" : "Contribution gap remaining"}
                </p>
              </div>

              {/* Spending MoM Change */}
              <div className="rounded-xl border border-slate-100 p-3">
                <span className="text-[10px] font-medium text-ink-400 uppercase">Spent MoM</span>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className={`font-display text-2xl font-bold tabular-nums text-ink-950`}>
                    {spendingChangePct !== null ? `${Math.abs(spendingChangePct).toFixed(1)}%` : "—"}
                  </span>
                  {spendingChangePct !== null && spendingChangePct !== 0 && (
                    <span className={`text-[10px] font-bold ${spendTone === "down" ? "text-teal-700" : "text-red-700"}`}>
                      {spendTone === "down" ? "↓" : "↑"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[9px] text-ink-500 leading-normal">
                  {spendingChange ? `${spendingChange >= 0 ? '+' : '−'}${formatInr(Math.abs(spendingChange))} since last month` : "No previous comparison data"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
