// ============================================================
// SortBuckets — Click-based 3-bucket sorting (no drag required)
// ============================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GuideCharacter } from "../GuideCharacter";
import type { SortBucketsStep } from "../stepTypes";
import { countCorrectAssignments } from "../lessonEngine";
import { CheckCircle, XCircle, ArrowRight, RotateCcw } from "lucide-react";

const BUCKET_COLORS: Record<string, { bg: string; border: string; text: string; header: string }> = {
  teal: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-800", header: "bg-accent text-white" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", header: "bg-amber-400 text-amber-950" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", header: "bg-emerald-600 text-white" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", header: "bg-rose-600 text-white" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-800", header: "bg-indigo-600 text-white" },
  slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-800", header: "bg-slate-600 text-white" },
};

interface SortBucketsProps {
  step: SortBucketsStep;
  isLastStep?: boolean;
  onComplete: (score: number) => void;
}

export function SortBuckets({ step, isLastStep = false, onComplete }: SortBucketsProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);

  const unassignedItems = step.items.filter((item) => !assignments[item.id]);
  const allAssigned = unassignedItems.length === 0;

  function handleItemClick(itemId: string) {
    if (checked) return;
    setSelectedItemId(selectedItemId === itemId ? null : itemId);
  }

  function handleBucketClick(bucketId: string) {
    if (!selectedItemId || checked) return;
    setAssignments((prev) => ({ ...prev, [selectedItemId]: bucketId }));
    setSelectedItemId(null);
  }

  function handleRemoveFromBucket(itemId: string) {
    if (checked) return;
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  function handleCheck() {
    if (checked || !allAssigned || step.items.length === 0) return;
    const correctMap = Object.fromEntries(step.items.map((i) => [i.id, i.correctBucketId]));
    const r = countCorrectAssignments(assignments, correctMap);
    setResult(r);
    setChecked(true);
  }

  function handleTryAgain() {
    setChecked(false);
    setResult(null);
    setSelectedItemId(null);
  }

  function handleContinue() {
    if (!result) return;
    onComplete(Math.round((result.correct / result.total) * 100));
  }

  function getItemLabel(id: string) {
    return step.items.find((i) => i.id === id)?.label ?? id;
  }

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
          state={checked ? (result && result.correct === result.total ? "correct" : "incorrect") : (step.characterState ?? "idle")}
          size="sm"
        />
        <div>
          <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-accent">Make a choice</p>
          <h3 className="font-display text-lg font-bold text-ink-950">{step.instruction}</h3>
          {!checked && (
            <p className="mt-1 font-sans text-xs text-ink-500">
              Choose an item, place it in a category, and tap it again if you want to move it.
            </p>
          )}
        </div>
      </div>

      {/* Unassigned items pool */}
      {unassignedItems.length > 0 && !checked && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Items to Sort
          </p>
          <div className="flex flex-wrap gap-2">
            {unassignedItems.map((item) => (
              <motion.button
                key={item.id}
                type="button"
                layout
                onClick={() => handleItemClick(item.id)}
                aria-pressed={selectedItemId === item.id}
                className={`rounded-lg px-3 py-2 font-sans text-sm font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 ${
                  selectedItemId === item.id
                    ? "bg-accent text-white border-accent shadow-sm"
                    : "bg-white text-ink-700 border-slate-200 hover:border-accent hover:text-accent"
                }`}
              >
                {item.label}
              </motion.button>
            ))}
          </div>
          {selectedItemId && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 font-sans text-xs text-accent font-semibold"
            >
              ↓ Now tap a bucket to place &quot;{getItemLabel(selectedItemId)}&quot;
            </motion.p>
          )}
        </div>
      )}

      {/* Buckets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {step.buckets.map((bucket) => {
          const colors = BUCKET_COLORS[bucket.color] ?? BUCKET_COLORS.slate;
          const itemsInBucket = step.items.filter((i) => assignments[i.id] === bucket.id);
          const isTarget = !!selectedItemId && !checked;

          return (
            <section
              key={bucket.id}
              aria-label={`${bucket.label} category`}
              className={`rounded-xl border-2 overflow-hidden transition-all ${
                isTarget ? `${colors.border} shadow-sm` : colors.border
              }`}
            >
              <div className={`flex items-center justify-between gap-2 px-3 py-2 ${colors.header}`}>
                <p className="font-sans text-sm font-bold">{bucket.label}</p>
              {!checked && <button type="button" onClick={() => handleBucketClick(bucket.id)} disabled={!selectedItemId} className={`min-h-9 rounded-lg border px-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-75 ${bucket.color === "amber" ? "border-amber-900/40 text-amber-950 hover:bg-black/5 focus-visible:ring-amber-900" : "border-white/70 text-white hover:bg-white/15 focus-visible:ring-white"}`}>Place here</button>}
              </div>
              <div className={`min-h-[80px] p-3 ${colors.bg} flex flex-wrap gap-2 content-start`}>
                <AnimatePresence>
                  {itemsInBucket.map((item) => {
                    const isCorrect = checked && assignments[item.id] === item.correctBucketId;
                    const isWrong = checked && assignments[item.id] !== item.correctBucketId;
                    return (
                      <motion.button
                        type="button"
                        key={item.id}
                        layout
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => handleRemoveFromBucket(item.id)}
                        disabled={checked}
                        aria-label={!checked ? `Remove ${item.label} from ${bucket.label}` : item.label}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-sans text-xs font-medium border transition-all ${
                          isCorrect ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                          : isWrong ? "bg-rose-100 border-rose-300 text-rose-800"
                          : `bg-white ${colors.border} ${colors.text} hover:opacity-75`
                        } ${!checked ? "cursor-pointer" : "cursor-default"}`}
                      >
                        {isCorrect && <CheckCircle className="h-3 w-3 text-emerald-600" />}
                        {isWrong && <XCircle className="h-3 w-3 text-rose-600" />}
                        {item.label}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
                {itemsInBucket.length === 0 && (
                  <p className={`font-sans text-xs ${colors.text} opacity-40 italic`}>
                    {isTarget ? "← Place here" : "Empty"}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {!checked && <div className="lesson-action-rail">
        <p className="mr-auto text-xs font-medium text-slate-600" aria-live="polite">{allAssigned ? "Everything is sorted. Review your choices." : `${unassignedItems.length} item${unassignedItems.length === 1 ? "" : "s"} left to sort`}</p>
        <button type="button" onClick={handleCheck} disabled={!allAssigned} className="lesson-primary-action w-full sm:w-auto"><CheckCircle className="h-4 w-4" />Check answers<ArrowRight className="h-4 w-4" /></button>
      </div>}

      <AnimatePresence>
        {checked && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`rounded-2xl border p-4 ${result.correct === result.total ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}
            role="status"
          >
            <p className={`font-sans text-sm font-semibold ${result.correct === result.total ? "text-emerald-800" : "text-amber-800"}`}>
              {result.correct === result.total ? step.successMessage : `${result.correct} of ${result.total} placements fit this example. Review the context below.`}
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700">
              {step.items.map((item) => {
                const correct = assignments[item.id] === item.correctBucketId;
                const explanation = item.explanation ?? item.hint ?? `In this example, place it under ${step.buckets.find((bucket) => bucket.id === item.correctBucketId)?.label}.`;
                return <li key={item.id} className="flex gap-2"><span className="shrink-0">{correct ? <CheckCircle className="mt-0.5 h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 text-amber-700" />}</span><span><strong>{item.label}:</strong> {explanation}</span></li>;
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      {checked && result && <div className="lesson-action-rail">
        {result.correct < result.total && <button type="button" onClick={handleTryAgain} className="lesson-secondary-action w-full sm:w-auto"><RotateCcw className="h-4 w-4" />Try again</button>}
        <button type="button" onClick={handleContinue} className="lesson-primary-action w-full sm:w-auto">{isLastStep ? "Finish lesson" : "Continue"}<ArrowRight className="h-4 w-4" /></button>
      </div>}
    </motion.div>
  );
}
