// ─── Inline type definitions (engine types not yet imported from engine) ─────

type StoryCardStep = {
  id: string;
  type: "story-card";
  xpReward: number;
  narrative: string;
  title?: string;
  continueLabel?: string;
  characterState?: "idle" | "thinking" | "correct" | "incorrect" | "celebrate";
};

type PredictSliderStep = {
  id: string;
  type: "predict-slider";
  xpReward: number;
  question: string;
  helperText?: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  correctMin: number;
  correctMax: number;
  revealText: string;
  characterState?: "idle" | "thinking" | "correct" | "incorrect" | "celebrate";
};

type SortBucketsStep = {
  id: string;
  type: "sort-buckets";
  xpReward: number;
  instruction: string;
  buckets: { id: string; label: string; color: string }[];
  items: { id: string; label: string; correctBucketId: string; hint?: string; explanation?: string }[];
  successMessage: string;
  characterState?: "idle" | "thinking" | "correct" | "incorrect" | "celebrate";
};

type BudgetBuilderStep = {
  id: string;
  type: "budget-builder";
  xpReward: number;
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
  characterState?: "idle" | "thinking" | "correct" | "incorrect" | "celebrate";
};

type ScenarioBranchStep = {
  id: string;
  type: "scenario-branch";
  xpReward: number;
  scenario: string;
  choices: {
    id: string;
    label: string;
    consequence: string;
    isOptimal: boolean;
  }[];
  characterState?: "idle" | "thinking" | "correct" | "incorrect" | "celebrate";
};

type MatchPairsStep = {
  id: string;
  type: "match-pairs";
  xpReward: number;
  instruction: string;
  pairs: { id: string; term: string; definition: string }[];
  successMessage: string;
  characterState?: "idle" | "thinking" | "correct" | "incorrect" | "celebrate";
};

type SpotTheMistakeStep = {
  id: string;
  type: "spot-mistake";
  xpReward: number;
  scenario: string;
  statements: {
    id: string;
    text: string;
    isMistake: boolean;
    explanation: string;
  }[];
  instruction: string;
  characterState?: "idle" | "thinking" | "correct" | "incorrect" | "celebrate";
};

type MiniSimStep = {
  id: string;
  type: "mini-sim";
  xpReward: number;
  title: string;
  description: string;
  inputLabel: string;
  inputUnit: string;
  inputMin: number;
  inputMax: number;
  inputStep: number;
  inputDefault: number;
  simType:
    | "compound-growth"
    | "sip-returns"
    | "inflation-erosion"
    | "emi-breakdown";
  characterState?: "idle" | "thinking" | "correct" | "incorrect" | "celebrate";
};

type NumberEntryStep = {
  id: string; type: "number-entry"; xpReward: number; question: string;
  helperText?: string; unit: string; correctMin: number; correctMax: number;
  hint?: string; revealText: string; formatAnswer?: string;
};

type LessonStep =
  | StoryCardStep
  | PredictSliderStep
  | SortBucketsStep
  | BudgetBuilderStep
  | ScenarioBranchStep
  | MatchPairsStep
  | SpotTheMistakeStep
  | MiniSimStep
  | NumberEntryStep;

export interface LessonV2 {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedMinutes: number;
  worldId: string;
  steps: LessonStep[];
  totalXp: number;
}

// ─── Lesson Data ─────────────────────────────────────────────────────────────

export const BUDGETING_50_30_20_LESSON: LessonV2 = {
  id: "budgeting-50-30-20",
  title: "The 50/30/20 Rule",
  subtitle: "A simple framework to take control of your money",
  category: "Budgeting",
  difficulty: "Beginner",
  estimatedMinutes: 8,
  worldId: "world-budgeting-basics",
  totalXp: 155, // 10 + 15 + 20 + 25 + 20 + 15 + 20 + 30

  steps: [
    // ── Step 1 ── Story Card ──────────────────────────────────────────────────
    {
      id: "step-1-meet-priya",
      type: "story-card",
      xpReward: 10,
      title: "Meet Priya",
      narrative:
        "Priya is 24, just started her first job in Bangalore earning ₹30,000/month take-home. By the 22nd she has ₹200 left. She doesn't know where the money went. Today she'll learn how to take control.",
      continueLabel: "Help Priya budget",
      characterState: "idle",
    } satisfies StoryCardStep,

    // ── Step 2 ── Predict Slider ──────────────────────────────────────────────
    {
      id: "step-2-predict-needs-percent",
      type: "predict-slider",
      xpReward: 15,
      question:
        "What % of your income should go toward essential Needs like rent, food, and transport?",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      defaultValue: 50,
      correctMin: 45,
      correctMax: 55,
      revealText:
        "The 50/30/20 rule suggests 50% for Needs — essential expenses that keep you functional. For Priya, that's ₹15,000 for rent, groceries, commute, utilities, and health insurance.",
      characterState: "thinking",
    } satisfies PredictSliderStep,

    // ── Step 3 ── Sort Buckets ────────────────────────────────────────────────
    {
      id: "step-3-sort-expenses",
      type: "sort-buckets",
      xpReward: 20,
      instruction: "Help Priya sort her monthly expenses into the right buckets",
      buckets: [
        { id: "needs", label: "Needs 🏠", color: "teal" },
        { id: "wants", label: "Wants 🎮", color: "amber" },
        { id: "savings", label: "Savings 💰", color: "emerald" },
      ],
      items: [
        {
          id: "item-rent",
          label: "Rent",
          correctBucketId: "needs",
          hint: "Shelter is a fundamental need",
        },
        {
          id: "item-netflix",
          label: "Netflix subscription",
          correctBucketId: "wants",
          hint: "Streaming is discretionary entertainment",
        },
        {
          id: "item-emergency-sip",
          label: "Emergency fund SIP",
          correctBucketId: "savings",
          hint: "Building your safety net is saving",
        },
        {
          id: "item-groceries",
          label: "Monthly groceries",
          correctBucketId: "needs",
          hint: "Food is an essential need",
        },
        {
          id: "item-dinners",
          label: "Weekend dinners out",
          correctBucketId: "wants",
          hint: "Eating out is a lifestyle choice, not a necessity",
        },
        {
          id: "item-elss",
          label: "ELSS mutual fund",
          correctBucketId: "savings",
          hint: "Tax-saving investment is a form of savings",
        },
        {
          id: "item-metro",
          label: "Metro card recharge",
          correctBucketId: "needs",
          hint: "Daily commute is a necessity",
        },
        {
          id: "item-airpods",
          label: "New AirPods",
          correctBucketId: "wants",
          hint: "Gadgets beyond basic use are wants",
        },
      ],
      successMessage:
        "Excellent! You understand the three pillars of budgeting.",
      characterState: "idle",
    } satisfies SortBucketsStep,

    // ── Step 4 ── Budget Builder ──────────────────────────────────────────────
    {
      id: "step-4-build-budget",
      type: "budget-builder",
      xpReward: 25,
      instruction:
        "Now build Priya's actual 50/30/20 budget. Use the sliders to allocate her ₹30,000.",
      income: 30000,
      categories: [
        {
          id: "needs",
          label: "Needs",
          color: "#0F766E",
          defaultPercent: 50,
          minPercent: 0,
          maxPercent: 100,
        },
        {
          id: "wants",
          label: "Wants",
          color: "#F59E0B",
          defaultPercent: 30,
          minPercent: 0,
          maxPercent: 100,
        },
        {
          id: "savings",
          label: "Savings & Investments",
          color: "#10B981",
          defaultPercent: 20,
          minPercent: 0,
          maxPercent: 100,
        },
      ],
      targetPercents: { needs: 50, wants: 30, savings: 20 },
      successMessage:
        "Perfect! You've built a healthy budget. Remember, 50/30/20 is a guideline, not a rule.",
      characterState: "thinking",
    } satisfies BudgetBuilderStep,

    // ── Step 5 ── Scenario Branch ─────────────────────────────────────────────
    {
      id: "step-5-goa-dilemma",
      type: "scenario-branch",
      xpReward: 20,
      scenario:
        "Priya's friend invites her to Goa for a long weekend. The trip will cost ₹8,000 — more than her full monthly Wants budget. She has ₹3,000 emergency fund. What should Priya do?",
      choices: [
        {
          id: "choice-skip",
          label: "Skip this trip, save the money",
          consequence:
            "You protected the budget, but Priya misses meaningful experiences that matter for mental health. Consider adjusting next month's Wants in advance.",
          isOptimal: false,
        },
        {
          id: "choice-yolo",
          label: "Go on the trip, it's just once",
          consequence:
            "YOLO spending breaks the habit loop. Without a plan, this becomes a pattern. Next month will be even harder.",
          isOptimal: false,
        },
        {
          id: "choice-plan-ahead",
          label: "Save for 2 months by cutting Wants, then go on a future trip",
          consequence:
            "Smart! Plan big purchases in advance. Priya sets up a ₹4,000/month 'Experiences' sub-bucket in her Wants for 2 months, then goes guilt-free.",
          isOptimal: true,
        },
        {
          id: "choice-emergency",
          label: "Use savings — emergencies can wait",
          consequence:
            "Emergency funds are not for planned expenses. Priya should never deplete it for discretionary trips.",
          isOptimal: false,
        },
      ],
      characterState: "thinking",
    } satisfies ScenarioBranchStep,

    // ── Step 6 ── Match Pairs ─────────────────────────────────────────────────
    {
      id: "step-6-match-terms",
      type: "match-pairs",
      xpReward: 15,
      instruction: "Match each financial term to its correct definition",
      pairs: [
        {
          id: "pair-needs",
          term: "Needs",
          definition:
            "Non-negotiable monthly expenses required for basic functioning",
        },
        {
          id: "pair-wants",
          term: "Wants",
          definition:
            "Discretionary spending that improves quality of life but can be reduced",
        },
        {
          id: "pair-savings",
          term: "Savings",
          definition:
            "Money set aside for future goals, emergencies, or investments",
        },
        {
          id: "pair-lifestyle-inflation",
          term: "Lifestyle inflation",
          definition:
            "The tendency to spend more as income rises, eroding savings",
        },
        {
          id: "pair-atp",
          term: "ATP (Available to Plan)",
          definition:
            "Income minus committed fixed costs, available for active planning",
        },
      ],
      successMessage:
        "Impressive! You've mastered the key vocabulary of personal budgeting.",
      characterState: "idle",
    } satisfies MatchPairsStep,

    // ── Step 7 ── Spot the Mistake ────────────────────────────────────────────
    {
      id: "step-7-spot-mistake",
      type: "spot-mistake",
      xpReward: 20,
      scenario:
        "Priya's colleague Rahul shares his monthly budget plan. Find the mistake.",
      instruction:
        "Tap on the statement that contains an error in Rahul's budget plan.",
      statements: [
        {
          id: "stmt-gross-salary",
          text: "I set aside 20% of my gross salary (before tax) for savings.",
          isMistake: true,
          explanation:
            "The 50/30/20 rule applies to take-home (post-tax) income, not gross salary. Applying it to gross would mean you're 'saving' money you never actually received.",
        },
        {
          id: "stmt-netflix-wants",
          text: "I categorize my Netflix and Spotify subscriptions as Wants.",
          isMistake: false,
          explanation:
            "Correct! Streaming subscriptions are discretionary and belong in the Wants bucket.",
        },
        {
          id: "stmt-emi-needs",
          text: "I count my EMI for my bike loan under Needs since it's a committed expense.",
          isMistake: false,
          explanation:
            "Correct! Committed EMI payments are fixed obligations and belong under Needs.",
        },
        {
          id: "stmt-weekly-tracking",
          text: "I track Wants spending weekly to avoid over-spending mid-month.",
          isMistake: false,
          explanation:
            "Correct! Weekly check-ins on discretionary spending is a healthy budgeting habit.",
        },
      ],
      characterState: "thinking",
    } satisfies SpotTheMistakeStep,

    // ── Step 8 ── Story Card (Celebration) ────────────────────────────────────
    {
      id: "step-8-priya-plan-complete",
      type: "story-card",
      xpReward: 30,
      title: "Priya's First Paycheck Plan 🎉",
      narrative:
        "Priya now has a plan. ₹15,000 for rent, food, transport. ₹9,000 for life and experiences. ₹6,000 for her future — an emergency fund SIP and an ELSS. By month 3, she hasn't touched the ₹200-by-the-22nd problem. The 50/30/20 isn't a rigid cage — it's a starting map. As your income grows, the percentages evolve. But the habit of allocating deliberately? That stays for life.",
      continueLabel: "Complete Lesson ✓",
      characterState: "celebrate",
    } satisfies StoryCardStep,
  ],
};

const story = (id: string, title: string, narrative: string): StoryCardStep => ({
  id, type: "story-card", xpReward: 10, title, narrative, continueLabel: "Explore the idea",
});
const number = (id: string, question: string, unit: string, answer: number, revealText: string, hint: string): NumberEntryStep => ({
  id, type: "number-entry", xpReward: 20, question, unit, correctMin: answer, correctMax: answer,
  hint, revealText, formatAnswer: "{value}",
});
const scenario = (id: string, text: string, choices: ScenarioBranchStep["choices"]): ScenarioBranchStep => ({
  id, type: "scenario-branch", xpReward: 20, scenario: text, choices,
});
const match = (id: string, instruction: string, pairs: MatchPairsStep["pairs"]): MatchPairsStep => ({
  id, type: "match-pairs", xpReward: 20, instruction, pairs, successMessage: "You matched the ideas. Use the same reasoning in real decisions.",
});
const sort = (id: string, instruction: string, buckets: SortBucketsStep["buckets"], items: SortBucketsStep["items"]): SortBucketsStep => ({
  id, type: "sort-buckets", xpReward: 25, instruction, buckets, items,
  successMessage: "Good sorting. A category is a tool for thinking; review it when your situation changes.",
});
const sim = (id: string, title: string, description: string, inputLabel: string, unit: string, min: number, max: number, value: number, simType: MiniSimStep["simType"]): MiniSimStep => ({
  id, type: "mini-sim", xpReward: 25, title, description, inputLabel, inputUnit: unit,
  inputMin: min, inputMax: max, inputStep: 1, inputDefault: value, simType,
});
const choice = (id: string, label: string, consequence: string, isOptimal: boolean) => ({ id, label, consequence, isOptimal });

const MORE_LESSONS: LessonV2[] = [
  {
    id: "monthly-cash-flow", title: "Know Where Your Money Goes", subtitle: "Read a month of money in and money out", category: "Cash flow", difficulty: "Beginner", estimatedMinutes: 6, worldId: "world-master-money", totalXp: 80,
    steps: [story("cash-story", "A month in Aarav’s life", "Aarav takes home ₹42,000. Rent, food, travel and subscriptions leave his account at different times. A cash-flow view helps him see what came in, what went out and what remains."),
      number("cash-net", "After ₹42,000 income and ₹35,500 expenses, how much remains?", "₹", 6500, "₹6,500 remains. This is the month’s surplus before any unlisted or irregular costs.", "Subtract the expenses from the take-home income."),
      sort("cash-sort", "Sort each item by its role in monthly cash flow", [{ id: "in", label: "Money in", color: "teal" }, { id: "out", label: "Money out", color: "amber" }], [{ id: "salary", label: "Take-home salary", correctBucketId: "in" }, { id: "rent", label: "Rent payment", correctBucketId: "out" }, { id: "refund", label: "UPI refund", correctBucketId: "in" }, { id: "emi", label: "EMI", correctBucketId: "out" }]),
      scenario("cash-plan", "Aarav’s statement shows ₹6,500 left, but his annual insurance premium is due next month. What is the useful next step?", [choice("ignore", "Treat all ₹6,500 as free to spend", "A known annual bill is still part of the plan. Ignoring it can make next month feel like a surprise.", false), choice("set-aside", "Set aside a monthly share for the premium", "Planning for irregular expenses makes the monthly picture more realistic.", true), choice("borrow", "Use a credit app when the bill arrives", "Borrowing adds cost for an expense Aarav already knows about.", false)])]
  },
  {
    id: "emergency-fund", title: "Build Your Emergency Fund", subtitle: "Choose a practical cash safety net", category: "Resilience", difficulty: "Beginner", estimatedMinutes: 6, worldId: "world-master-money", totalXp: 80,
    steps: [story("ef-story", "When income pauses", "Meera’s essential expenses are ₹24,000 a month. Her laptop breaks and freelance work pauses. An emergency reserve can cover necessary costs without relying immediately on expensive debt."),
      number("ef-target", "What is a 3-month reserve for ₹24,000 monthly essentials?", "₹", 72000, "₹72,000 covers three months of those essential expenses. A 3–6 month range is a planning guide, not a rule for everyone.", "Multiply monthly essential expenses by 3."),
      number("ef-sim", "At ₹4,000 saved each month, how many months to build ₹72,000 from zero?", "months", 18, "It takes 18 months at ₹4,000 per month, before any interest. Keep emergency savings accessible rather than relying on market returns.", "Divide the target amount by the monthly contribution."),
      scenario("ef-home", "Meera has a ₹30,000 reserve and a ₹72,000 target. Which plan is most workable?", [choice("all-now", "Invest the full reserve in a volatile asset", "Emergency money needs dependable access; market values can fall when cash is needed.", false), choice("steady", "Keep accessible savings and automate a manageable monthly addition", "Liquidity and consistency help build the gap without pretending it is already funded.", true), choice("loan", "Use a personal loan as the emergency fund", "A loan is a liability with repayments, not money Meera has saved.", false)])]
  },
  {
    id: "needs-vs-wants", title: "Needs vs Wants", subtitle: "Make room for joy without losing your footing", category: "Spending choices", difficulty: "Beginner", estimatedMinutes: 5, worldId: "world-master-money", totalXp: 80,
    steps: [story("nw-story", "Riya’s ₹30,000 month", "Riya takes home ₹30,000. Rent, basic groceries and the data plan she needs for work come first. She also sets aside ₹9,000 for wants: a dinner with friends and a music show matter to her. Needs and wants depend on a person’s circumstances; the labels help her make choices, not judge them."),
      sort("nw-sort", "For Riya this month, sort each expense by its role in her plan", [{ id: "need", label: "Need in this situation", color: "teal" }, { id: "want", label: "Want / flexible choice", color: "amber" }], [{ id: "rent", label: "Rent for her home", correctBucketId: "need", explanation: "Stable shelter is essential in Riya’s current budget." }, { id: "medicine", label: "Prescription medicine", correctBucketId: "need", explanation: "Her prescribed medicine supports her health; it is not an optional treat." }, { id: "late-cab", label: "A cab after her late hospital shift", correctBucketId: "need", hint: "Think about safety and what transport is available at that hour.", explanation: "In this situation, a safe way home after a late shift is essential. A different commute at a different time might be flexible." }, { id: "work-data", label: "Basic mobile data used for work", correctBucketId: "need", explanation: "Riya needs a basic connection for work. A premium add-on could still be a want." }, { id: "upgrade", label: "Replacing a working phone with a premium model", correctBucketId: "want", explanation: "Her current phone works, so the upgrade is a flexible choice for now." }, { id: "dinner", label: "Dinner out with friends", correctBucketId: "want", explanation: "This is discretionary spending, but it can still be an important and planned part of Riya’s life." }]),
      scenario("nw-choice", "Riya planned ₹9,000 for wants but has spent ₹10,500. She values a friend’s birthday dinner this week. What could she do?", [choice("shame", "Cancel every enjoyable plan and treat wants as irresponsible", "A budget is a tool, not a moral score. Plans that leave no room for what matters can be difficult to keep.", false), choice("review", "Keep the dinner, then choose a lower-priority want to reduce by ₹1,500", "Riya makes a deliberate trade-off to bring this month’s flexible spending near ₹9,000 while keeping what matters most.", true), choice("credit", "Borrow ₹1,500 and leave the plan unchanged", "Borrowing covers the overspend but does not resolve the trade-off and may add interest.", false)]),
      match("nw-match", "Match each budgeting idea to how Riya used it", [{ id: "tradeoff", term: "Trade-off", definition: "Keep the birthday dinner by adjusting a lower-priority want" }, { id: "context", term: "Context", definition: "A late, unsafe commute can make a cab essential for Riya" }, { id: "review", term: "Review", definition: "Compare ₹10,500 spent with her ₹9,000 plan and adjust" }])]
  },
  {
    id: "debt-emis-interest", title: "Debt, EMIs and Interest", subtitle: "See the full cost behind a monthly payment", category: "Borrowing", difficulty: "Beginner", estimatedMinutes: 7, worldId: "world-money-smart", totalXp: 80,
    steps: [story("debt-story", "A phone on EMI", "Kabir sees a ₹3,000 monthly EMI and thinks the phone is affordable. The loan also has a processing fee and interest, so the monthly amount is only one part of the cost."),
      sim("emi-sim", "Explore an EMI", "Change the loan amount to see how principal, interest and tenure affect a typical EMI. The estimate is educational; lender fees and terms differ.", "Loan amount", "₹", 10000, 200000, 60000, "emi-breakdown"),
      match("debt-match", "Connect each borrowing term", [{ id: "principal", term: "Principal", definition: "The amount borrowed before interest and fees" }, { id: "tenure", term: "Tenure", definition: "How long repayments continue" }, { id: "total", term: "Total repayment", definition: "All instalments plus applicable fees" }]),
      scenario("debt-plan", "Two loans have similar EMIs, but one has a much longer tenure and fee. What should Kabir compare?", [choice("emi-only", "Only the monthly EMI", "A smaller EMI can hide a longer repayment period and higher total cost.", false), choice("apr-total", "Interest rate, fees, tenure and total repayment", "Comparing the full terms gives a clearer borrowing cost.", true), choice("approval", "Whether the app approves instantly", "Fast approval says little about affordability or total cost.", false)])]
  },
  {
    id: "credit-scores", title: "Credit Scores Explained", subtitle: "Build a dependable repayment history", category: "Credit", difficulty: "Beginner", estimatedMinutes: 5, worldId: "world-money-smart", totalXp: 80,
    steps: [story("credit-story", "Nisha applies for a loan", "A lender reviews Nisha’s credit history as one part of its decision. A score summarizes some credit behaviour; it is not a measure of her worth or a guarantee of approval."),
      sort("credit-sort", "Sort behaviours by their usual effect on credit history", [{ id: "helps", label: "Supports healthy history", color: "teal" }, { id: "risk", label: "Can create risk", color: "rose" }], [{ id: "pay", label: "Pay bills by the due date", correctBucketId: "helps" }, { id: "limit", label: "Use most of every card limit", correctBucketId: "risk" }, { id: "report", label: "Check the credit report for errors", correctBucketId: "helps" }, { id: "miss", label: "Miss several EMI payments", correctBucketId: "risk" }]),
      match("credit-match", "Match the credit concept", [{ id: "history", term: "Credit history", definition: "A record of borrowing and repayment activity" }, { id: "util", term: "Utilisation", definition: "How much revolving credit is used compared with the limit" }, { id: "report", term: "Credit report", definition: "A detailed record that should be checked for accuracy" }]),
      scenario("credit-choice", "Nisha finds a loan she does not recognise on her report. What should she do?", [choice("ignore", "Ignore it; reports are always correct", "Reports can contain errors and should be reviewed.", false), choice("dispute", "Raise a dispute with the credit bureau and relevant lender", "Using the official correction route helps investigate inaccurate information.", true), choice("pay", "Pay the unknown lender immediately", "First verify the account; never pay an unverified demand.", false)])]
  },
  {
    id: "inflation-compound-growth", title: "Inflation and Compound Growth", subtitle: "Understand purchasing power and time", category: "Growth", difficulty: "Beginner", estimatedMinutes: 7, worldId: "world-money-smart", totalXp: 80,
    steps: [story("growth-story", "The same basket, a different year", "A basket that costs ₹1,000 today may cost more later if prices rise. Inflation describes a broad rise in prices; your own experience can differ by what you buy."),
      sim("inflation-sim", "See purchasing power change", "Illustrative inflation only. Actual inflation changes over time and differs across households.", "Assumed annual inflation", "%", 1, 15, 6, "inflation-erosion"),
      sim("compound-sim", "See contributions compound", "Try different periods and contributions. This is a mathematical illustration, not a promised or expected investment return.", "Monthly contribution", "₹", 500, 20000, 3000, "sip-returns"),
      scenario("growth-choice", "A friend says a past return means the same return is certain next year. What is the sound conclusion?", [choice("guarantee", "Past results guarantee the next result", "Markets and rates change; historical results do not guarantee future returns.", false), choice("uncertain", "Growth can compound, but future outcomes are uncertain", "Compounding describes how gains build on prior gains; it does not remove risk.", true), choice("ignore", "Inflation never affects savings", "Inflation changes what money can buy over time.", false)])]
  },
  {
    id: "protect-your-money", title: "Protect Your Money", subtitle: "Spot pressure tactics before you pay", category: "Digital safety", difficulty: "Beginner", estimatedMinutes: 6, worldId: "world-money-smart", totalXp: 80,
    steps: [story("protect-story", "A suspicious UPI request", "An unknown caller says a refund is waiting and asks Aarav to enter his UPI PIN. A PIN authorises a payment; it is not needed to receive money."),
      { id: "protect-spot", type: "spot-mistake", xpReward: 25, scenario: "A caller promises a guaranteed 4× return if Aarav transfers money today.", instruction: "Select the statement that shows a warning sign.", statements: [{ id: "guarantee", text: "The caller guarantees a high return with no risk", isMistake: true, explanation: "High return promises without risk are a warning sign; investments can lose value." }, { id: "verify", text: "Aarav verifies the firm through official sources", isMistake: false, explanation: "Independent verification is a safer next step." }, { id: "pause", text: "Aarav pauses and refuses to share an OTP", isMistake: false, explanation: "Pausing and protecting authentication codes reduces fraud risk." }] },
      match("protect-match", "Match the safer response", [{ id: "pin", term: "UPI PIN", definition: "Enter only to authorise a payment you intend to make" }, { id: "phish", term: "Phishing link", definition: "A deceptive link that tries to steal credentials or money" }, { id: "verify", term: "Verify independently", definition: "Contact the organisation using its official channel" }]),
      scenario("protect-action", "A stranger asks for an OTP to reverse a payment. What should Aarav do?", [choice("share", "Read the OTP over the phone", "An OTP can authorise access or a transaction; do not share it.", false), choice("stop", "End the call and contact the bank through its official channel", "Avoid the link or number provided by the caller and verify independently.", true), choice("forward", "Forward the message to friends first", "Sharing a suspicious link can expose other people too.", false)])]
  },
  {
    id: "fixed-recurring-deposits", title: "Fixed and Recurring Deposits", subtitle: "Compare tenure, interest and access", category: "Saving", difficulty: "Beginner", estimatedMinutes: 6, worldId: "world-start-investing", totalXp: 80,
    steps: [story("fd-story", "Two ways to save", "A fixed deposit starts with a lump sum for a chosen tenure. A recurring deposit usually builds through regular instalments. Rates, payout choices, tax treatment and premature-withdrawal rules vary by bank."),
      match("fd-match", "Match the deposit term", [{ id: "fd", term: "Fixed deposit", definition: "A lump sum deposited for a selected period" }, { id: "rd", term: "Recurring deposit", definition: "Regular deposits made over a selected period" }, { id: "maturity", term: "Maturity value", definition: "The amount payable at the end under the deposit terms" }]),
      number("fd-calc", "At 6% simple interest for one year, what is interest on ₹20,000?", "₹", 1200, "₹1,200 simple interest: ₹20,000 × 6% × 1 year. Actual FD rules may compound or pay interest differently.", "Multiply ₹20,000 by 0.06."),
      scenario("fd-choice", "An emergency reserve may be needed without warning. What should you compare before locking it in an FD?", [choice("rate", "Only the headline rate", "Access, premature withdrawal terms and deposit protection also matter.", false), choice("terms", "Rate, tenure, payout, withdrawal terms and applicable protections", "A product should fit the purpose and access needs, not just the rate.", true), choice("guaranteed", "Assume every deposit is insured without limits", "Deposit protection has rules and limits; check current official details.", false)])]
  },
  {
    id: "mutual-funds-sips", title: "Mutual Funds and SIPs", subtitle: "Learn the structure before choosing", category: "Investing", difficulty: "Beginner", estimatedMinutes: 7, worldId: "world-start-investing", totalXp: 80,
    steps: [story("mf-story", "A monthly SIP", "Ananya invests a fixed amount on a schedule through a mutual fund SIP. A SIP is a way to invest regularly, not a fund type or a promise that the investment will make money."),
      match("mf-match", "Match the fund term", [{ id: "nav", term: "NAV", definition: "Per-unit net asset value calculated by the fund" }, { id: "expense", term: "Expense ratio", definition: "Ongoing costs charged by a fund as disclosed in its documents" }, { id: "sip", term: "SIP", definition: "A method of investing a chosen amount at regular intervals" }]),
      sim("mf-sim", "Model regular contributions", "This calculator uses an assumed rate to show a mathematical illustration. Actual mutual-fund returns vary and can be negative.", "Monthly SIP", "₹", 500, 25000, 3000, "sip-returns"),
      scenario("mf-choice", "Ananya is comparing two funds. What should she review beyond recent returns?", [choice("recent", "Choose whichever had the highest recent return", "Recent performance may not continue and does not reveal the whole risk picture.", false), choice("fit", "Goal, time horizon, risk, costs and scheme documents", "Understanding suitability and risks matters alongside past performance.", true), choice("promise", "Pick the fund with a guaranteed equity return", "Equity mutual funds do not guarantee returns.", false)])]
  },
  {
    id: "how-stocks-work", title: "How Stocks Work", subtitle: "Ownership comes with uncertainty", category: "Investing", difficulty: "Beginner", estimatedMinutes: 6, worldId: "world-start-investing", totalXp: 80,
    steps: [story("stocks-story", "Owning a small part", "Buying a share gives an investor a small ownership interest in a company. Its market price can move as expectations and conditions change; a company can also perform poorly."),
      match("stocks-match", "Connect the market terms", [{ id: "share", term: "Share", definition: "A unit representing part ownership in a company" }, { id: "price", term: "Market price", definition: "The price buyers and sellers currently agree to trade at" }, { id: "volatility", term: "Volatility", definition: "How much and how quickly a price moves" }]),
      { id: "stocks-predict", type: "predict-slider", xpReward: 20, question: "If a stock falls 20%, what percentage rise is needed to return to its old price?", helperText: "Start at ₹100 and calculate from the lower value.", unit: "%", min: 0, max: 100, step: 5, defaultValue: 20, correctMin: 25, correctMax: 25, revealText: "A 20% fall takes ₹100 to ₹80. Returning to ₹100 requires ₹20 ÷ ₹80 = 25%. Losses and gains use different bases.", characterState: "thinking" },
      scenario("stocks-choice", "A stock tip claims its price cannot fall. How should a learner respond?", [choice("trust", "Buy quickly before others do", "Urgency and certainty claims deserve scrutiny, not rushed decisions.", false), choice("risk", "Recognise that prices can fall and verify information independently", "Shares carry risk; no price path is guaranteed.", true), choice("average", "Assume every company will recover", "Some companies do not recover, and diversification does not eliminate risk.", false)])]
  },
  {
    id: "diversification-allocation", title: "Diversification and Asset Allocation", subtitle: "Spread risk with purpose", category: "Investing", difficulty: "Beginner", estimatedMinutes: 6, worldId: "world-start-investing", totalXp: 80,
    steps: [story("div-story", "One goal, different assets", "Dev’s savings are all in one company’s shares. A problem at that company could affect much of his portfolio. Diversification spreads exposure; asset allocation sets broad shares across asset types to suit a goal and risk tolerance."),
      sort("div-sort", "Identify the asset type", [{ id: "market", label: "Market-linked", color: "teal" }, { id: "deposit", label: "Deposit", color: "amber" }], [{ id: "share", label: "Listed company share", correctBucketId: "market" }, { id: "mf", label: "Equity mutual fund", correctBucketId: "market" }, { id: "fd", label: "Bank fixed deposit", correctBucketId: "deposit" }, { id: "etf", label: "Equity ETF", correctBucketId: "market" }]),
      number("div-calc", "A ₹1,00,000 portfolio allocates 30% to debt. How much is that?", "₹", 30000, "₹30,000 is 30% of ₹1,00,000. Allocation is a plan; values can move after investing.", "Find 30% of ₹1,00,000."),
      scenario("div-choice", "Dev wants to diversify. Which approach best describes the idea?", [choice("many", "Buy many companies from one narrow industry only", "More holdings can still share the same concentrated risk.", false), choice("mix", "Consider different asset exposures that fit the goal and risk capacity", "Diversification spreads some risks but cannot prevent every loss.", true), choice("no-loss", "Expect a diversified portfolio never to lose value", "A diversified portfolio can still fall when markets move.", false)])]
  },
];

export const LESSONS_V2: LessonV2[] = [BUDGETING_50_30_20_LESSON, ...MORE_LESSONS];

export const CURRICULUM_WORLDS = [
  { id: "world-master-money", title: "Master Your Money", description: "Build a clear monthly plan, understand cash flow and create a safety net.", color: "#0F766E", lessonIds: ["budgeting-50-30-20", "monthly-cash-flow", "emergency-fund", "needs-vs-wants"] },
  { id: "world-money-smart", title: "Become Money Smart", description: "Make sense of borrowing, credit, rising prices and digital safety.", color: "#A16207", lessonIds: ["debt-emis-interest", "credit-scores", "inflation-compound-growth", "protect-your-money"] },
  { id: "world-start-investing", title: "Start Investing", description: "Understand common investment tools, uncertainty and diversification.", color: "#2563EB", lessonIds: ["fixed-recurring-deposits", "mutual-funds-sips", "how-stocks-work", "diversification-allocation"] },
];
