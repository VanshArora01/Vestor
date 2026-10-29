import { useState } from "react";
import { CurrencyInput } from "../common/CurrencyInput";
import { SliderControl } from "../common/SliderControl";
import { calculateBudgetSplit } from "../../utils/calculations";
import { formatInr } from "../../../invest/utils/format";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface Budget503020CalculatorProps {
  initialIncome?: number;
}

export function Budget503020Calculator({ initialIncome = 30000 }: Budget503020CalculatorProps) {
  const [income, setIncome] = useState<number>(initialIncome);
  const [needsPct, setNeedsPct] = useState<number>(50);
  const [wantsPct, setWantsPct] = useState<number>(30);
  const [savingsPct, setSavingsPct] = useState<number>(20);

  const result = calculateBudgetSplit(income, needsPct, wantsPct, savingsPct);

  const applyPreset = (n: number, w: number, s: number) => {
    setNeedsPct(n);
    setWantsPct(w);
    setSavingsPct(s);
  };

  const chartData = [
    { name: "Needs (Essentials)", value: result.needsAmount, color: "#0F766E", pct: needsPct },
    { name: "Wants (Lifestyle)", value: result.wantsAmount, color: "#F59E0B", pct: wantsPct },
    { name: "Savings & Debt", value: result.savingsAmount, color: "#3B82F6", pct: savingsPct },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      {/* Header & Presets */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-950">
            Interactive Budget Split
          </h3>
          <p className="text-xs text-ink-500">
            Experiment with allocations to find an adaptable plan for your cost of living.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-ink-500 mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset(50, 30, 20)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              needsPct === 50 && wantsPct === 30 && savingsPct === 20
                ? "border-accent bg-accent-soft text-accent"
                : "border-slate-200 bg-white text-ink-700 hover:bg-slate-50"
            }`}
          >
            Classic 50/30/20
          </button>
          <button
            type="button"
            onClick={() => applyPreset(65, 15, 20)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              needsPct === 65 && wantsPct === 15 && savingsPct === 20
                ? "border-accent bg-accent-soft text-accent"
                : "border-slate-200 bg-white text-ink-700 hover:bg-slate-50"
            }`}
          >
            Metro Rent (65/15/20)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(40, 20, 40)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              needsPct === 40 && wantsPct === 20 && savingsPct === 40
                ? "border-accent bg-accent-soft text-accent"
                : "border-slate-200 bg-white text-ink-700 hover:bg-slate-50"
            }`}
          >
            Aggressive (40/20/40)
          </button>
        </div>
      </div>

      {/* Grid: Controls & Visual Summary */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-5 lg:col-span-7">
          <CurrencyInput
            label="Monthly Take-Home Salary"
            value={income}
            onChange={setIncome}
            min={10000}
            max={500000}
            step={5000}
            quickIncrements={[10000, 25000]}
            helperText="Enter your net in-hand monthly income (post-TDS and EPF deductions)."
          />

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-4">
            <SliderControl
              label="Needs (Rent, groceries, bills, insurance, EMIs)"
              value={needsPct}
              onChange={setNeedsPct}
              min={20}
              max={80}
              unit="%"
              helperText={`Yields ${formatInr(result.needsAmount)} per month for non-negotiables.`}
            />

            <SliderControl
              label="Wants (Dining out, shopping, subscriptions, travel)"
              value={wantsPct}
              onChange={setWantsPct}
              min={0}
              max={60}
              unit="%"
              helperText={`Yields ${formatInr(result.wantsAmount)} per month for discretionary lifestyle.`}
            />

            <SliderControl
              label="Savings & Debt Reduction (Emergency fund, mutual funds, PPF)"
              value={savingsPct}
              onChange={setSavingsPct}
              min={0}
              max={60}
              unit="%"
              helperText={`Yields ${formatInr(result.savingsAmount)} per month for your future self.`}
            />
          </div>

          {/* Validation Alert */}
          <div
            className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-medium ${
              result.isValid
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : result.isOverallocated
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {result.isValid ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Perfect! 100% of income is allocated across your three buckets.</span>
              </>
            ) : result.isOverallocated ? (
              <>
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  Over-allocated by {result.totalPct - 100}%! Reduce your buckets to balance your
                  budget.
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  {result.remainingPct}% unallocated ({formatInr((income * result.remainingPct) / 100)}). Allocate it toward savings or lifestyle.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Visual Summary Column */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/40 p-5 lg:col-span-5">
          <div>
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-ink-500">
              Monthly Distribution
            </span>
            <div className="mt-2 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val: any) => [
                      formatInr(val ?? 0),
                      "Allocated",
                    ]}
                    contentStyle={{
                      backgroundColor: "#0B1220",
                      borderColor: "#1E293B",
                      color: "#F8FAFC",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#F8FAFC" }}
                  />
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 border-t border-slate-200 pt-3.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-700" />
                <span className="font-medium text-ink-700">Needs ({needsPct}%)</span>
              </div>
              <span className="font-semibold text-ink-950">{formatInr(result.needsAmount)}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="font-medium text-ink-700">Wants ({wantsPct}%)</span>
              </div>
              <span className="font-semibold text-ink-950">{formatInr(result.wantsAmount)}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="font-medium text-ink-700">Savings ({savingsPct}%)</span>
              </div>
              <span className="font-semibold text-ink-950">{formatInr(result.savingsAmount)}</span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs font-bold text-ink-950">
              <span>Total Net In-Hand</span>
              <span>{formatInr(income)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
