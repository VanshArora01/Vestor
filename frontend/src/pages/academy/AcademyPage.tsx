import { Component, useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, Check, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";
import { BUDGETING_50_30_20_LESSON, CURRICULUM_WORLDS, LESSONS_V2 } from "../../features/learn/data/lessons-v2/budgeting-50-30-20";
import type { LessonV2 } from "../../features/learn/engine/stepTypes";
import { WorldMap, type WorldMapNode } from "../../features/learn/components/WorldMap";
import { LessonPlayerV2 } from "../../features/learn/components/LessonPlayerV2";
import { useLearnProgress } from "../../features/learn/hooks/useLearnProgress";
import { useRegisterPageContext } from "../../context/PageContext";

const worldIcons = [BookOpen, ShieldCheck, Sparkles];

function AcademyPageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeLessonId = searchParams.get("lesson");
  const { state, completeLesson, setLessonStep } = useLearnProgress();
  const activeLesson = LESSONS_V2.find((lesson) => lesson.id === activeLessonId);
  const firstIncomplete = LESSONS_V2.find((lesson) => !state.completedLessons.includes(lesson.id)) ?? BUDGETING_50_30_20_LESSON;
  const overallProgress = Math.round((state.completedLessons.filter((id) => LESSONS_V2.some((lesson) => lesson.id === id)).length / LESSONS_V2.length) * 100);

  useRegisterPageContext({
    page: "learn",
    route_title: activeLesson?.title ?? "Vestor Learn",
    metadata: {
      active_lesson: activeLesson?.title ?? "Learning worlds",
      lesson_step: activeLesson ? (state.lessonProgress[activeLesson.id]?.stepIndex ?? 0) + 1 : 0,
      total_xp: state.totalXp,
      streak_days: state.streakDays,
    },
    suggestedPrompts: [
      activeLesson ? `Explain ${activeLesson.title} in a simple Indian example` : "Help me choose a first money lesson",
      "Give me a hint without revealing the answer",
    ],
  });

  const worldMaps = useMemo(() => CURRICULUM_WORLDS.map((world) => {
    const lessons = world.lessonIds.map((id) => LESSONS_V2.find((lesson) => lesson.id === id)).filter((lesson): lesson is LessonV2 => Boolean(lesson));
    const firstOpenIndex = LESSONS_V2.findIndex((lesson) => !state.completedLessons.includes(lesson.id));
    const nodes: WorldMapNode[] = lessons.map((lesson, index) => {
      const globalIndex = LESSONS_V2.findIndex((candidate) => candidate.id === lesson.id);
      const completed = state.completedLessons.includes(lesson.id);
      const stateValue: WorldMapNode["state"] = completed ? "completed" : globalIndex === firstOpenIndex ? "current" : globalIndex < firstOpenIndex ? "available" : "locked";
      return {
        id: lesson.id,
        lessonId: lesson.id,
        label: lesson.title.length > 22 ? `${lesson.title.slice(0, 20)}…` : lesson.title,
        type: index === lessons.length - 1 ? "boss" : "lesson",
        position: { x: [24, 76, 35, 65][index] ?? 50, y: [8, 32, 58, 84][index] ?? 90 },
        state: stateValue,
        xpReward: lesson.totalXp,
      };
    });
    return { world, lessons, nodes };
  }), [state.completedLessons]);

  function startLesson(lessonId: string) {
    setSearchParams({ lesson: lessonId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exitLesson() {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (activeLesson) {
    return <LessonPlayerV2
      lesson={activeLesson}
      initialStepIndex={Math.min(state.lessonProgress[activeLesson.id]?.stepIndex ?? 0, activeLesson.steps.length - 1)}
      onExit={exitLesson}
      onStepProgress={setLessonStep}
      onLessonComplete={(lessonId, earnedXp, possibleXp) => completeLesson(lessonId, Math.round((earnedXp / Math.max(possibleXp, 1)) * 100))}
    />;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#121A15] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-1 -top-14 h-52 w-52 rounded-full border border-white/10" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div className="max-w-2xl">
            <h1 className="max-w-xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Small decisions. Stronger money habits.</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#D0DDD5]">Learn with real rupee examples, try the choices yourself, and keep what works for your life.</p>
            <button type="button" onClick={() => startLesson(firstIncomplete.id)} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#B9F2D2] px-5 py-3 text-sm font-bold text-[#102319] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#121A15]">
              {state.completedLessons.length ? "Continue learning" : "Start with the basics"}<ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-white/15 pt-5 lg:border-l lg:border-t-0 lg:pl-7">
            <div><p className="text-2xl font-bold tabular-nums">{state.completedLessons.filter((id) => LESSONS_V2.some((lesson) => lesson.id === id)).length}<span className="text-base font-medium text-[#B8C8BF]"> / 12</span></p><p className="mt-1 text-xs text-[#C4D2CA]">lessons completed</p></div>
            <div><p className="flex items-center gap-2 text-2xl font-bold tabular-nums"><Zap className="h-5 w-5 text-[#B9F2D2]" />{state.totalXp}</p><p className="mt-1 text-xs text-[#C4D2CA]">earned XP</p></div>
            <div className="col-span-2">
              <div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium text-[#E1E9E4]">Your learning path</span><span className="tabular-nums text-[#C4D2CA]">{overallProgress}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Curriculum progress" aria-valuenow={overallProgress} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[#B9F2D2] transition-[width] duration-300" style={{ width: `${overallProgress}%` }} /></div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-display text-2xl font-semibold tracking-tight text-[#0B1220]">Choose your next step</h2><p className="mt-1 text-sm text-[#64748B]">Three guided worlds, twelve practical lessons.</p></div>
        <p className="text-xs font-medium text-[#64748B]">Progress saves as you learn</p>
      </div>

      <section className="grid gap-5 lg:grid-cols-3" aria-label="Learning worlds">
        {worldMaps.map(({ world, lessons, nodes }, worldIndex) => {
          const Icon = worldIcons[worldIndex];
          const done = lessons.filter((lesson) => state.completedLessons.includes(lesson.id)).length;
          const next = lessons.find((lesson) => nodes.find((node) => node.lessonId === lesson.id)?.state === "current");
          return <article key={world.id} className="overflow-hidden rounded-2xl border border-[#DCE4DF] border-t-[3px] bg-white shadow-sm transition-shadow hover:shadow-md" style={{ borderTopColor: world.color }}>
            <header className="border-b border-[#E7ECE9] px-5 pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${world.color}15`, color: world.color }}><Icon className="h-4 w-4" /></span>
                  <div><h3 className="font-display text-xl font-semibold text-[#0B1220]">{world.title}</h3><p className="mt-1 text-xs leading-relaxed text-[#64748B]">{world.description}</p></div>
                </div>
                <span className="shrink-0 rounded-lg bg-[#F1F5F2] px-2.5 py-1.5 text-xs font-bold tabular-nums text-[#334155]">{done} / 4</span>
              </div>
            </header>
            {next && <button type="button" onClick={() => startLesson(next.id)} className="mx-5 mt-4 flex min-h-[3.75rem] w-[calc(100%-2.5rem)] items-center justify-between rounded-xl bg-[#F0FDFA] px-3.5 py-3 text-left text-sm font-semibold text-[#115E59] transition-colors hover:bg-[#CCFBF1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]">
              <span><span className="block text-[10px] font-bold uppercase tracking-wide text-[#0F766E]">Pick up here</span>{next.title}</span><ArrowRight className="h-4 w-4 shrink-0" />
            </button>}
            <div className="mx-auto w-full max-w-[340px] px-2 py-1" aria-label={`${world.title} lesson map`}>
              <WorldMap nodes={nodes} onSelectNode={startLesson} />
            </div>
            <footer className="flex items-center justify-between border-t border-[#E7ECE9] px-5 py-3 text-xs text-[#64748B]">
              <span>{done === 4 ? "World complete" : `${4 - done} lessons to go`}</span>
              {done === 4 && <span className="inline-flex items-center gap-1 font-semibold text-[#0F766E]"><Check className="h-3.5 w-3.5" />Complete</span>}
              {worldIndex === 2 && done < 4 && <span className="inline-flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />Build foundations first</span>}
            </footer>
          </article>;
        })}
      </section>

      <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-[#64748B]">Learning examples are illustrative, not financial advice. Investments can lose value; past performance does not guarantee future returns.</p>
    </main>
  );
}

class AcademyPageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("Learn page render failed", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center" role="alert">
          <h1 className="text-lg font-semibold text-[#0B1220]">Learn couldn’t load this time</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#475569]">Your saved progress is still safe. Reload Learn to try again.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#115E59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2">Reload Learn</button>
        </section>
      );
    }
    return this.props.children;
  }
}

export function AcademyPage() {
  return <AcademyPageBoundary><AcademyPageContent /></AcademyPageBoundary>;
}
