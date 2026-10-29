import { useState } from "react";
import type { Lesson } from "../../types";
import { ArrowRight, CheckCircle2, XCircle, Award, HelpCircle } from "lucide-react";

interface StageCheckProps {
  lesson: Lesson;
  savedAnswers?: Record<string, string>;
  onSaveAnswer: (questionId: string, optionId: string) => void;
  onProceed: (scorePct: number) => void;
}

export function StageCheck({
  lesson,
  savedAnswers = {},
  onSaveAnswer,
  onProceed,
}: StageCheckProps) {
  const { quiz } = lesson;
  const [answers, setAnswers] = useState<Record<string, string>>(savedAnswers);

  const handleSelectOption = (questionId: string, optionId: string) => {
    const updated = { ...answers, [questionId]: optionId };
    setAnswers(updated);
    onSaveAnswer(questionId, optionId);
  };

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === quiz.length;

  // Calculate score
  let correctCount = 0;
  quiz.forEach((q) => {
    const selected = answers[q.id];
    const opt = q.options.find((o) => o.id === selected);
    if (opt?.isCorrect) {
      correctCount += 1;
    }
  });

  const scorePct = Math.round((correctCount / quiz.length) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4 sm:py-6">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <HelpCircle className="h-3.5 w-3.5 text-accent" />
          Stage 5: Retrieval & Concept Check
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-950">
          Verify Your Understanding
        </h2>
        <p className="text-xs sm:text-sm text-ink-500">
          Answer the scenario questions below. Explanations for each choice are provided immediately.
        </p>
      </div>

      {/* Quiz Questions */}
      <div className="space-y-8">
        {quiz.map((q, qIdx) => {
          const selectedOptId = answers[q.id];
          const hasSelected = Boolean(selectedOptId);

          return (
            <div
              key={q.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5"
            >
              {/* Question Header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-ink-500">
                  <span>Question {qIdx + 1} of {quiz.length}</span>
                  {hasSelected && (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        q.options.find((o) => o.id === selectedOptId)?.isCorrect
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {q.options.find((o) => o.id === selectedOptId)?.isCorrect ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" /> Incorrect
                        </>
                      )}
                    </span>
                  )}
                </div>
                <h3 className="font-sans text-base font-semibold text-ink-950 leading-snug">
                  {q.question}
                </h3>
                {q.scenario && (
                  <p className="text-xs italic text-ink-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    Scenario: {q.scenario}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {q.options.map((opt) => {
                  const isSelected = selectedOptId === opt.id;
                  let borderBg = "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50";

                  if (hasSelected) {
                    if (opt.isCorrect) {
                      borderBg = "border-emerald-300 bg-emerald-50/60 text-emerald-950";
                    } else if (isSelected) {
                      borderBg = "border-rose-300 bg-rose-50/60 text-rose-950";
                    } else {
                      borderBg = "border-slate-100 bg-slate-50/40 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={hasSelected}
                      onClick={() => handleSelectOption(q.id, opt.id)}
                      className={`w-full text-left rounded-xl border p-4 transition flex items-start justify-between gap-3 ${borderBg}`}
                    >
                      <div className="space-y-1">
                        <span className="font-sans text-xs sm:text-sm font-medium leading-relaxed block">
                          {opt.text}
                        </span>

                        {/* Explanation revealed once an answer is chosen */}
                        {hasSelected && (isSelected || opt.isCorrect) && (
                          <span
                            className={`block text-[11px] leading-relaxed pt-1.5 ${
                              opt.isCorrect ? "text-emerald-800 font-medium" : "text-rose-800"
                            }`}
                          >
                            {opt.feedback}
                          </span>
                        )}
                      </div>

                      {hasSelected && (
                        <div className="mt-0.5 shrink-0">
                          {opt.isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : isSelected ? (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          ) : null}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Banner */}
      {isComplete && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-sans text-sm font-bold text-emerald-950">
                Quiz Complete: {correctCount} of {quiz.length} Correct ({scorePct}%)
              </h4>
              <p className="text-xs text-emerald-800">
                {scorePct === 100
                  ? "Flawless score! You have mastered the core mechanics of this lesson."
                  : "Great effort! Review the explanations above to reinforce tricky edge cases."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between border-t border-slate-200/80 pt-6">
        <div className="text-xs text-ink-500">
          {isComplete ? "All questions answered" : `${quiz.length - answeredCount} question(s) remaining`}
        </div>
        <button
          type="button"
          disabled={!isComplete}
          onClick={() => onProceed(scorePct)}
          className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-6 py-3 font-sans text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition active:brightness-95"
        >
          <span>See Takeaway & Next Steps</span>
          <ArrowRight className="h-4 w-4 text-accent" />
        </button>
      </div>
    </div>
  );
}
