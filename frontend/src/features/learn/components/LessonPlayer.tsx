import { useState, useEffect } from "react";
import type { Lesson, StageId, LessonId } from "../types";
import { useLearnProgress } from "../hooks/useLearnProgress";
import { StageHook } from "./stages/StageHook";
import { StagePredict } from "./stages/StagePredict";
import { StageTeach } from "./stages/StageTeach";
import { StagePlay } from "./stages/StagePlay";
import { StageCheck } from "./stages/StageCheck";
import { StageAct } from "./stages/StageAct";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LessonPlayerProps {
  lesson: Lesson;
  onExit: () => void;
  onSelectLesson: (id: LessonId) => void;
  nextLessonId?: LessonId;
}

const STAGES: { id: StageId; label: string; number: number }[] = [
  { id: "hook", label: "Hook", number: 1 },
  { id: "predict", label: "Predict", number: 2 },
  { id: "teach", label: "Teach", number: 3 },
  { id: "play", label: "Play", number: 4 },
  { id: "check", label: "Check", number: 5 },
  { id: "act", label: "Act", number: 6 },
];

export function LessonPlayer({
  lesson,
  onExit,
  onSelectLesson,
  nextLessonId,
}: LessonPlayerProps) {
  const {
    state,
    getLessonProgress,
    setStage,
    recordPrediction,
    recordQuizAnswer,
    completeLesson,
  } = useLearnProgress();

  const progress = getLessonProgress(lesson.id);
  const [activeStage, setActiveStage] = useState<StageId>(progress.stage || "hook");

  // Keep state synced if lesson changes
  useEffect(() => {
    setActiveStage(progress.stage || "hook");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [lesson.id, progress.stage]);

  const activeStageIndex = STAGES.findIndex((s) => s.id === activeStage);

  const goToStage = (targetStage: StageId) => {
    setActiveStage(targetStage);
    setStage(lesson.id, targetStage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStage = () => {
    if (activeStageIndex < STAGES.length - 1) {
      goToStage(STAGES[activeStageIndex + 1].id);
    }
  };

  const handleQuizFinish = (scorePct: number) => {
    completeLesson(lesson.id, scorePct);
    goToStage("act");
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-ink-700 hover:bg-slate-50 hover:text-ink-950 transition active:brightness-95"
              aria-label="Return to Academy"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500 uppercase tracking-wider">
                  {lesson.category}
                </span>
                <span className="text-[11px] text-ink-400">•</span>
                <span className="text-[11px] font-medium text-ink-500">
                  {lesson.estimatedMinutes} min lesson
                </span>
              </div>
              <h1 className="font-display text-lg sm:text-xl font-bold text-ink-950 mt-0.5">
                {lesson.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {progress.isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
                <Check className="h-3.5 w-3.5" /> Completed
              </span>
            )}
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>{state.totalXp} Total XP</span>
            </div>
          </div>
        </div>

        {/* Responsive Stage Stepper */}
        <div className="border-t border-slate-100 pt-3">
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {STAGES.map((s, idx) => {
              const isCurrent = s.id === activeStage;
              const isCompleted = idx < activeStageIndex || progress.isCompleted;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStage(s.id)}
                  className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition ${
                    isCurrent
                      ? "bg-ink-950 text-white shadow-xs"
                      : isCompleted
                        ? "bg-slate-100/90 text-ink-800 hover:bg-slate-200"
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <span>{s.number}.</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  <span className="text-[9px] sm:hidden font-medium opacity-80 mt-0.5">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Stage Body with Smooth Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {activeStage === "hook" && (
            <StageHook lesson={lesson} onProceed={handleNextStage} />
          )}

          {activeStage === "predict" && (
            <StagePredict
              lesson={lesson}
              savedAnswer={progress.predictionAnswer}
              onSaveAnswer={(ans) => recordPrediction(lesson.id, ans)}
              onProceed={handleNextStage}
            />
          )}

          {activeStage === "teach" && (
            <StageTeach lesson={lesson} onProceed={handleNextStage} />
          )}

          {activeStage === "play" && (
            <StagePlay lesson={lesson} onProceed={handleNextStage} />
          )}

          {activeStage === "check" && (
            <StageCheck
              lesson={lesson}
              savedAnswers={progress.quizAnswers}
              onSaveAnswer={(qId, oId) => recordQuizAnswer(lesson.id, qId, oId)}
              onProceed={handleQuizFinish}
            />
          )}

          {activeStage === "act" && (
            <StageAct
              lesson={lesson}
              quizScorePct={progress.quizScore ?? 100}
              streakDays={state.streakDays}
              onFinishLesson={onExit}
              onNextLesson={nextLessonId ? () => onSelectLesson(nextLessonId) : undefined}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
