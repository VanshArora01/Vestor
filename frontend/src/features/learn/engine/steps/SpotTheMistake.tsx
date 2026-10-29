import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, RotateCcw, ArrowRight } from "lucide-react";
import type { SpotTheMistakeStep } from "../stepTypes";
import { GuideCharacter } from "../GuideCharacter";

interface SpotTheMistakeProps {
  step: SpotTheMistakeStep;
  isLastStep?: boolean;
  onAnswer: (statementId: string) => void;
  onContinue: (isCorrect: boolean) => void;
}

export function SpotTheMistake({ step, isLastStep = false, onAnswer, onContinue }: SpotTheMistakeProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  function handleSelect(statementId: string) {
    if (revealed) return;
    setSelected(statementId);
    setRevealed(true);
    onAnswer(statementId);
  }

  function handleTryAgain() {
    setSelected(null);
    setRevealed(false);
  }

  const selectedStatement = step.statements.find((s) => s.id === selected);
  const gotItRight = selectedStatement?.isMistake ?? false;

  const characterState = !revealed ? "thinking" : gotItRight ? "correct" : "incorrect";

  return (
    <motion.div
      className="mx-auto flex min-h-[28rem] w-full max-w-2xl flex-col gap-5 py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-start gap-3">
        <GuideCharacter state={characterState} size="sm" />
        <div className="bg-ink-100 rounded-xl p-4 flex-1">
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">
            Scenario
          </p>
          <p className="font-sans text-sm text-ink-700 leading-relaxed">
            {step.scenario}
          </p>
        </div>
      </div>

      <p className="font-sans text-sm font-semibold text-ink-900">{step.instruction}</p>

      <div className="flex flex-col gap-2.5">
        {step.statements.map((statement) => {
          const isSelected = selected === statement.id;
          const isMistake = statement.isMistake;

          let chipClass =
            "border-ink-300 bg-white text-ink-700 hover:border-accent";
          if (revealed) {
            if (isMistake) {
              chipClass = isSelected
                ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                : "border-red-300 bg-red-50 text-red-800 opacity-60";
            } else {
              chipClass = "border-ink-200 bg-ink-50 text-ink-500 opacity-60";
            }
          }

          return (
            <motion.button
              key={statement.id}
              type="button"
              onClick={() => handleSelect(statement.id)}
              disabled={revealed}
              className={`w-full text-left p-4 rounded-xl border-2 font-sans text-sm transition-all disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${chipClass}`}
            >
              <div className="flex items-start gap-2">
                {revealed && isMistake ? (
                  <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                ) : revealed ? (
                  <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-current mt-0.5 shrink-0" />
                )}
                <div>
                  <p>{statement.text}</p>
                  <AnimatePresence>
                    {revealed && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2 text-xs text-ink-600 leading-relaxed overflow-hidden"
                      >
                        {statement.explanation}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="lesson-action-rail">
        <p className="mr-auto text-xs font-medium text-slate-600" aria-live="polite">{revealed ? (gotItRight ? "You spotted the flawed idea." : "Review the explanation, then try again or continue.") : "Choose the statement that contains the mistake."}</p>
        {revealed && !gotItRight && <button type="button" onClick={handleTryAgain} className="lesson-secondary-action w-full sm:w-auto"><RotateCcw className="h-4 w-4" />Try again</button>}
        <button type="button" disabled={!revealed} onClick={() => revealed && onContinue(gotItRight)} className="lesson-primary-action w-full sm:w-auto">{revealed ? (isLastStep ? "Finish lesson" : "Continue") : "Choose a statement"}<ArrowRight className="h-4 w-4" /></button>
      </div>
    </motion.div>
  );
}
