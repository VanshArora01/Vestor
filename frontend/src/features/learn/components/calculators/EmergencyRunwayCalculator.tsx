import { useState } from "react";
import { CurrencyInput } from "../common/CurrencyInput";
import { calculateEmergencyRunway } from "../../utils/calculations";
import { formatInr } from "../../../invest/utils/format";
import { ShieldCheck, ShieldAlert, AlertTriangle, Sparkles } from "lucide-react";

export function EmergencyRunwayCalculator() {
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(25000);
  const [liquidSavings, setLiquidSavings] = useState<number>(50000);

  const result = calculateEmergencyRunway(monthlyExpenses, liquidSavings);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h3 className="font-display text-lg font-semibold text-ink-950">
          Emergency Runway & Resilience Simulator
        </h3>
        <p className="text-xs text-ink-500">
          Calculate your exact survival runway if your primary income source stops today.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Input Column */}
        <div className="space-y-5 lg:col-span-6">
          <CurrencyInput
            label="Essential Monthly Expenses (Survival Burn Rate)"
            value={monthlyExpenses}
            onChange={setMonthlyExpenses}
            min={5000}
            max={300000}
            step={2000}
            quickIncrements={[5000, 10000]}
            helperText="Include only non-negotiables: rent, groceries, medicines, loan EMIs, and utility bills."
          />

          <CurrencyInput
            label="Current Available Liquid Savings"
            value={liquidSavings}
            onChange={setLiquidSavings}
            min={0}
            max={2000000}
            step={5000}
            quickIncrements={[10000, 25000]}
            helperText="Only include accessible cash: savings accounts, sweep-in deposits, and liquid mutual funds."
          />

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
            <span className="font-sans text-xs font-semibold text-ink-900 block">
              Where is emergency money parked?
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-2.5">
                <span className="font-semibold text-emerald-900 block">✓ Valid Liquid Cash</span>
                <span className="text-emerald-700 text-[10px] mt-0.5 block">
                  Sweep-in savings, Liquid mutual funds, Instant-withdrawal FDs.
                </span>
              </div>
              <div className="rounded-lg border border-rose-200/80 bg-rose-50/50 p-2.5">
                <span className="font-semibold text-rose-900 block">✕ Invalid for Runway</span>
                <span className="text-rose-700 text-[10px] mt-0.5 block">
                  Nifty 50 stocks, Crypto, PPF/EPF (locked), Real estate.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Output & Gauge Column */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/40 p-5 lg:col-span-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-ink-500">
                Current Runway Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  result.runwayCategory === "robust"
                    ? "bg-emerald-100 text-emerald-800"
                    : result.runwayCategory === "adequate"
                      ? "bg-teal-100 text-teal-800"
                      : result.runwayCategory === "vulnerable"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                }`}
              >
                {result.runwayCategory === "robust" && <ShieldCheck className="h-3.5 w-3.5" />}
                {result.runwayCategory === "adequate" && <Sparkles className="h-3.5 w-3.5" />}
                {result.runwayCategory === "vulnerable" && <AlertTriangle className="h-3.5 w-3.5" />}
                {result.runwayCategory === "critical" && <ShieldAlert className="h-3.5 w-3.5" />}
                {result.runwayLabel}
              </span>
            </div>

            {/* Huge Stat */}
            <div className="my-4">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold tracking-tight text-ink-950">
                  {monthlyExpenses === 0 ? "∞" : result.runwayMonths}
                </span>
                <span className="font-sans text-sm font-semibold text-ink-500">
                  Months of Living Expenses Covered
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {monthlyExpenses === 0
                  ? "Zero essential expenses specified."
                  : result.runwayMonths < 3
                    ? "You are below the minimum 3-month baseline. A surprise event could trigger costly debt."
                    : result.runwayMonths < 6
                      ? "Good start! You have basic coverage, but aim for 6 months for complete peace of mind."
                      : "Outstanding! You have a fortress balance sheet capable of withstanding prolonged job disruptions."}
              </p>
            </div>

            {/* Progress to 6 Months Target */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-ink-700">Progress to 6-Month Resilience Target</span>
                <span className="font-semibold text-ink-950">{result.percentOf6MonthTarget}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${result.percentOf6MonthTarget}%` }}
                />
              </div>
            </div>
          </div>

          {/* Milestones comparison */}
          <div className="mt-5 space-y-2 border-t border-slate-200 pt-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">
              Emergency Fund Milestones
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <span className="text-[10px] font-semibold text-ink-500 block">3-Month Baseline</span>
                <span className="font-bold text-ink-900 mt-0.5 block">
                  {formatInr(result.target3Months)}
                </span>
              </div>
              <div className="rounded-lg border border-accent/40 bg-teal-50/50 p-2.5">
                <span className="text-[10px] font-bold text-accent block">6-Month Recommended</span>
                <span className="font-bold text-ink-950 mt-0.5 block">
                  {formatInr(result.target6Months)}
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <span className="text-[10px] font-semibold text-ink-500 block">12-Month Shield</span>
                <span className="font-bold text-ink-900 mt-0.5 block">
                  {formatInr(result.target12Months)}
                </span>
              </div>
            </div>

            {result.gapFor6Months > 0 && (
              <p className="text-[11px] text-ink-500 text-center pt-1">
                Savings gap to hit 6 months:{" "}
                <span className="font-bold text-ink-900">{formatInr(result.gapFor6Months)}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
