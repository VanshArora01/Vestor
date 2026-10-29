export type LessonId = string;

export type StageId = "hook" | "predict" | "teach" | "play" | "check" | "act";

export interface EducationalSource {
  title: string;
  publisher: string;
  url: string;
  context: string;
}

export interface TeachSection {
  id: string;
  title: string;
  paragraphs: string[];
  keyTakeaway?: string;
  callout?: {
    type: "concept" | "misconception" | "indian-context" | "regulatory" | "tip";
    title: string;
    text: string;
  };
  tableComparison?: {
    headers: [string, string, string];
    rows: [string, string, string][];
  };
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  scenario?: string;
  options: QuizOption[];
}

export interface Lesson {
  id: LessonId;
  title: string;
  subtitle: string;
  category: "Budgeting & Planning" | "Resilience & Safety" | "Wealth Creation" | "Macroeconomics" | "Investing Principles";
  tier: 1 | 2;
  difficulty: "Foundational" | "Essential" | "Applied";
  estimatedMinutes: number;
  lastReviewed: string;
  sources: EducationalSource[];

  // Stage 1: Hook
  hook: {
    badge: string;
    headline: string;
    scenario: string;
    relatablePrompt: string;
    defaultMonthlyIncome?: number;
  };

  // Stage 2: Predict
  predict: {
    question: string;
    helperText?: string;
    options: {
      id: string;
      label: string;
      sublabel?: string;
      isRecommended?: boolean;
    }[];
    explanation: {
      revealedFact: string;
      takeaway: string;
    };
  };

  // Stage 3: Teach
  teachSections: TeachSection[];

  // Stage 4: Play
  playConfig: {
    calculatorType:
      | "budget-50-30-20"
      | "emergency-runway"
      | "compound-interest"
      | "inflation"
      | "sip-calculator";
    promptTitle: string;
    promptSubtitle: string;
  };

  // Stage 5: Check
  quiz: QuizQuestion[];

  // Stage 6: Act
  act: {
    keyTakeaways: string[];
    actionChallenge: string;
    vestorBridge?: {
      title: string;
      description: string;
      actionLabel: string;
      route: string;
      moduleBadge: "Money Plan" | "Goals" | "Invest";
    };
  };
}

export interface LessonProgress {
  stage: StageId;
  predictionAnswer?: string;
  quizAnswers?: Record<string, string>;
  quizScore?: number;
  completedAt?: string;
  isCompleted: boolean;
  stepIndex?: number;
}

export interface OverallLearnState {
  completedLessons: string[];
  lessonProgress: Record<string, LessonProgress>;
  streakDays: number;
  lastActiveDate: string;
  totalXp: number;
}
