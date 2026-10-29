import { useState } from "react";
import type { Lesson } from "../../types";
import { ArrowRight, CheckCircle2, HelpCircle, Lightbulb } from "lucide-react";

interface StagePredictProps {
  lesson: Lesson;
  savedAnswer?: string;
  onSaveAnswer: (answerId: string) => void;
  onProceed: () => void;
}

export function StagePredict({
  lesson,
  savedAnswer,
  onSaveAnswer,
  onProceed,
}: StagePredictProps) {
  const { predict } = lesson;
  const [selectedId, setSelectedId] = useState<string | undefined>(savedAnswer);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSaveAnswer(id);
  };

  const hasAnswered = Boolean(selectedId);

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4 sm:py-6">
      {/* Title */}
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
          Stage 2: Your Initial Prediction
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-950 leading-tight">
          {predict.question}
        </h2>
        {predict.helperText && (
          <p className="text-xs sm:text-sm text-ink-500">{predict.helperText}</p>
        )}
      </div>

      {/* Options List */}
      <div className="space-y-3">
        {predict.options.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`w-full text-left rounded-2xl border p-4 sm:p-5 transition flex items-start justify-between gap-4 ${
                isSelected
                  ? "border-accent bg-teal-50/40 shadow-xs ring-2 ring-accent/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <div className="space-y-1">
                <span className="font-sans text-sm font-semibold text-ink-950 block">
                  {opt.label}
                </span>
                {opt.sublabel && (
                  <span className="font-sans text-xs text-ink-500 block leading-relaxed">
                    {opt.sublabel}
                  </span>
                )}
              </div>
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                  isSelected
                    ? "border-accent bg-accent text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Revealed Explanation */}
      {hasAnswered && (
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/60 p-6 shadow-xs space-y-4 animate-in fade-in-50 duration-300">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
              <Lightbulb className="h-4 w-4" />
            </div>
            <h4 className="font-sans text-sm font-bold text-teal-950">
              The Reality Behind the Numbers
            </h4>
          </div>

          <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-teal-950">
            <p>{predict.explanation.revealedFact}</p>
            <p className="font-medium text-teal-900">{predict.explanation.takeaway}</p>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between border-t border-slate-200/80 pt-6">
        <div className="text-xs text-ink-500">
          {hasAnswered ? "Answer recorded" : "Select an option to reveal analysis"}
        </div>
        <button
          type="button"
          disabled={!hasAnswered}
          onClick={onProceed}
          className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-6 py-3 font-sans text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition active:brightness-95"
        >
          <span>Continue to Concepts</span>
          <ArrowRight className="h-4 w-4 text-accent" />
        </button>
      </div>
    </div>
  );
}
