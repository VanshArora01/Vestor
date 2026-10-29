import { Sparkles, Flame, CheckCircle2, BookOpen } from "lucide-react";
import { useVestorAI } from "../../../context/VestorAIContext";

interface LearnHeaderProps {
  completedCount: number;
  totalCount: number;
  streakDays: number;
  totalXp: number;
}

export function LearnHeader({
  completedCount,
  totalCount,
  streakDays,
  totalXp,
}: LearnHeaderProps) {
  const { openFloating, sendMessage } = useVestorAI();

  return (
    <div className="space-y-6">
      {/* Title & Floating AI Trigger */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-ink-700 mb-2">
            <BookOpen className="h-3.5 w-3.5 text-accent" />
            <span>Interactive Financial Education</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink-950">
            Vestor Financial Academy
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-ink-500 leading-relaxed">
            Master the core mechanics of Indian personal finance. Learn through verified frameworks,
            interactive simulators, retrieval questions, and direct links to your financial plan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            openFloating();
            void sendMessage("Give me an overview of the core personal finance principles in India");
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-ink-800 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition active:brightness-95"
        >
          <Sparkles className="h-4 w-4 text-accent" />
          <span>Ask Vestor AI</span>
        </button>
      </div>

      {/* Stats KPI Strip */}
      <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100/70 text-accent">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-ink-500 block">Lessons Completed</span>
            <span className="font-display text-lg sm:text-xl font-bold text-ink-950">
              {completedCount} of {totalCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-x border-slate-200 px-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100/70 text-amber-700">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-ink-500 block">Learning Streak</span>
            <span className="font-display text-lg sm:text-xl font-bold text-ink-950">
              {streakDays} {streakDays === 1 ? "Day" : "Days"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 text-blue-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-ink-500 block">Total Experience</span>
            <span className="font-display text-lg sm:text-xl font-bold text-ink-950">
              {totalXp} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
