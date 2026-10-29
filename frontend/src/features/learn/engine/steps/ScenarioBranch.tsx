import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import type { ScenarioBranchStep } from "../stepTypes";
import { GuideCharacter } from "../GuideCharacter";

interface ScenarioBranchProps {
  step: ScenarioBranchStep;
  isLastStep?: boolean;
  onAnswer: (choiceId: string) => void;
  onContinue: (isCorrect: boolean) => void;
}

export function ScenarioBranch({ step, isLastStep = false, onAnswer, onContinue }: ScenarioBranchProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  function handleSelect(choiceId: string) {
    if (revealed) return;
    setSelected(choiceId);
    setRevealed(true);
    onAnswer(choiceId);
  }

  function handleTryAgain() {
    setSelected(null);
    setRevealed(false);
  }

  const chosenOptimal = selected
    ? step.choices.find((c) => c.id === selected)?.isOptimal ?? false
    : false;

  const characterState = !revealed
    ? "idle"
    : chosenOptimal
    ? "celebrate"
    : "incorrect";

  return (
    <motion.div
      className="mx-auto flex min-h-[28rem] w-full max-w-2xl flex-col gap-5 py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-start gap-3">
        <GuideCharacter state={characterState} size="sm" />
        <div className="bg-ink-100 rounded-xl p-4 flex-1">
          <p className="font-sans text-sm text-ink-700 leading-relaxed">
            {step.scenario}
          </p>
        </div>
      </div>

      <p className="font-sans text-xs font-semibold uppercase tracking-widest text-ink-500">
        What would you do?
      </p>

      <div className="flex flex-col gap-3">
        {step.choices.map((choice, index) => {
          const isSelected = selected === choice.id;
          const isOptimal = choice.isOptimal;

          let chipStyle = "border-ink-300 bg-white text-ink-700 hover:border-accent";
          if (revealed && isOptimal) {
            chipStyle = "border-emerald-400 bg-emerald-50 text-emerald-900";
          } else if (revealed && isSelected && !isOptimal) {
            chipStyle = "border-red-300 bg-red-50 text-red-800";
          } else if (revealed && !isSelected && !isOptimal) {
            chipStyle = "border-amber-200 bg-amber-50 text-amber-800";
          }

          return (
            <motion.button
              key={choice.id}
              type="button"
              onClick={() => handleSelect(choice.id)}
              disabled={revealed}
              className={`w-full text-left p-4 rounded-xl border-2 font-sans text-sm font-medium transition-all disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${chipStyle}`}
            >
              <div className="flex items-start gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/30 text-[11px] font-bold">{String.fromCharCode(65 + index)}</span>
                <span>{choice.label}</span>
              </div>

              <AnimatePresence>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-current/20 overflow-hidden"
                  >
                    <div className="flex items-start gap-1.5">
                      {isOptimal ? (
                        <CheckCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <p className="text-xs leading-relaxed opacity-90">
                        {choice.consequence}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <div className="lesson-action-rail">
        <p className="mr-auto text-xs font-medium text-slate-600" aria-live="polite">{revealed ? (chosenOptimal ? "That choice protects the goal." : "Review the trade-off, then try another choice or continue.") : "Choose the option that best fits the situation."}</p>
        {revealed && !chosenOptimal && <button type="button" onClick={handleTryAgain} className="lesson-secondary-action w-full sm:w-auto"><RotateCcw className="h-4 w-4" />Try again</button>}
        <button type="button" disabled={!revealed} onClick={() => revealed && onContinue(chosenOptimal)} className="lesson-primary-action w-full sm:w-auto"><span>{revealed ? (isLastStep ? "Finish lesson" : "Continue") : "Choose an option"}</span><ArrowRight className="h-4 w-4" /></button>
      </div>
    </motion.div>
  );
}
