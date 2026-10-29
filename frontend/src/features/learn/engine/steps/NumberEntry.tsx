import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import type { NumberEntryStep } from "../stepTypes";
import { GuideCharacter } from "../GuideCharacter";

interface NumberEntryProps {
  step: NumberEntryStep;
  isLastStep?: boolean;
  onAnswer: (value: number) => void;
  onContinue: (isCorrect: boolean) => void;
}

export function NumberEntry({ step, isLastStep = false, onAnswer, onContinue }: NumberEntryProps) {
  const [rawValue, setRawValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const numericValue = parseFloat(rawValue.replace(/,/g, ""));
  const isValid = !isNaN(numericValue) && rawValue.trim().length > 0;

  const isCorrect =
    submitted && numericValue >= step.correctMin && numericValue <= step.correctMax;

  const characterState = !submitted ? "thinking" : isCorrect ? "correct" : "incorrect";

  function handleSubmit() {
    if (!isValid) return;
    setSubmitted(true);
    onAnswer(numericValue);
  }

  function formatAnswer(v: number): string {
    if (step.formatAnswer) {
      return step.formatAnswer.replace("{value}", v.toLocaleString("en-IN"));
    }
    return `${step.unit}${v.toLocaleString("en-IN")}`;
  }

  return (
    <motion.div
      className="mx-auto flex min-h-[28rem] w-full max-w-2xl flex-col gap-5 py-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex items-start gap-3">
        <GuideCharacter state={characterState} size="sm" />
        <div>
          <p className="font-display text-base font-semibold text-ink-950 leading-snug">
            {step.question}
          </p>
          {step.helperText && (
            <p className="mt-1 font-sans text-sm text-ink-500">{step.helperText}</p>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-sans text-sm font-semibold text-ink-500">
          {step.unit}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={rawValue}
          onChange={(e) => !submitted && setRawValue(e.target.value)}
          disabled={submitted}
          placeholder="Enter your answer"
          aria-label={step.question}
          onKeyDown={(e) => e.key === "Enter" && !submitted && handleSubmit()}
          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-ink-300 font-sans text-base text-ink-950 bg-white focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:bg-ink-100 disabled:cursor-not-allowed transition-colors"
        />
      </div>

      {/* Hint toggle */}
      {step.hint && !submitted && (
        <button
          onClick={() => setShowHint((v) => !v)}
          className="flex items-center gap-1.5 font-sans text-xs font-medium text-accent self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          <Lightbulb size={14} />
          {showHint ? "Hide hint" : "Show hint"}
        </button>
      )}
      <AnimatePresence>
        {showHint && step.hint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-accent-soft rounded-xl px-4 py-3 overflow-hidden"
          >
            <p className="font-sans text-sm text-accent">{step.hint}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result reveal */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-4 flex gap-3 items-start ${
              isCorrect
                ? "bg-emerald-50 border border-emerald-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {isCorrect ? (
              <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-sans font-semibold text-sm text-ink-950 mb-1">
                {isCorrect ? "Correct!" : "Not quite"}
              </p>
              <p className="font-sans text-sm text-ink-700">{step.revealText}</p>
              <p className="font-sans text-xs text-ink-500 mt-1">
                Accepted range: {formatAnswer(step.correctMin)} — {formatAnswer(step.correctMax)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lesson-action-rail">
        <p className="mr-auto text-xs font-medium text-slate-600" aria-live="polite">{submitted ? "Answer checked. Review the explanation before you continue." : "Enter a number to check your answer."}</p>
        {!submitted ? (
          <button type="button" onClick={handleSubmit} disabled={!isValid} className="lesson-primary-action w-full sm:w-auto">Check answer<ArrowRight className="h-4 w-4" /></button>
        ) : (
          <button type="button" onClick={() => onContinue(isCorrect)} className="lesson-primary-action w-full sm:w-auto">{isLastStep ? "Finish lesson" : "Continue"}<ArrowRight className="h-4 w-4" /></button>
        )}
      </div>
    </motion.div>
  );
}
