// ============================================================
// PredictSlider — Prediction + reveal interaction
// ============================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GuideCharacter } from "../GuideCharacter";
import type { PredictSliderStep } from "../stepTypes";
import { isNumericAnswerCorrect } from "../lessonEngine";
import { CheckCircle, XCircle, Lock, ArrowRight } from "lucide-react";

interface PredictSliderProps {
  step: PredictSliderStep;
  isLastStep?: boolean;
  onComplete: (answer: number, correct: boolean) => void;
}

export function PredictSlider({ step, isLastStep = false, onComplete }: PredictSliderProps) {
  const [value, setValue] = useState(step.defaultValue);
  const [locked, setLocked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const unitIsPrefix = step.unitPosition === "prefix";
  const displayValue = unitIsPrefix
    ? `${step.unit}${value.toLocaleString("en-IN")}`
    : `${value}${step.unit}`;

  const pct = ((value - step.min) / (step.max - step.min)) * 100;

  function handleLock() {
    const correct = isNumericAnswerCorrect(value, step.correctMin, step.correctMax);
    setIsCorrect(correct);
    setLocked(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex min-h-[28rem] flex-col gap-6"
    >
      {/* Character header */}
      <div className="flex items-start gap-3">
        <GuideCharacter
          state={locked ? (isCorrect ? "correct" : "incorrect") : (step.characterState ?? "thinking")}
          size="sm"
        />
        <div className="flex-1">
          <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-accent">
            Prediction
          </p>
          <h3 className="font-display text-lg font-bold text-ink-950 leading-snug">
            {step.question}
          </h3>
          {step.helperText && (
            <p className="mt-1 font-sans text-xs text-ink-500">{step.helperText}</p>
          )}
        </div>
      </div>

      {/* Slider card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {/* Value display */}
        <div className="mb-6 text-center">
          <span className="font-display text-5xl font-bold text-accent tabular-nums">
            {displayValue}
          </span>
        </div>

        {/* Range slider */}
        <div className="relative">
          <input
            type="range"
            min={step.min}
            max={step.max}
            step={step.step}
            value={value}
            disabled={locked}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label={step.question}
            className="w-full h-2 appearance-none rounded-full outline-none disabled:opacity-60"
            style={{
              background: `linear-gradient(to right, #0F766E ${pct}%, #E2E8F0 ${pct}%)`,
              cursor: locked ? "default" : "pointer",
            }}
          />
          <div className="mt-2 flex justify-between font-sans text-xs text-ink-500">
            <span>{unitIsPrefix ? `${step.unit}${step.min}` : `${step.min}${step.unit}`}</span>
            <span>{unitIsPrefix ? `${step.unit}${step.max}` : `${step.max}${step.unit}`}</span>
          </div>
        </div>

      </div>

      {/* Reveal */}
      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`rounded-2xl border p-5 ${
              isCorrect
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {isCorrect ? (
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              )}
              <div>
                <p className={`font-sans text-sm font-semibold ${isCorrect ? "text-emerald-800" : "text-amber-800"}`}>
                  {isCorrect ? "You're right." : "Close — here's the answer:"}
                </p>
                <p className="mt-1 font-sans text-sm leading-relaxed text-ink-700">
                  {step.revealText}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lesson-action-rail">
        <p className="mr-auto hidden text-xs font-medium text-slate-500 sm:block">{locked ? "Prediction locked. Review the explanation, then continue." : "Move the slider, then lock in your estimate."}</p>
        {!locked ? (
          <button type="button" onClick={handleLock} className="lesson-primary-action w-full sm:w-auto"><Lock className="h-4 w-4" />Lock my prediction</button>
        ) : (
          <button type="button" onClick={() => onComplete(value, Boolean(isCorrect))} className="lesson-primary-action w-full sm:w-auto">{isLastStep ? "Finish lesson" : "Continue"}<ArrowRight className="h-4 w-4" /></button>
        )}
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: #0F766E;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(15,118,110,0.35);
        }
        input[type=range]:disabled::-webkit-slider-thumb { cursor: default; }
      `}</style>
    </motion.div>
  );
}
