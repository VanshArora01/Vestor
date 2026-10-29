import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Landmark, Target, ShieldCheck, ArrowRight, Wallet } from "lucide-react";
import { formatInr, formatSignedInr, formatSignedPercent, toneClass, toneForNumber } from "../../invest/utils/format";

interface FinancialPositionHeroProps {
  portfolioValue: number;
  portfolioPlanned: number;
  goalsSaved: number;
  goalsPlanned: number;
  emergencySaved: number | null;
  emergencyPlanned: number;
  savingsSaved: number | null;
  savingsPlanned: number;
  absoluteGainLoss: number | null;
  returnPct: number | null;
  emergencyGoalTarget: number;
}

export function FinancialPositionHero({
  portfolioValue,
  portfolioPlanned,
  goalsSaved,
  goalsPlanned,
  emergencySaved,
  emergencyPlanned,
  savingsSaved,
  savingsPlanned,
  absoluteGainLoss,
  returnPct,
  emergencyGoalTarget,
}: FinancialPositionHeroProps) {
  // Tracked Financial Value = Portfolio + Goal Savings + Emergency Fund + Savings
  const effectiveEmergency = emergencySaved !== null ? emergencySaved : 0;
  const effectiveSavings = savingsSaved !== null ? savingsSaved : 0;
  const totalWealth = portfolioValue + goalsSaved + effectiveEmergency + effectiveSavings;
  const gainTone = toneForNumber(absoluteGainLoss);

  const emergencyProgressPct =
    emergencyGoalTarget > 0 && emergencySaved !== null
      ? (emergencySaved / emergencyGoalTarget) * 100
      : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="hero-title">
      <div className="flex flex-col gap-1.5">
        <h2 id="hero-title" className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
          Tracked Financial Value
        </h2>
        
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="font-display text-4xl font-semibold tabular-nums tracking-tight text-ink-950 sm:text-5xl lg:text-6xl">
            {formatInr(totalWealth)}
          </p>
          {absoluteGainLoss !== null && absoluteGainLoss !== 0 ? (
            <div className={`flex items-center gap-1.5 text-sm font-medium ${toneClass(gainTone)}`}>
              {gainTone === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="tabular-nums font-semibold">
                {formatSignedInr(absoluteGainLoss)} ({formatSignedPercent(returnPct)})
              </span>
              <span className="text-[10px] text-ink-400 font-normal">all-time returns</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* 4-Column Asset Breakdown Row */}
      <div className="mt-8 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-4">
        {/* Portfolio Card */}
        <div className="relative flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/20 p-4 transition-all duration-200 hover:border-teal-200 hover:bg-slate-50/50 hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between text-ink-500">
              <div className="flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-ink-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Portfolio</span>
              </div>
            </div>
            
            <p className="mt-3 font-display text-2xl font-bold tabular-nums text-ink-950">
              {formatInr(portfolioValue)}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-400 font-medium">Current portfolio value</p>
          </div>

          <div className="mt-4 border-t border-slate-100/50 pt-2.5 flex items-center justify-between">
            <span className="text-[9px] font-semibold text-ink-400">
              {portfolioPlanned > 0 ? `${formatInr(portfolioPlanned)} planned` : "No plan set"}
            </span>
            <Link
              to="/invest"
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-accent hover:text-teal-800"
            >
              <span>View Portfolio</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Goal Savings Card */}
        <div className="relative flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/20 p-4 transition-all duration-200 hover:border-teal-200 hover:bg-slate-50/50 hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between text-ink-500">
              <div className="flex items-center gap-1.5">
                <Target className="h-4 w-4 text-ink-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Goal Savings</span>
              </div>
            </div>
            
            <p className="mt-3 font-display text-2xl font-bold tabular-nums text-ink-950">
              {formatInr(goalsSaved)}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-400 font-medium">Actual goal savings</p>
          </div>

          <div className="mt-4 border-t border-slate-100/50 pt-2.5 flex items-center justify-between">
            <span className="text-[9px] font-semibold text-ink-400">
              {goalsPlanned > 0 ? `${formatInr(goalsPlanned)} planned` : "No plan set"}
            </span>
            <Link
              to="/goals"
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-accent hover:text-teal-800"
            >
              <span>View Goals</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Emergency Fund Card */}
        <div className="relative flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/20 p-4 transition-all duration-200 hover:border-teal-200 hover:bg-slate-50/50 hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between text-ink-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-ink-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Emergency Fund</span>
              </div>
            </div>
            
            {emergencySaved !== null ? (
              <p className="mt-3 font-display text-2xl font-bold tabular-nums text-ink-950">
                {formatInr(emergencySaved)}
              </p>
            ) : (
              <p className="mt-3 text-xs font-semibold text-ink-500 leading-normal">
                Balance pending first sync
              </p>
            )}
            <p className="mt-0.5 text-[10px] text-ink-400 font-medium">
              {emergencySaved !== null && emergencyGoalTarget > 0 ? `${emergencyProgressPct.toFixed(0)}% of ${formatInr(emergencyGoalTarget)}` : "Actual reserve"}
            </p>
          </div>

          <div className="mt-4 border-t border-slate-100/50 pt-2.5 flex items-center justify-between">
            <span className="text-[9px] font-semibold text-ink-400">
              {emergencyPlanned > 0 ? `${formatInr(emergencyPlanned)} planned` : "No plan set"}
            </span>
            <Link
              to="/goals"
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-accent hover:text-teal-800"
            >
              <span>View Goals</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Savings Card */}
        <div className="relative flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/20 p-4 transition-all duration-200 hover:border-teal-200 hover:bg-slate-50/50 hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between text-ink-500">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-ink-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Savings</span>
              </div>
            </div>
            
            {savingsSaved !== null ? (
              <p className="mt-3 font-display text-2xl font-bold tabular-nums text-ink-950">
                {formatInr(savingsSaved)}
              </p>
            ) : (
              <p className="mt-3 text-xs font-semibold text-ink-500 leading-normal">
                Balance pending first sync
              </p>
            )}
            <p className="mt-0.5 text-[10px] text-ink-400 font-medium">Actual savings balance</p>
          </div>

          <div className="mt-4 border-t border-slate-100/50 pt-2.5 flex items-center justify-between">
            <span className="text-[9px] font-semibold text-ink-400">
              {savingsPlanned > 0 ? `${formatInr(savingsPlanned)} planned` : "No plan set"}
            </span>
            <Link
              to="/money"
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-accent hover:text-teal-800"
            >
              <span>View Money</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
