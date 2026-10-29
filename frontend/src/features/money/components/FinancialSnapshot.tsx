import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Info, Sparkles } from "lucide-react";
import { InlineConfirm } from "../../../components/ui/InlineConfirm";
import { Button } from "../../../components/ui/Button";
import { MoneyAmount } from "../../../components/ui/MoneyAmount";
import type { MonthMetrics } from "../../../types/money";

interface FinancialSnapshotProps {
  metrics: MonthMetrics;
  isLocked: boolean;
  spent: number;
  spendingBuckets: { needs: number; wants: number; other: number };
  monthActions: ReactNode;
  incomeCandidates?: Array<{
    id: string;
    narration: string;
    amount: string;
    transaction_timestamp: string;
  }>;
  onConfirmCandidate?: (txId: string, isIncome: boolean) => Promise<unknown>;
  onSaveAdjustment?: (amount: string) => Promise<unknown>;
}

function AmountTooltip({ label, explanation }: { label: string; explanation: string }) {
  return <span className="inline-flex items-center gap-1.5">
    {label}
    <span title={explanation} aria-label={explanation}><Info aria-hidden="true" className="h-3.5 w-3.5 text-white/55" /></span>
  </span>;
}

export function FinancialSnapshot({
  metrics,
  isLocked,
  spent,
  spendingBuckets,
  monthActions,
  incomeCandidates = [],
  onConfirmCandidate,
  onSaveAdjustment,
}: FinancialSnapshotProps) {
  const reduceMotion = useReducedMotion();
  const [animatedAvailable, setAnimatedAvailable] = useState(0);
  const [manualIncomeOpen, setManualIncomeOpen] = useState(false);
  const [manualIncome, setManualIncome] = useState("");
  const [savingManualIncome, setSavingManualIncome] = useState(false);
  const [manualIncomeError, setManualIncomeError] = useState("");
  const carryover = Number(metrics.carryover ?? 0);
  const adjustment = Number(metrics.manual_income_adjustment ?? 0);
  const incomeAmount = Number(metrics.income ?? 0);
  const confirmedIncome = Number(metrics.confirmed_income ?? 0) || (adjustment === 0 ? incomeAmount : 0);
  const availableToPlan = Number(metrics.available_to_plan ?? 0);
  const leftAfterSpending = availableToPlan - spent;
  const barBase = Math.max(availableToPlan, 1);
  const segments = [
    { label: "Needs", amount: spendingBuckets.needs, color: "#22C55E" },
    { label: "Wants", amount: spendingBuckets.wants, color: "#5EEAD4" },
    { label: "Other", amount: spendingBuckets.other, color: "#94A3B8" },
  ];

  useEffect(() => {
    if (reduceMotion) {
      setAnimatedAvailable(availableToPlan);
      return;
    }
    const control = animate(0, availableToPlan, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setAnimatedAvailable,
    });
    return () => control.stop();
  }, [availableToPlan, reduceMotion]);

  async function saveManualIncome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onSaveAdjustment || !manualIncome || Number(manualIncome) <= 0) return;
    setManualIncomeError("");
    setSavingManualIncome(true);
    try {
      await onSaveAdjustment(manualIncome);
      setManualIncomeOpen(false);
      setManualIncome("");
    } catch {
      setManualIncomeError("Income could not be saved. Please try again.");
    } finally {
      setSavingManualIncome(false);
    }
  }

  return (
    <section aria-labelledby="available-to-plan-heading" className="rounded-[20px] border border-[#27352B] bg-[#121A15] p-5 text-white sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="available-to-plan-heading" className="text-sm font-medium text-white/75"><AmountTooltip label="Available to Plan" explanation="The amount available after adding carryover, confirmed income and any manual adjustment." /></h2>
            <span className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-medium text-white/80">{isLocked ? "Locked month" : "Active month"}</span>
          </div>
          <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            <MoneyAmount value={animatedAvailable} fractionClassName="text-white/55" />
          </p>
        </div>
        <div className="shrink-0">{monthActions}</div>
      </div>

      <div className="mt-6 grid gap-6 border-t border-white/10 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] lg:items-end">
        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-x-2 sm:max-w-[620px] sm:gap-x-4">
            <EquationValue label="Carryover" value={carryover} tooltip="Unallocated money carried forward from the previous month." />
            <span className="pb-1 text-xl text-white/45">+</span>
            <EquationValue label="Confirmed income" value={confirmedIncome} tooltip="Income confirmed for this month." />
            <span className="pb-1 text-xl text-white/45">{adjustment < 0 ? "−" : "+"}</span>
            <EquationValue label="Adjustment" value={Math.abs(adjustment)} tooltip="A manual income adjustment included in this month’s plan." />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-xs text-white/65"><AmountTooltip label="Spent so far" explanation="Ordinary debit transactions recorded for the selected month." /></p>
            <p className="mt-2 text-xl font-semibold tabular-nums"><MoneyAmount value={spent} fractionClassName="text-white/55" /></p>
          </div>
          <div>
            <p className="text-xs text-white/65"><AmountTooltip label="Left after spending" explanation="Available to Plan minus recorded ordinary spending." /></p>
            {availableToPlan <= 0 && incomeCandidates.length > 0
              ? <p className="mt-2 text-sm font-medium text-white/75">Confirm income to calculate</p>
              : <p className={`mt-2 text-xl font-semibold tabular-nums ${leftAfterSpending < 0 ? "text-[#F87171]" : "text-white"}`}><MoneyAmount value={leftAfterSpending} fractionClassName="text-white/55" /></p>}
          </div>
          <div className="col-span-2">
            <div className="mb-2 text-xs text-white/75"><AmountTooltip label="Income used" explanation="Recorded ordinary spending compared with Available to Plan." /></div>
            {availableToPlan <= 0 && incomeCandidates.length > 0
              ? <p className="text-xs text-white/65">Confirm or review the detected credit to see spending against available income.</p>
              : <><div className="flex h-2.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Income used: ${segments.map((segment) => `${segment.label} ${Math.round(segment.amount / barBase * 100)} percent`).join(", ")}`}>
                {segments.map((segment, index) => <motion.div key={segment.label} initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, segment.amount / barBase * 100))}%` }} transition={{ duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : index * 0.07, ease: [0.16, 1, 0.3, 1] }} className="h-full" style={{ backgroundColor: segment.color }} />)}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/70">{segments.map((segment) => <span key={segment.label} className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: segment.color }} />{segment.label}</span>)}</div></>}
          </div>
        </div>
      </div>

      {incomeCandidates.length > 0 && onConfirmCandidate ? (
        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" />
            <div><p className="text-sm font-semibold">Confirm this income</p><p className="mt-0.5 text-xs text-white/65">{incomeCandidates[0].narration} · <MoneyAmount value={incomeCandidates[0].amount} fractionClassName="text-white/45" /></p></div>
          </div>
          <InlineConfirm
            confirmLabel="Confirm income"
            cancelLabel="Other income"
            onConfirm={() => onConfirmCandidate(incomeCandidates[0].id, true)}
            onCancel={() => onConfirmCandidate(incomeCandidates[0].id, false)}
          />
        </div>
      ) : null}

      {availableToPlan <= 0 && incomeCandidates.length === 0 && onSaveAdjustment ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          {manualIncomeOpen ? <form onSubmit={saveManualIncome} className="flex flex-wrap items-end gap-2">
            <label className="min-w-44 flex-1 text-xs text-white/70">Enter monthly income
              <input autoFocus type="number" min="0.01" step="0.01" value={manualIncome} onChange={(event) => setManualIncome(event.target.value)} className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/50" />
            </label>
            <Button type="submit" variant="secondary" isLoading={savingManualIncome} disabled={isLocked || Number(manualIncome) <= 0}>Save income</Button>
            <button type="button" onClick={() => { setManualIncomeOpen(false); setManualIncomeError(""); }} className="rounded-xl px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/10">Cancel</button>
            {manualIncomeError ? <p className="w-full text-xs text-[#FCA5A5]" role="alert">{manualIncomeError}</p> : null}
          </form> : <button type="button" disabled={isLocked} onClick={() => setManualIncomeOpen(true)} className="text-xs font-medium text-white/75 underline underline-offset-2 disabled:opacity-50">No income found? Enter it manually</button>}
        </div>
      ) : null}
    </section>
  );
}

function EquationValue({ label, value, tooltip }: { label: string; value: number; tooltip: string }) {
  return <div className="min-w-0">
    <p className="truncate text-[11px] text-white/60"><AmountTooltip label={label} explanation={tooltip} /></p>
    <p className="mt-1 text-sm font-semibold tabular-nums text-white sm:text-base"><MoneyAmount value={value} fractionClassName="text-white/50" /></p>
  </div>;
}
