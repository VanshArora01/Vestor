import type { Lesson } from "../../types";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Sparkles,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Flame,
  Award,
} from "lucide-react";

interface StageActProps {
  lesson: Lesson;
  quizScorePct?: number;
  streakDays: number;
  onFinishLesson: () => void;
  onNextLesson?: () => void;
}

export function StageAct({
  lesson,
  quizScorePct = 100,
  streakDays,
  onFinishLesson,
  onNextLesson,
}: StageActProps) {
  const { act, sources, lastReviewed } = lesson;
  const earnedXp = 50 + Math.round((quizScorePct / 100) * 30);

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4 sm:py-6">
      {/* Celebration Header */}
      <div className="rounded-3xl border border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-sm">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-accent">
                Lesson Complete
              </span>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950">
                You've Mastered {lesson.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-1.5 text-xs font-bold text-accent shadow-2xs">
              <Sparkles className="h-4 w-4" />
              <span>+{earnedXp} XP</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-2xs">
              <Flame className="h-4 w-4 text-amber-600" />
              <span>{streakDays} Day Streak</span>
            </div>
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="space-y-3 border-t border-teal-100 pt-5">
          <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-ink-500">
            Core Actionable Takeaways
          </h3>
          <ul className="space-y-2.5">
            {act.keyTakeaways.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-ink-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Vestor Action Bridge */}
      {act.vestorBridge && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-ink-700">
              Apply in {act.vestorBridge.moduleBadge}
            </span>
            <span className="text-[11px] text-ink-500 italic">User-confirmed action only</span>
          </div>

          <div className="space-y-1">
            <h3 className="font-sans text-base font-bold text-ink-950">
              {act.vestorBridge.title}
            </h3>
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
              {act.vestorBridge.description}
            </p>
          </div>

          <div className="pt-2">
            <Link
              to={act.vestorBridge.route}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition active:brightness-95"
            >
              <span>{act.vestorBridge.actionLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Official References & Sources per Requirement 7 */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-ink-700" />
            <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-ink-700">
              Official Educational References
            </h4>
          </div>
          <span className="text-[10px] text-ink-500 font-medium">
            Last Reviewed: {lastReviewed}
          </span>
        </div>

        <div className="space-y-3">
          {sources.map((src, idx) => (
            <div key={idx} className="space-y-1">
              <a
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
              >
                <span>{src.title}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <p className="text-[11px] text-ink-500 leading-relaxed">
                {src.publisher} — {src.context}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Final Action Buttons */}
      <div className="flex items-center justify-between border-t border-slate-200/80 pt-6">
        <button
          type="button"
          onClick={onFinishLesson}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-ink-700 hover:bg-slate-50 transition"
        >
          <span>Return to Academy</span>
        </button>

        {onNextLesson && (
          <button
            type="button"
            onClick={onNextLesson}
            className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition active:brightness-95"
          >
            <span>Next Lesson</span>
            <ArrowRight className="h-4 w-4 text-accent" />
          </button>
        )}
      </div>
    </div>
  );
}
