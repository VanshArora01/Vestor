import { useState } from "react";
import type { Lesson } from "../../types";
import { Callout } from "../common/Callout";
import { ArrowRight, ArrowLeft, BookOpen, Check } from "lucide-react";

interface StageTeachProps {
  lesson: Lesson;
  onProceed: () => void;
}

export function StageTeach({ lesson, onProceed }: StageTeachProps) {
  const { teachSections } = lesson;
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  const currentSection = teachSections[activeSectionIndex];
  const isFirstSection = activeSectionIndex === 0;
  const isLastSection = activeSectionIndex === teachSections.length - 1;

  const handleNextSection = () => {
    if (!isLastSection) {
      setActiveSectionIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onProceed();
    }
  };

  const handlePrevSection = () => {
    if (!isFirstSection) {
      setActiveSectionIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4 sm:py-6">
      {/* Header & Step Dots */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
            <BookOpen className="h-3.5 w-3.5" />
            Stage 3: Core Financial Principles
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink-950 mt-1">
            {currentSection.title}
          </h2>
        </div>

        {/* Section Pill Stepper */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {teachSections.map((sec, idx) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSectionIndex(idx)}
              className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                idx === activeSectionIndex
                  ? "bg-ink-950 text-white"
                  : idx < activeSectionIndex
                    ? "bg-slate-100 text-ink-800 hover:bg-slate-200"
                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
              }`}
            >
              <span>{idx + 1}</span>
              {idx < activeSectionIndex && <Check className="h-3 w-3 text-accent" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content Body */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="space-y-4 text-sm sm:text-base leading-relaxed text-ink-700">
          {currentSection.paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>

        {/* Callout if present */}
        {currentSection.callout && (
          <Callout
            type={currentSection.callout.type}
            title={currentSection.callout.title}
            text={currentSection.callout.text}
          />
        )}

        {/* Key Takeaway box */}
        {currentSection.keyTakeaway && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm text-ink-900 font-medium">
            <strong>Takeaway:</strong> {currentSection.keyTakeaway}
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between border-t border-slate-200/80 pt-6">
        <button
          type="button"
          disabled={isFirstSection}
          onClick={handlePrevSection}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Previous Section</span>
        </button>

        <div className="text-xs text-ink-500 font-medium hidden sm:block">
          Section {activeSectionIndex + 1} of {teachSections.length}
        </div>

        <button
          type="button"
          onClick={handleNextSection}
          className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-6 py-2.5 font-sans text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition active:brightness-95"
        >
          <span>{isLastSection ? "Proceed to Simulator" : "Next Section"}</span>
          <ArrowRight className="h-4 w-4 text-accent" />
        </button>
      </div>
    </div>
  );
}
