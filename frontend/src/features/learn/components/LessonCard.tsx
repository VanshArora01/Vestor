import type { Lesson, LessonId } from "../types";
import { useLearnProgress } from "../hooks/useLearnProgress";
import { Clock, ArrowRight, CheckCircle2, Play, BookOpen } from "lucide-react";

interface LessonCardProps {
  lesson: Lesson;
  onSelect: (id: LessonId) => void;
}

export function LessonCard({ lesson, onSelect }: LessonCardProps) {
  const { getLessonProgress } = useLearnProgress();
  const progress = getLessonProgress(lesson.id);

  const STAGE_ORDER = ["hook", "predict", "teach", "play", "check", "act"];
  const currentStageIndex = STAGE_ORDER.indexOf(progress.stage) + 1;
  const progressPercent = progress.isCompleted
    ? 100
    : Math.round((currentStageIndex / STAGE_ORDER.length) * 100);

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-slate-300 hover:shadow-md transition group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
            {lesson.category}
          </span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-500">
              <Clock className="h-3 w-3" />
              {lesson.estimatedMinutes}m
            </span>
            <span className="rounded-full bg-teal-50 border border-teal-200/60 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {lesson.difficulty}
            </span>
          </div>
        </div>

        {/* Title & Subtitle */}
        <h3 className="font-display text-lg font-bold text-ink-950 group-hover:text-accent transition leading-snug mb-2">
          {lesson.title}
        </h3>
        <p className="text-xs text-ink-600 leading-relaxed mb-5">
          {lesson.subtitle}
        </p>

        {/* Simulator highlight pill */}
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-ink-700">
          <Play className="h-3 w-3 text-accent" />
          <span>Interactive: {lesson.playConfig.promptTitle}</span>
        </div>
      </div>

      {/* Bottom Progress & Action CTA */}
      <div className="border-t border-slate-100 pt-4 space-y-3">
        {/* Progress Bar */}
        {progress.isCompleted ? (
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Mastered
            </span>
            {progress.quizScore !== undefined && (
              <span className="text-[11px] text-emerald-600">{progress.quizScore}% Quiz Score</span>
            )}
          </div>
        ) : currentStageIndex > 1 ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium text-ink-500">
              <span>In Progress (Stage {currentStageIndex}/6)</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] font-medium text-ink-400">
            <BookOpen className="h-3.5 w-3.5" />
            <span>6 interactive stages</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={() => onSelect(lesson.id)}
          className={`inline-flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold transition active:brightness-95 ${
            progress.isCompleted
              ? "border border-slate-200 bg-white text-ink-800 hover:bg-slate-50"
              : currentStageIndex > 1
                ? "bg-accent text-white hover:bg-teal-800 shadow-xs"
                : "border border-slate-200 bg-ink-950 text-white hover:bg-slate-800 shadow-xs"
          }`}
        >
          <span>
            {progress.isCompleted
              ? "Review Lesson"
              : currentStageIndex > 1
                ? "Resume Lesson"
                : "Start Lesson"}
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
