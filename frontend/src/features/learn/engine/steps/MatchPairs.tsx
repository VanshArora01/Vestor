import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, RotateCcw, ArrowRight } from "lucide-react";
import type { MatchPairsStep } from "../stepTypes";
import { GuideCharacter } from "../GuideCharacter";

interface MatchPairsProps {
  step: MatchPairsStep;
  isLastStep?: boolean;
  onAnswer: (matches: Record<string, string>) => void;
  onContinue: (isCorrect: boolean) => void;
}

export function MatchPairs({ step, isLastStep = false, onAnswer, onContinue }: MatchPairsProps) {
  // matches: termId -> definitionId
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const allMatched = step.pairs.every((p) => Boolean(matches[p.id]));

  // Build reverse mapping: defId -> termId for display
  const defToTerm = Object.fromEntries(
    Object.entries(matches).map(([termId, defId]) => [defId, termId])
  );

  const allCorrect =
    checked && step.pairs.every((p) => matches[p.id] === p.id);

  const characterState = !checked ? "thinking" : allCorrect ? "celebrate" : "correct";

  function handleTermClick(termId: string) {
    if (checked) return;
    setSelectedTermId((prev) => (prev === termId ? null : termId));
  }

  function handleDefClick(defId: string) {
    if (!selectedTermId || checked) return;
    // If definition is already paired to another term, remove old pairing
    setMatches((prev) => {
      const updated = { ...prev };
      // Clear previous term that had this def
      const prevTermWithThisDef = Object.keys(updated).find(
        (k) => updated[k] === defId
      );
      if (prevTermWithThisDef) delete updated[prevTermWithThisDef];
      updated[selectedTermId] = defId;
      return updated;
    });
    setSelectedTermId(null);
  }

  function handleCheck() {
    if (checked || !allMatched) return;
    setChecked(true);
    onAnswer(matches);
  }

  function handleTryAgain() {
    setChecked(false);
  }

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
        <p className="font-sans text-sm text-ink-700 leading-relaxed mt-2">
          {step.instruction}
        </p>
      </div>

      {selectedTermId && (
        <div className="text-center">
          <span className="font-sans text-xs font-semibold text-accent bg-accent-soft px-3 py-1 rounded-full">
            Now click a definition to pair with "
            {step.pairs.find((p) => p.id === selectedTermId)?.term}"
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
        {/* Terms column */}
        <div className="flex flex-col gap-2">
          <p className="font-sans text-xs font-semibold text-ink-500 uppercase tracking-widest mb-1">
            Terms
          </p>
          {step.pairs.map((pair) => {
            const isMatched = Boolean(matches[pair.id]);
            const isSelected = selectedTermId === pair.id;
            const isCorrect = checked && matches[pair.id] === pair.id;
            const isWrong = checked && isMatched && matches[pair.id] !== pair.id;

            return (
              <button
                type="button"
                key={pair.id}
                onClick={() => handleTermClick(pair.id)}
                disabled={checked}
                className={`p-3 rounded-lg text-left font-sans text-sm font-medium border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? "border-accent bg-accent-soft text-accent"
                    : isCorrect
                    ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                    : isWrong
                    ? "border-red-300 bg-red-50 text-red-800"
                    : isMatched
                    ? "border-ink-300 bg-ink-100 text-ink-700"
                    : "border-ink-300 bg-white text-ink-700 hover:border-accent"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isCorrect && <CheckCircle size={12} className="text-emerald-600 shrink-0" />}
                  {pair.term}
                </div>
              </button>
            );
          })}
        </div>

        {/* Definitions column */}
        <div className="flex flex-col gap-2">
          <p className="font-sans text-xs font-semibold text-ink-500 uppercase tracking-widest mb-1">
            Definitions
          </p>
          {step.pairs.map((pair) => {
            const isPaired = Boolean(defToTerm[pair.id]);
            const pairedTermId = defToTerm[pair.id];
            const isCorrect = checked && pairedTermId === pair.id;
            const isWrong = checked && isPaired && pairedTermId !== pair.id;

            return (
              <button
                type="button"
                key={pair.id}
                onClick={() => handleDefClick(pair.id)}
                disabled={checked}
                className={`p-3 rounded-lg text-left font-sans text-xs border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  selectedTermId && !checked
                    ? "border-accent/50 hover:border-accent cursor-pointer"
                    : isCorrect
                    ? "border-emerald-400 bg-emerald-50 text-emerald-900 font-medium"
                    : isWrong
                    ? "border-red-300 bg-red-50 text-red-800"
                    : isPaired
                    ? "border-ink-300 bg-ink-100 text-ink-700"
                    : "border-ink-300 bg-white text-ink-600 hover:border-ink-500"
                }`}
              >
                {pair.definition}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-4 ${allCorrect ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}
          >
            <p className="font-sans text-sm font-semibold text-ink-950">
              {allCorrect ? step.successMessage : "Some pairs are off — review the highlighted ones."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lesson-action-rail">
        <p className="mr-auto text-xs font-medium text-slate-600" aria-live="polite">{checked ? "Review the matched pairs before you continue." : allMatched ? "All terms have a match. Check your answer." : "Choose one term, then match its definition."}</p>
        {!checked ? (
          <button type="button" onClick={handleCheck} disabled={!allMatched} className="lesson-primary-action w-full sm:w-auto"><CheckCircle className="h-4 w-4" />Check matches</button>
        ) : (
          <>
            {!allCorrect && <button type="button" onClick={handleTryAgain} className="lesson-secondary-action w-full sm:w-auto"><RotateCcw className="h-4 w-4" />Try again</button>}
            <button type="button" onClick={() => onContinue(allCorrect)} className="lesson-primary-action w-full sm:w-auto">{isLastStep ? "Finish lesson" : "Continue"}<ArrowRight className="h-4 w-4" /></button>
          </>
        )}
      </div>
    </motion.div>
  );
}
