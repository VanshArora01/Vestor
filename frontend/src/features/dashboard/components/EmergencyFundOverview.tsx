import { ShieldAlert, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { formatInr } from "../../invest/utils/format";
import type { Goal } from "../../../types/goals";

interface EmergencyFundOverviewProps {
  emergencyGoal: Goal | null | undefined;
  plannedAmount: number;
  actualSaved: number | null;
}

export function EmergencyFundOverview({ emergencyGoal, plannedAmount, actualSaved }: EmergencyFundOverviewProps) {
  const targetAmount = emergencyGoal ? Number(emergencyGoal.target_amount) : 0;
  const progressPct = actualSaved !== null && targetAmount > 0 ? (actualSaved / targetAmount) * 100 : 0;
  const remaining = actualSaved !== null ? Math.max(0, targetAmount - actualSaved) : targetAmount;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="ef-title">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <Shield className="h-5 w-5 text-accent" />
        <div>
          <h2 id="ef-title" className="font-display text-lg font-semibold text-ink-950">
            Emergency Fund
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">Tracked safety reserves</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {emergencyGoal ? (
          <>
            <div>
              <div className="flex items-baseline justify-between">
                {actualSaved !== null ? (
                  <>
                    <p className="font-display text-2xl font-bold tabular-nums text-ink-950">
                      {formatInr(actualSaved)}
                      <span className="ml-1 text-xs font-normal text-ink-500">
                        actual saved
                      </span>
                    </p>
                    <span className="text-xs font-bold tabular-nums text-accent">
                      {progressPct.toFixed(0)}%
                    </span>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium text-ink-500 leading-normal">
                      Balance pending first sync
                    </p>
                    <span className="text-xs font-bold tabular-nums text-accent">
                      --%
                    </span>
                  </>
                )}
              </div>

              {/* Progress Rail */}
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${Math.min(progressPct, 100)}%` }}
                />
              </div>

              <div className="mt-2.5 flex justify-between text-[10px] text-ink-500">
                <span>Target: {formatInr(targetAmount)}</span>
                <span className="tabular-nums">
                  {actualSaved !== null ? `${formatInr(remaining)} remaining` : "Remaining pending sync"}
                </span>
              </div>
            </div>

            {plannedAmount > 0 ? (
              <div className="rounded-lg bg-teal-50/20 border border-teal-100/50 p-2.5 text-[10px] text-teal-800 flex items-center justify-between">
                <span>Seeding this month</span>
                <span className="font-bold tabular-nums">{formatInr(plannedAmount)} planned</span>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-[10px] text-ink-500 flex items-center justify-between">
                <span>No monthly planned contribution</span>
                <Link to="/goals" className="font-bold text-accent hover:underline">
                  Update Goal
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
              <ShieldAlert className="h-5 w-5 text-ink-400 mx-auto" />
              <h3 className="mt-2 text-xs font-bold text-ink-950 uppercase tracking-wide">No reserve tracked yet</h3>
              <p className="mt-1 text-[11px] text-ink-500 leading-normal">
                You haven&apos;t created a dedicated Emergency Fund goal to accumulate actual balances.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                to="/goals"
                className="w-full text-center rounded-lg bg-ink-950 px-3 py-2 text-xs font-semibold text-white hover:bg-ink-900 transition"
              >
                Create Emergency Goal
              </Link>
              
              {plannedAmount > 0 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-ink-500">
                  <span>Allocation plan</span>
                  <span className="font-semibold text-ink-950 tabular-nums">{formatInr(plannedAmount)} planned this month</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
