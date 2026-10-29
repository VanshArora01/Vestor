// Discriminated union of all interactive step types

export type SimType =
  | "compound-growth"
  | "sip-returns"
  | "inflation-erosion"
  | "emi-breakdown";

export interface BaseStep {
  id: string;
  type: string;
  xpReward: number;
  characterState?: "idle" | "thinking" | "correct" | "incorrect" | "celebrate";
}

export interface StoryCardStep extends BaseStep {
  type: "story-card";
  narrative: string;
  title?: string;
  image?: string;
  continueLabel?: string;
}

export interface PredictSliderStep extends BaseStep {
  type: "predict-slider";
  question: string;
  helperText?: string;
  unit: string;
  unitPosition?: "prefix" | "suffix";
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  correctMin: number;
  correctMax: number;
  revealText: string;
}

export interface SortBucketsStep extends BaseStep {
  type: "sort-buckets";
  instruction: string;
  buckets: { id: string; label: string; color: string }[];
  items: { id: string; label: string; correctBucketId: string; hint?: string; explanation?: string }[];
  successMessage: string;
}

export interface BudgetBuilderStep extends BaseStep {
  type: "budget-builder";
  instruction: string;
  income: number;
  categories: {
    id: string;
    label: string;
    color: string;
    defaultPercent: number;
    minPercent: number;
    maxPercent: number;
  }[];
  targetPercents: Record<string, number>;
  successMessage: string;
}

export interface ScenarioBranchStep extends BaseStep {
  type: "scenario-branch";
  scenario: string;
  choices: {
    id: string;
    label: string;
    consequence: string;
    isOptimal: boolean;
  }[];
}

export interface MatchPairsStep extends BaseStep {
  type: "match-pairs";
  instruction: string;
  pairs: { id: string; term: string; definition: string }[];
  successMessage: string;
}

export interface SpotTheMistakeStep extends BaseStep {
  type: "spot-mistake";
  scenario: string;
  statements: {
    id: string;
    text: string;
    isMistake: boolean;
    explanation: string;
  }[];
  instruction: string;
}

export interface NumberEntryStep extends BaseStep {
  type: "number-entry";
  question: string;
  helperText?: string;
  unit: string;
  correctMin: number;
  correctMax: number;
  hint?: string;
  revealText: string;
  formatAnswer?: string;
}

export interface MiniSimStep extends BaseStep {
  type: "mini-sim";
  title: string;
  description: string;
  inputLabel: string;
  inputUnit: string;
  inputMin: number;
  inputMax: number;
  inputStep: number;
  inputDefault: number;
  simType: SimType;
}

export type StepType =
  | StoryCardStep
  | PredictSliderStep
  | SortBucketsStep
  | BudgetBuilderStep
  | ScenarioBranchStep
  | MatchPairsStep
  | SpotTheMistakeStep
  | NumberEntryStep
  | MiniSimStep;

export interface LessonV2 {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedMinutes: number;
  worldId: string;
  steps: StepType[];
  totalXp: number;
}

export interface WorldMap {
  id: string;
  title: string;
  theme: string;
  lessons: string[];
  isUnlocked: boolean;
}
