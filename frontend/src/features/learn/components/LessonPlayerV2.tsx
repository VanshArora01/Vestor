import { useRef, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import type { LessonV2, StepType } from "../engine/stepTypes";
import { StepRenderer } from "../engine/StepRenderer";
import { GuideCharacter } from "../engine/GuideCharacter";
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { sendMessage } from "../../../api/advisor";

interface LessonPlayerV2Props {
  lesson: LessonV2;
  initialStepIndex?: number;
  onExit: () => void;
  onLessonComplete: (lessonId: string, earnedXp: number, possibleXp: number) => void;
  onStepProgress?: (lessonId: string, stepIndex: number) => void;
}

export function LessonPlayerV2({
  lesson,
  initialStepIndex = 0,
  onExit,
  onLessonComplete,
  onStepProgress,
}: LessonPlayerV2Props) {
  const [currentStepIdx, setCurrentStepIdx] = useState(initialStepIndex);
  const [earnedXp, setEarnedXp] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const completedStepRef = useRef<string | null>(null);
  const reduceMotion = useReducedMotion();

  const steps = lesson.steps;
  const currentStep: StepType | undefined = steps[currentStepIdx];
  const totalSteps = steps.length;
  const progressPercent = totalSteps ? Math.round(((currentStepIdx + 1) / totalSteps) * 100) : 0;
  const awardedXp = 50 + Math.round((earnedXp / Math.max(lesson.totalXp, 1)) * 30);

  function handleStepComplete(_answer: unknown, isCorrect: boolean = true) {
    if (!currentStep) return;
    if (completedStepRef.current === currentStep.id) return;
    completedStepRef.current = currentStep.id;

    if (isCorrect) {
      setEarnedXp((prev) => prev + currentStep.xpReward);
    }

    if (currentStepIdx + 1 < totalSteps) {
      const next = currentStepIdx + 1;
      onStepProgress?.(lesson.id, next);
      setCurrentStepIdx(next);
    } else {
      setIsCompleted(true);
      const finalEarnedXp = earnedXp + (isCorrect ? currentStep.xpReward : 0);
      onLessonComplete(lesson.id, finalEarnedXp, lesson.totalXp);
    }
  }


  async function askVestor(question: string) {
    const prompt = question.trim();
    if (!prompt || assistantLoading || !currentStep) return;
    setAssistantQuestion(prompt);
    setAssistantAnswer("");
    setAssistantLoading(true);
    try {
      const response = await sendMessage({
        content: `Teach this learner about the current lesson step. Keep the reply under 100 words, use simple Indian financial examples and rupees, do not give investment recommendations or promise returns. If the learner asks for a hint, guide their reasoning without giving the final answer. Lesson: ${lesson.title}. Step: ${currentStepIdx + 1}/${totalSteps}, activity type: ${currentStep.type}. Learner asks: ${prompt}`,
        conversation_id: conversationId,
        page_context: {
          page: "learn",
          route_title: lesson.title,
          selected_item_id: lesson.id,
          metadata: { lesson_id: lesson.id, lesson_title: lesson.title, step_number: currentStepIdx + 1, step_type: currentStep.type },
        },
      });
      setConversationId(response.conversation_id);
      setAssistantAnswer(response.assistant_message.content);
    } catch {
      setAssistantAnswer("Ask Vestor is unavailable right now. You can keep going with the lesson; its examples and activities work without the assistant.");
    } finally {
      setAssistantLoading(false);
    }
  }

  if (isCompleted) {
    return (
      <MotionConfig reducedMotion="user">
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[2rem] bg-[#121A15] px-6 py-10 text-center text-white shadow-lg sm:px-12 sm:py-14"
          >
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-10 h-44 w-44 rounded-full border border-white/10" />
            <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
              <GuideCharacter state="celebrate" size="lg" />
              <div className="inline-flex items-center gap-2 rounded-full border border-[#B9F2D2]/30 bg-[#B9F2D2]/10 px-3 py-1.5 font-sans text-xs font-bold text-[#B9F2D2]">
                <CheckCircle2 className="h-4 w-4" /> Learning milestone reached
              </div>
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                You finished {lesson.title}
              </h1>
              <p className="max-w-lg font-sans text-sm leading-relaxed text-[#D0DDD5]">
                Your progress is saved. Keep building the money habits that fit your life.
              </p>
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-sans font-bold text-white">
                <Sparkles className="h-5 w-5 text-[#B9F2D2]" />
                <span>+{awardedXp} XP earned</span>
              </div>
              <button type="button" onClick={onExit} className="lesson-primary-action mt-1 min-w-52 bg-[#B9F2D2] text-[#102319] hover:bg-white">
                Back to learning path <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.section>
        </main>
      </MotionConfig>
    );
  }

  if (!currentStep) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12 text-center">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6" role="alert">
          <h1 className="font-display text-2xl font-semibold text-ink-950">This lesson is unavailable</h1>
          <p className="mt-2 text-sm text-ink-700">Return to the learning path and choose another lesson.</p>
          <button type="button" onClick={onExit} className="lesson-primary-action mt-5">Back to learning path</button>
        </section>
      </main>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="relative overflow-hidden rounded-[1.75rem] bg-[#121A15] px-5 py-5 text-white shadow-lg sm:px-8 sm:py-6">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border border-white/10" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={onExit} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#D0DDD5] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9F2D2]">
                <ArrowLeft className="h-4 w-4" /><span>Exit lesson</span>
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#D0DDD5]"><Sparkles className="h-3.5 w-3.5 text-[#B9F2D2]" />{currentStep.xpReward} XP this step</span>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="max-w-3xl font-display text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">{lesson.title}</h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#C4D2CA]">{lesson.subtitle}</p>
              </div>
              <p className="shrink-0 rounded-lg bg-[#B9F2D2] px-3 py-2 font-sans text-sm font-bold tabular-nums text-[#102319]">Step {currentStepIdx + 1}<span className="font-medium text-[#365244]"> / {totalSteps}</span></p>
            </div>
            <div className="mt-5" role="progressbar" aria-label="Lesson progress" aria-valuenow={currentStepIdx + 1} aria-valuemin={1} aria-valuemax={Math.max(totalSteps, 1)}>
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#C4D2CA]"><span>Your progress</span><span className="tabular-nums">{progressPercent}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <motion.div className="h-full rounded-full bg-[#B9F2D2]" initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: reduceMotion ? 0 : 0.25 }} />
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.section
            key={currentStep.id}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            aria-label={`Lesson step ${currentStepIdx + 1}`}
            className="mt-5 min-h-[34rem] rounded-[1.75rem] border border-[#DCE4DF] bg-[#F8FAFC] p-3 shadow-sm sm:p-6"
          >
            <StepRenderer step={currentStep} onComplete={handleStepComplete} isLastStep={currentStepIdx === totalSteps - 1} />
          </motion.section>
        </AnimatePresence>

        <section className="mt-4 rounded-2xl border border-[#DCE4DF] bg-white p-4 sm:p-5" aria-label="Ask Vestor about this lesson step">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#0F766E]"><Sparkles className="h-5 w-5" /></span>
              <div><h2 className="font-sans text-sm font-bold text-[#0B1220]">Need a hand with this step?</h2><p className="mt-0.5 text-xs text-[#64748B]">Ask Vestor for a hint or another rupee example.</p></div>
            </div>
            <button type="button" onClick={() => setAssistantOpen((open) => !open)} aria-expanded={assistantOpen} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#0F766E] px-4 py-2.5 text-sm font-semibold text-[#0F766E] transition-colors hover:bg-[#F0FDFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2">
              {assistantOpen ? "Close help" : "Ask Vestor"}<ArrowRight className={`h-4 w-4 transition-transform ${assistantOpen ? "rotate-90" : ""}`} />
            </button>
          </div>
          {assistantOpen && <div className="mt-4 border-t border-[#E7ECE9] pt-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {["Explain this simply", "Give me a rupee example", "Give me a hint"].map((prompt) => <button key={prompt} type="button" disabled={assistantLoading} onClick={() => void askVestor(prompt)} className="min-h-10 rounded-lg border border-[#DCE4DF] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#334155] transition-colors hover:border-[#0F766E] hover:bg-[#F0FDFA] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]">{prompt}</button>)}
            </div>
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void askVestor(assistantQuestion); }}>
              <input value={assistantQuestion} onChange={(event) => setAssistantQuestion(event.target.value)} maxLength={500} placeholder="Ask a follow-up about this idea" aria-label="Ask Vestor about the current lesson step" className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#0B1220] placeholder:text-[#64748B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]" />
              <button type="submit" disabled={assistantLoading || !assistantQuestion.trim()} className="lesson-primary-action sm:min-w-24">{assistantLoading ? "Thinking…" : "Ask"}</button>
            </form>
            {assistantLoading && <p className="mt-3 text-sm text-[#475569]" role="status" aria-live="polite">Vestor is preparing a hint…</p>}
            {assistantAnswer && <p className="mt-3 max-w-prose text-sm leading-relaxed text-[#334155]" role="status">{assistantAnswer}</p>}
          </div>}
        </section>
      </main>
    </MotionConfig>
  );
}
