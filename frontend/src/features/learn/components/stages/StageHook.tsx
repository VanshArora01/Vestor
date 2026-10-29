import type { Lesson } from "../../types";
import { ArrowRight, Sparkles, AlertCircle } from "lucide-react";

interface StageHookProps {
  lesson: Lesson;
  onProceed: () => void;
}

export function StageHook({ lesson, onProceed }: StageHookProps) {
  const { hook } = lesson;

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4 sm:py-6">
      {/* Badge & Headline */}
      <div className="space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          {hook.badge}
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-950 leading-tight">
          {hook.headline}
        </h2>
      </div>

      {/* Narrative Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
        <div className="space-y-3 text-sm sm:text-base leading-relaxed text-ink-700">
          <p>{hook.scenario}</p>
          <p className="font-medium text-ink-950">{hook.relatablePrompt}</p>
        </div>

        {/* Fictional benchmark notice per project requirement */}
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-ink-500">
          <AlertCircle className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
          <p>
            This scenario uses a standard educational benchmark for illustration. Your actual Vestor
            financial data remains private and will only be connected when you explicitly link accounts.
          </p>
        </div>
      </div>

      {/* Action CTA */}
      <div className="flex items-center justify-between border-t border-slate-200/80 pt-6">
        <div className="text-xs text-ink-500">
          Step 1 of 6: Setting Context
        </div>
        <button
          type="button"
          onClick={onProceed}
          className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-6 py-3 font-sans text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition active:brightness-95"
        >
          <span>Make Your Prediction</span>
          <ArrowRight className="h-4 w-4 text-accent" />
        </button>
      </div>
    </div>
  );
}
