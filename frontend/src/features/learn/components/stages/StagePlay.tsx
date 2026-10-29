import type { Lesson } from "../../types";
import { Budget503020Calculator } from "../calculators/Budget503020Calculator";
import { EmergencyRunwayCalculator } from "../calculators/EmergencyRunwayCalculator";
import { CompoundInterestCalculator } from "../calculators/CompoundInterestCalculator";
import { InflationCalculator } from "../calculators/InflationCalculator";
import { SipCalculator } from "../calculators/SipCalculator";
import { ArrowRight, Sliders } from "lucide-react";

interface StagePlayProps {
  lesson: Lesson;
  onProceed: () => void;
}

export function StagePlay({ lesson, onProceed }: StagePlayProps) {
  const { playConfig } = lesson;

  const renderCalculator = () => {
    switch (playConfig.calculatorType) {
      case "budget-50-30-20":
        return <Budget503020Calculator initialIncome={lesson.hook.defaultMonthlyIncome ?? 30000} />;
      case "emergency-runway":
        return <EmergencyRunwayCalculator />;
      case "compound-interest":
        return <CompoundInterestCalculator />;
      case "inflation":
        return <InflationCalculator />;
      case "sip-calculator":
        return <SipCalculator />;
      default:
        return <div>Simulator not configured.</div>;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4 sm:py-6">
      {/* Title */}
      <div className="space-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <Sliders className="h-3.5 w-3.5 text-accent" />
          Stage 4: Interactive Simulation
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-950">
          {playConfig.promptTitle}
        </h2>
        <p className="text-xs sm:text-sm text-ink-500">{playConfig.promptSubtitle}</p>
      </div>

      {/* Calculator Body */}
      {renderCalculator()}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between border-t border-slate-200/80 pt-6">
        <div className="text-xs text-ink-500">
          All calculations are deterministic and run locally in your browser.
        </div>
        <button
          type="button"
          onClick={onProceed}
          className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-6 py-3 font-sans text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition active:brightness-95"
        >
          <span>Test Your Knowledge</span>
          <ArrowRight className="h-4 w-4 text-accent" />
        </button>
      </div>
    </div>
  );
}
