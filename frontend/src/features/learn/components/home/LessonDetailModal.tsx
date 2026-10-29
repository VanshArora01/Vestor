import type { CatalogueLesson } from "../../data/curriculum";
import type { LessonId } from "../../types";
import { X, Clock, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

interface LessonDetailModalProps {
  lesson: CatalogueLesson | null;
  onClose: () => void;
  onStartLesson?: (id: LessonId) => void;
}

export function LessonDetailModal({
  lesson,
  onClose,
  onStartLesson,
}: LessonDetailModalProps) {
  if (!lesson) return null;

  const isAvailable = lesson.status === "available";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-xs animate-in fade-in-50 duration-200">
      <div
        className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xl animate-in zoom-in-95 duration-200 space-y-6"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-ink-900 transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-2 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
              {lesson.pathId}
            </span>
            <span className="rounded-full bg-teal-50 border border-teal-200/60 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {lesson.difficulty}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-500">
              <Clock className="h-3 w-3" />
              {lesson.estimatedMinutes}m
            </span>
            {isAvailable ? (
              <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                Interactive Lesson Available
              </span>
            ) : (
              <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                Planned Curriculum
              </span>
            )}
          </div>

          <h3 className="font-display text-xl sm:text-2xl font-bold text-ink-950 leading-tight">
            {lesson.title}
          </h3>
          <p className="text-xs text-ink-600 leading-relaxed">{lesson.description}</p>
        </div>

        {/* Quick Read Summary Box */}
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/50 p-4.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-900">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Quick-Read Executive Summary</span>
          </div>
          <p className="text-xs sm:text-sm text-teal-950 leading-relaxed">
            {lesson.quickSummary}
          </p>
        </div>

        {/* Tags / Topics Covered */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">
            Topics Covered
          </span>
          <div className="flex flex-wrap gap-1.5">
            {lesson.tags.map((t) => (
              <span
                key={t}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-ink-700 font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Regulatory Attribution */}
        {lesson.sourceAttribution && (
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <strong>Framework Source:</strong> {lesson.sourceAttribution}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-slate-50 transition"
          >
            Close
          </button>

          {isAvailable && onStartLesson ? (
            <button
              type="button"
              onClick={() => {
                onStartLesson(lesson.id as LessonId);
                onClose();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition active:brightness-95"
            >
              <span>Start Interactive Lesson</span>
              <ArrowRight className="h-3.5 w-3.5 text-accent" />
            </button>
          ) : (
            <span className="text-xs text-ink-500 italic">
              Full interactive lesson coming in next release
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
