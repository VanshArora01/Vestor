// ============================================================
// StoryCard — Narrative step with speech bubble from Aisha
// ============================================================

import { motion } from "framer-motion";
import { GuideCharacterWithLabel } from "../GuideCharacter";
import type { StoryCardStep } from "../stepTypes";
import { ArrowRight } from "lucide-react";

interface StoryCardProps {
  step: StoryCardStep;
  isLastStep?: boolean;
  onContinue: () => void;
}

export function StoryCard({ step, isLastStep = false, onContinue }: StoryCardProps) {
  const charState = step.characterState ?? "idle";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="mx-auto flex min-h-[28rem] w-full max-w-2xl flex-col gap-6 py-4"
    >
      {step.title && (
        <motion.h2
          className="text-center font-display text-2xl font-bold leading-tight text-ink-950"
        >
          {step.title}
        </motion.h2>
      )}

      {/* Character + Speech bubble */}
      <div className="grid w-full grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:items-center sm:gap-5">
        <div className="flex justify-center">
          <GuideCharacterWithLabel state={charState} size="sm" />
        </div>

        {/* Speech bubble */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="relative min-w-0 rounded-2xl border border-[#DCE4DF] bg-white p-5 shadow-sm sm:p-7"
        >
          {/* Bubble tail (hidden on mobile, shown sm+) */}
          <div className="hidden sm:block absolute -left-2.5 bottom-6 w-0 h-0 border-t-8 border-b-0 border-r-8 border-t-transparent border-b-transparent border-r-[#DCE4DF]" />

          <p className="font-sans text-sm leading-relaxed text-ink-700 whitespace-pre-line">
            {step.narrative}
          </p>
        </motion.div>
      </div>

      {/* Continue button */}
      <div className="lesson-action-rail">
        <p className="mr-auto hidden text-xs font-medium text-slate-500 sm:block">A short story to set the scene</p>
        <button type="button" onClick={onContinue} className="lesson-primary-action w-full sm:w-auto">
          {step.continueLabel ?? (isLastStep ? "Finish lesson" : "Continue")}<ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
