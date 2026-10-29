import type { StepType } from "./stepTypes";
import { StoryCard } from "./steps/StoryCard";
import { PredictSlider } from "./steps/PredictSlider";
import { SortBuckets } from "./steps/SortBuckets";
import { BudgetBuilder } from "./steps/BudgetBuilder";
import { ScenarioBranch } from "./steps/ScenarioBranch";
import { MatchPairs } from "./steps/MatchPairs";
import { SpotTheMistake } from "./steps/SpotTheMistake";
import { NumberEntry } from "./steps/NumberEntry";
import { MiniSim } from "./steps/MiniSim";

interface StepRendererProps {
  step: StepType;
  onComplete: (answer: unknown, isCorrect?: boolean) => void;
  isLastStep?: boolean;
}

export function StepRenderer({ step, onComplete, isLastStep = false }: StepRendererProps) {
  switch (step.type) {
    case "story-card":
      return <StoryCard step={step} isLastStep={isLastStep} onContinue={() => onComplete(true, true)} />;

    case "predict-slider":
      return (
        <PredictSlider
          step={step}
          isLastStep={isLastStep}
          onComplete={(answer, isCorrect) => onComplete(answer, isCorrect)}
        />
      );

    case "sort-buckets":
      return (
        <SortBuckets
          step={step}
          isLastStep={isLastStep}
          onComplete={(score) => onComplete(score, score >= 70)}
        />
      );

    case "budget-builder":
      return (
        <BudgetBuilder
          step={step}
          isLastStep={isLastStep}
          onComplete={(percents, isCorrect) => onComplete(percents, isCorrect)}
        />
      );

    case "scenario-branch":
      return (
        <ScenarioBranch
          step={step}
          isLastStep={isLastStep}
          onAnswer={(_choiceId) => {}}
          onContinue={(correct) => onComplete(true, correct)}
        />
      );

    case "match-pairs":
      return (
        <MatchPairs
          step={step}
          isLastStep={isLastStep}
          onAnswer={() => {}}
          onContinue={(correct) => onComplete(true, correct)}
        />
      );

    case "spot-mistake":
      return (
        <SpotTheMistake
          step={step}
          isLastStep={isLastStep}
          onAnswer={(_stmtId) => {}}
          onContinue={(correct) => onComplete(true, correct)}
        />
      );

    case "number-entry":
      return (
        <NumberEntry
          step={step}
          isLastStep={isLastStep}
          onAnswer={(_val) => {}}
          onContinue={(correct) => onComplete(true, correct)}
        />
      );

    case "mini-sim":
      return <MiniSim step={step} isLastStep={isLastStep} onComplete={(val) => onComplete(val, true)} />;

    default:
      return (
        <div className="p-6 text-center text-ink-500 font-sans">
          Unknown interactive step type.
        </div>
      );
  }
}
