// ============================================================
// BudgetBuilder — Live donut chart + percentage sliders
// ============================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { GuideCharacter } from "../GuideCharacter";
import type { BudgetBuilderStep } from "../stepTypes";
import { redistributeOnSliderChange } from "../lessonEngine";
import { ArrowRight, CheckCircle } from "lucide-react";

interface BudgetBuilderProps {
  step: BudgetBuilderStep;
  isLastStep?: boolean;
  onComplete: (percents: Record<string, number>, isCorrect: boolean) => void;
}

function formatINR(val: number) {
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
}

export function BudgetBuilder({ step, isLastStep = false, onComplete }: BudgetBuilderProps) {
  const categoryIds = step.categories.map((c) => c.id);

  const [percents, setPercents] = useState<Record<string, number>>(
    Object.fromEntries(step.categories.map((c) => [c.id, c.defaultPercent]))
  );
  const [checked, setChecked] = useState(false);
  const [isGood, setIsGood] = useState(false);

  const pieData = step.categories.map((cat) => ({
    name: cat.label,
    value: percents[cat.id] ?? 0,
    color: cat.color,
  }));

  function handleSliderChange(id: string, newValue: number) {
    if (checked) return;
    setPercents(redistributeOnSliderChange(percents, id, newValue, categoryIds));
  }

  function handleCheck() {
    let score = 0;
    for (const cat of step.categories) {
      const diff = Math.abs((percents[cat.id] ?? 0) - (step.targetPercents[cat.id] ?? 0));
      if (diff <= 5) score++;
    }
    const good = score === step.categories.length;
    setIsGood(good);
    setChecked(true);
  }

  const total = Object.values(percents).reduce((s, v) => s + v, 0);
  const isBalanced = Math.abs(total - 100) < 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex min-h-[28rem] flex-col gap-5"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <GuideCharacter
          state={checked ? (isGood ? "correct" : "thinking") : (step.characterState ?? "idle")}
          size="sm"
        />
        <div>
          <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-accent">Budget Builder</p>
          <h3 className="font-display text-lg font-bold text-ink-950">{step.instruction}</h3>
          <p className="mt-1 font-sans text-xs text-ink-500">
            Monthly income: <span className="font-semibold text-ink-700">{formatINR(step.income)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Donut */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="mb-1 font-sans text-xs font-semibold uppercase tracking-wide text-ink-500">Live Allocation</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={70} paddingAngle={2} dataKey="value">
                {pieData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
              </Pie>
              <Tooltip
                formatter={(v: unknown, n: unknown) => [`${v}%`, String(n)]}
                contentStyle={{ fontFamily: "DM Sans", fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3">
            {step.categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: cat.color }} />
                <span className="font-sans text-xs text-ink-600">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="flex flex-col gap-4 justify-center">
          {step.categories.map((cat) => {
            const pct = percents[cat.id] ?? 0;
            const amount = (pct / 100) * step.income;
            return (
              <div key={cat.id}>
                <div className="flex justify-between mb-1">
                  <span className="font-sans text-sm font-semibold" style={{ color: cat.color }}>{cat.label}</span>
                  <span className="font-sans text-sm font-bold text-ink-950">
                    {pct}% <span className="font-normal text-ink-500 text-xs">({formatINR(amount)})</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={cat.minPercent} max={cat.maxPercent} step={5}
                  value={pct} disabled={checked}
                  onChange={(e) => handleSliderChange(cat.id, Number(e.target.value))}
                  aria-label={`${cat.label} share of monthly income`}
                  className="w-full h-2 appearance-none rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${cat.color} ${pct}%, #E2E8F0 ${pct}%)`,
                    cursor: checked ? "default" : "pointer",
                  }}
                />
              </div>
            );
          })}
          <div className={`flex justify-between rounded-lg px-3 py-2 text-xs font-semibold font-sans ${isBalanced ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            <span>Total</span><span>{Math.round(total)}%</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl border p-4 ${isGood ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}
          >
            <div className="flex items-start gap-2"><CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${isGood ? "text-emerald-700" : "text-amber-700"}`} /><p className={`font-sans text-sm font-semibold ${isGood ? "text-emerald-800" : "text-amber-800"}`}>
              {isGood ? step.successMessage : "Close! The 50/30/20 target: 50% Needs · 30% Wants · 20% Savings. It’s a guideline, not a rule."}
            </p></div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lesson-action-rail">
        <p className="mr-auto text-xs font-medium text-slate-600" aria-live="polite">{checked ? "Budget checked. Review the result to continue." : isBalanced ? "Your allocations add up to 100%." : `Balance the budget to 100% (${Math.round(total)}% assigned).`}</p>
        {!checked ? (
          <button type="button" onClick={handleCheck} disabled={!isBalanced} className="lesson-primary-action w-full sm:w-auto"><CheckCircle className="h-4 w-4" />Check my budget</button>
        ) : (
          <button type="button" onClick={() => onComplete(percents, isGood)} className="lesson-primary-action w-full sm:w-auto">{isLastStep ? "Finish lesson" : "Continue"}<ArrowRight className="h-4 w-4" /></button>
        )}
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: white; cursor: pointer;
          border: 2px solid currentColor;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
      `}</style>
    </motion.div>
  );
}
