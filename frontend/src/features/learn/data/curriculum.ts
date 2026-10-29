export interface LearningPath {
  id: string;
  number: number;
  title: string;
  description: string;
  difficulty: "Foundational" | "Essential" | "Applied";
  iconName: string;
  lessonIds: string[];
  color: string;
}

export interface CatalogueLesson {
  id: string;
  pathId: string;
  title: string;
  description: string;
  difficulty: "Foundational" | "Essential" | "Applied";
  estimatedMinutes: number;
  format: "interactive" | "conceptual" | "practical";
  status: "available" | "coming_soon";
  tags: string[];
  quickSummary: string;
  sourceAttribution?: string;
}

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "foundations",
    number: 1,
    title: "1. Foundations",
    description: "Core economic forces, time horizons, and financial mindset for Indian earners.",
    difficulty: "Foundational",
    iconName: "Compass",
    lessonIds: ["inflation-purchasing-power", "net-worth-audit", "financial-mindset"],
    color: "#0F766E",
  },
  {
    id: "budgeting",
    number: 2,
    title: "2. Budgeting",
    description: "Cash flow frameworks, needs vs wants, and adapting budgets to metro living costs.",
    difficulty: "Foundational",
    iconName: "PieChart",
    lessonIds: ["budgeting-50-30-20", "zero-based-budgeting", "tracking-cash-leaks"],
    color: "#0284C7",
  },
  {
    id: "safety",
    number: 3,
    title: "3. Safety & Resilience",
    description: "Emergency funds, health insurance essentials, and protecting family finances.",
    difficulty: "Essential",
    iconName: "ShieldCheck",
    lessonIds: ["emergency-fund", "health-insurance-decoded", "term-life-protection"],
    color: "#059669",
  },
  {
    id: "goals",
    number: 4,
    title: "4. Goals & Sinking Funds",
    description: "Target-based savings, sinking funds, down payments, and goal feasibility math.",
    difficulty: "Essential",
    iconName: "Target",
    lessonIds: ["smart-financial-goals", "sinking-funds-strategy", "down-payment-roadmap"],
    color: "#D97706",
  },
  {
    id: "debt-credit",
    number: 5,
    title: "5. Debt & Credit",
    description: "CIBIL scores, credit card reward discipline, EMI costs, and debt payoff methods.",
    difficulty: "Essential",
    iconName: "CreditCard",
    lessonIds: ["cibil-credit-scores", "credit-card-optimization", "snowball-vs-avalanche"],
    color: "#E11D48",
  },
  {
    id: "investing-basics",
    number: 6,
    title: "6. Investing Basics",
    description: "Compound interest, asset classes, risk tolerance, and avoiding common traps.",
    difficulty: "Essential",
    iconName: "TrendingUp",
    lessonIds: ["compound-interest", "asset-classes-overview", "risk-profiling-realities"],
    color: "#7C3AED",
  },
  {
    id: "mutual-funds",
    number: 7,
    title: "7. Mutual Funds & SIPs",
    description: "Systematic investing, rupee-cost averaging, active vs index funds, and expense ratios.",
    difficulty: "Applied",
    iconName: "Layers",
    lessonIds: ["sip-mutual-funds", "active-vs-index-funds", "expense-ratio-drag"],
    color: "#2563EB",
  },
  {
    id: "stocks-taxes",
    number: 8,
    title: "8. Stocks & Taxes",
    description: "Indian capital gains taxes (LTCG/STCG), direct equity fundamentals, and tax efficiency.",
    difficulty: "Applied",
    iconName: "Coins",
    lessonIds: ["ltcg-stcg-taxes", "direct-equity-evaluations", "elss-tax-saving"],
    color: "#475569",
  },
];

export const CATALOGUE_LESSONS: CatalogueLesson[] = [
  // 1. Foundations
  {
    id: "inflation-purchasing-power",
    pathId: "foundations",
    title: "Inflation and Purchasing Power",
    description: "Why ₹1 Lakh today will buy half as much in 12 years, and how to protect your future.",
    difficulty: "Foundational",
    estimatedMinutes: 6,
    format: "interactive",
    status: "available",
    tags: ["Inflation", "Macroeconomics", "Purchasing Power", "Rule of 70"],
    quickSummary:
      "Retail inflation (CPI in India historically ~6%) silently destroys idle cash. Real returns equal nominal interest minus inflation minus taxes. Long-term goals require growth assets to stay ahead.",
    sourceAttribution: "SEBI Investor Education & RBI Monetary Policy Guidelines",
  },
  {
    id: "net-worth-audit",
    pathId: "foundations",
    title: "Calculating Your True Net Worth",
    description: "The scoreboard of personal finance: Assets minus Liabilities, and how to track growth.",
    difficulty: "Foundational",
    estimatedMinutes: 5,
    format: "conceptual",
    status: "coming_soon",
    tags: ["Net Worth", "Assets", "Liabilities", "Auditing"],
    quickSummary:
      "Net worth is Assets minus Liabilities. It separates what you own from what you owe. Tracking net worth quarterly is more indicative of financial health than monthly gross income.",
    sourceAttribution: "SEBI Investor Guidance",
  },
  {
    id: "financial-mindset",
    pathId: "foundations",
    title: "The Psychology of Money & Status Games",
    description: "How social comparison drives lifestyle inflation and how to build internal financial metrics.",
    difficulty: "Foundational",
    estimatedMinutes: 6,
    format: "conceptual",
    status: "coming_soon",
    tags: ["Psychology", "Lifestyle Inflation", "Habits"],
    quickSummary:
      "Spending money to show people how much money you have is the fastest way to have less money. Focus on financial autonomy over visible consumption.",
    sourceAttribution: "Behavioral Economics Research",
  },

  // 2. Budgeting
  {
    id: "budgeting-50-30-20",
    pathId: "budgeting",
    title: "The 50/30/20 Budgeting Guideline",
    description: "A flexible framework to partition take-home income into Needs, Wants, and Savings.",
    difficulty: "Foundational",
    estimatedMinutes: 6,
    format: "interactive",
    status: "available",
    tags: ["Budgeting", "Cash Flow", "50-30-20", "Needs vs Wants"],
    quickSummary:
      "Divide net take-home salary into 50% Needs max, 30% Wants max, and 20% Savings min. In high-rent metros, adapt by compressing Wants (e.g. 65/15/20) while preserving the 20% savings habit.",
    sourceAttribution: "SEBI Investor Education & RBI FAME Booklet",
  },
  {
    id: "zero-based-budgeting",
    pathId: "budgeting",
    title: "Zero-Based Budgeting for Inconsistent Incomes",
    description: "How freelancers, consultants, and variable earners give every single rupee a job.",
    difficulty: "Essential",
    estimatedMinutes: 7,
    format: "practical",
    status: "coming_soon",
    tags: ["Budgeting", "Freelance", "Variable Income"],
    quickSummary:
      "Every rupee of incoming cash is assigned to a specific category (living costs, taxes, buffer, investments) until remaining unassigned cash is zero.",
    sourceAttribution: "NISM Personal Finance Workbook",
  },
  {
    id: "tracking-cash-leaks",
    pathId: "budgeting",
    title: "Spotting Invisible Micro-Expenses",
    description: "Food delivery fees, unused gym passes, and small recurring UPI debits that drain cash.",
    difficulty: "Foundational",
    estimatedMinutes: 4,
    format: "practical",
    status: "coming_soon",
    tags: ["Expenses", "UPI", "Subscriptions", "Cash Flow"],
    quickSummary:
      "Small daily conveniences (₹150 tea/snack, delivery convenience fees) compound into thousands monthly. Auditing bank statements regularly plugs leaks without reducing life quality.",
    sourceAttribution: "Consumer Finance Research",
  },

  // 3. Safety
  {
    id: "emergency-fund",
    pathId: "safety",
    title: "Building an Emergency Fund",
    description: "How to calculate your financial runway and protect your investments from unexpected shocks.",
    difficulty: "Essential",
    estimatedMinutes: 7,
    format: "interactive",
    status: "available",
    tags: ["Emergency Fund", "Runway", "Liquidity", "Resilience"],
    quickSummary:
      "Store 3 to 6 months of non-negotiable living expenses in liquid instruments (sweep-in savings, liquid mutual funds). Never use equity or locked instruments for emergency cash.",
    sourceAttribution: "SEBI Investor Education & DICGC Guidelines",
  },
  {
    id: "health-insurance-decoded",
    pathId: "safety",
    title: "Health Insurance: The Non-Negotiable Shield",
    description: "Deductibles, co-pay, room rent capping, and why employer insurance is never enough.",
    difficulty: "Essential",
    estimatedMinutes: 8,
    format: "conceptual",
    status: "coming_soon",
    tags: ["Insurance", "Health", "Mediclaim", "Safety"],
    quickSummary:
      "A personal retail base health insurance policy of ₹10–15 Lakhs plus a Super Top-up protects against medical inflation and job transitions. Look for zero room rent caps and minimal co-pay.",
    sourceAttribution: "IRDAI Consumer Protection Standards",
  },
  {
    id: "term-life-protection",
    pathId: "safety",
    title: "Pure Term Life vs Investment-Linked Policies",
    description: "Why mixing insurance with investment (ULIPs/Endowment) yields poor returns and low cover.",
    difficulty: "Essential",
    estimatedMinutes: 6,
    format: "conceptual",
    status: "coming_soon",
    tags: ["Insurance", "Term Life", "ULIPs", "Protection"],
    quickSummary:
      "Buy pure term insurance offering 10–15x annual income at low premiums, and invest the remaining difference directly in low-cost mutual funds. Avoid opaque endowment and traditional money-back schemes.",
    sourceAttribution: "IRDAI & SEBI Investor Guidelines",
  },

  // 4. Goals
  {
    id: "smart-financial-goals",
    pathId: "goals",
    title: "Target-Based Financial Planning",
    description: "Framing S.M.A.R.T. goals with rupee values, target deadlines, and priority ranking.",
    difficulty: "Essential",
    estimatedMinutes: 5,
    format: "practical",
    status: "coming_soon",
    tags: ["Goals", "Planning", "Prioritization"],
    quickSummary:
      "Every financial goal requires an inflation-adjusted target amount, a deadline date, and an assigned monthly contribution pace. Goals under 3 years belong in debt; 5+ years in equity.",
    sourceAttribution: "NISM Financial Goal Framework",
  },
  {
    id: "sinking-funds-strategy",
    pathId: "goals",
    title: "Sinking Funds: Pre-Funding Expected Expenses",
    description: "How to save incrementally for annual insurance premiums, festivals, and tech upgrades.",
    difficulty: "Foundational",
    estimatedMinutes: 5,
    format: "practical",
    status: "coming_soon",
    tags: ["Sinking Funds", "Savings", "Annual Expenses"],
    quickSummary:
      "Anticipated irregular expenses (car insurance, Diwali gifts, laptop replacements) are split across 12 monthly installments, eliminating seasonal cash crunches.",
    sourceAttribution: "Financial Advisory Best Practices",
  },
  {
    id: "down-payment-roadmap",
    pathId: "goals",
    title: "Down Payment Math for Real Estate & Vehicles",
    description: "Balancing upfront down payments against loan EMIs and emergency liquidity buffers.",
    difficulty: "Applied",
    estimatedMinutes: 8,
    format: "practical",
    status: "coming_soon",
    tags: ["Home Loan", "Down Payment", "Real Estate"],
    quickSummary:
      "A higher down payment reduces borrowing costs, but never deplete your emergency fund to complete a down payment. Ensure monthly EMIs remain under 30% of take-home pay.",
    sourceAttribution: "RBI Mortgage Lending Directives",
  },

  // 5. Debt & Credit
  {
    id: "cibil-credit-scores",
    pathId: "debt-credit",
    title: "Demystifying CIBIL and Credit Scores",
    description: "Credit utilization ratios, repayment history, enquiry marks, and building a 750+ score.",
    difficulty: "Essential",
    estimatedMinutes: 6,
    format: "conceptual",
    status: "coming_soon",
    tags: ["Credit", "CIBIL", "Credit Score", "Loans"],
    quickSummary:
      "A credit score above 750 unlocks lower interest rates on home loans. Keep credit utilization below 30%, pay full balances on time, and avoid frequent hard loan inquiries.",
    sourceAttribution: "RBI Credit Information Companies Regulations",
  },
  {
    id: "credit-card-optimization",
    pathId: "debt-credit",
    title: "Using Credit Cards As Free Tools (Not Debt Traps)",
    description: "Billing cycles, grace periods, avoiding minimum due traps, and maximizing rewards safely.",
    difficulty: "Essential",
    estimatedMinutes: 6,
    format: "practical",
    status: "coming_soon",
    tags: ["Credit Cards", "Rewards", "Finance Charges"],
    quickSummary:
      "Never pay just the 'Minimum Amount Due'—finance charges in India exceed 42% APR. Treat credit cards as charge cards by spending only what you already have in your bank account.",
    sourceAttribution: "RBI Master Directions on Credit Card Operations",
  },
  {
    id: "snowball-vs-avalanche",
    pathId: "debt-credit",
    title: "Debt Payoff Strategies: Snowball vs Avalanche",
    description: "The mathematical purity of Avalanche vs the psychological momentum of Snowball.",
    difficulty: "Essential",
    estimatedMinutes: 7,
    format: "practical",
    status: "coming_soon",
    tags: ["Debt", "Repayment", "Avalanche", "Snowball"],
    quickSummary:
      "Debt Avalanche attacks the highest interest rate debt first (saving the most money). Debt Snowball knocks out the smallest balance first (giving psychological wins).",
    sourceAttribution: "Behavioral Finance Case Studies",
  },

  // 6. Investing Basics
  {
    id: "compound-interest",
    pathId: "investing-basics",
    title: "Understanding Compound Interest",
    description: "The mathematical engine of long-term wealth, exponential growth, and the cost of delay.",
    difficulty: "Essential",
    estimatedMinutes: 8,
    format: "interactive",
    status: "available",
    tags: ["Compounding", "Interest", "Rule of 72", "Time Horizon"],
    quickSummary:
      "Compound interest earns return on reinvested returns. Time in the market is vastly more powerful than timing or large lump sums. Use Rule of 72 (72 ÷ Rate) to estimate doubling time.",
    sourceAttribution: "SEBI Investor Education & AMFI India",
  },
  {
    id: "asset-classes-overview",
    pathId: "investing-basics",
    title: "Asset Classes Compared: Equity, Debt, Gold & Cash",
    description: "Understanding risk, return, liquidity, and correlation across Indian asset classes.",
    difficulty: "Foundational",
    estimatedMinutes: 7,
    format: "conceptual",
    status: "coming_soon",
    tags: ["Asset Allocation", "Equity", "Debt", "Gold"],
    quickSummary:
      "Equities provide growth to beat inflation; Debt provides stability and income; Gold acts as a geopolitical hedge; Cash offers immediate liquidity. Asset allocation drives 90% of returns.",
    sourceAttribution: "SEBI Investor Education Guide",
  },
  {
    id: "risk-profiling-realities",
    pathId: "investing-basics",
    title: "Assessing Your True Risk Tolerance",
    description: "The difference between capacity to take risk (financial) and willingness to take risk (psychological).",
    difficulty: "Essential",
    estimatedMinutes: 5,
    format: "conceptual",
    status: "coming_soon",
    tags: ["Risk", "Volatility", "Investor Psychology"],
    quickSummary:
      "Risk capacity depends on your age, income stability, and dependents. Risk tolerance is how well you sleep when your portfolio drops 20%. Design your portfolio around both.",
    sourceAttribution: "SEBI Risk Profiling Guidelines",
  },

  // 7. Mutual Funds & SIPs
  {
    id: "sip-mutual-funds",
    pathId: "mutual-funds",
    title: "SIPs and Mutual Fund Basics",
    description: "Pooled investing, rupee-cost averaging, market realities, and disciplined wealth building.",
    difficulty: "Essential",
    estimatedMinutes: 8,
    format: "interactive",
    status: "available",
    tags: ["Mutual Funds", "SIP", "Rupee-Cost Averaging", "NAV"],
    quickSummary:
      "A mutual fund pools money across hundreds of securities. A SIP automates recurring purchases, buying more units when prices dip. Always choose Direct Plans to eliminate intermediary commissions.",
    sourceAttribution: "AMFI India & SEBI Master Circular on Mutual Funds",
  },
  {
    id: "active-vs-index-funds",
    pathId: "mutual-funds",
    title: "Index Funds vs Actively Managed Funds",
    description: "The mathematical reality of passive Nifty 50 trackers and manager underperformance in India.",
    difficulty: "Applied",
    estimatedMinutes: 7,
    format: "conceptual",
    status: "coming_soon",
    tags: ["Index Funds", "Nifty 50", "Active Funds", "SPIVA"],
    quickSummary:
      "According to SPIVA reports, over 70% of Indian large-cap active fund managers fail to beat the Nifty 50 index over 5- and 10-year periods, primarily due to higher expense ratios.",
    sourceAttribution: "S&P Indices Versus Active (SPIVA) India Scorecard",
  },
  {
    id: "expense-ratio-drag",
    pathId: "mutual-funds",
    title: "The Silent Cost: Total Expense Ratio (TER)",
    description: "How a 1% distributor commission compounding over 25 years steals up to 25% of your final wealth.",
    difficulty: "Applied",
    estimatedMinutes: 6,
    format: "conceptual",
    status: "coming_soon",
    tags: ["TER", "Expense Ratio", "Direct Plans", "Fees"],
    quickSummary:
      "A 1.5% expense ratio doesn't sound like much, but when compounded over 30 years, it consumes up to one-fourth of your potential portfolio value compared to a 0.2% index fund.",
    sourceAttribution: "AMFI Disclosures & SEBI TER Limits",
  },

  // 8. Stocks & Taxes
  {
    id: "ltcg-stcg-taxes",
    pathId: "stocks-taxes",
    title: "Capital Gains Tax in India (LTCG & STCG)",
    description: "Tax rules for equity and debt: holding periods, grandfathering, and post-budget rate revisions.",
    difficulty: "Applied",
    estimatedMinutes: 7,
    format: "conceptual",
    status: "coming_soon",
    tags: ["Taxes", "LTCG", "STCG", "Income Tax", "Union Budget"],
    quickSummary:
      "Equity shares and equity funds held for > 12 months are subject to Long Term Capital Gains (LTCG) tax (12.5% above ₹1.25 Lakh exemption). Short Term Capital Gains (STCG) are taxed at 20%.",
    sourceAttribution: "Income Tax Department of India & Union Budget Provisions",
  },
  {
    id: "direct-equity-evaluations",
    pathId: "stocks-taxes",
    title: "Fundamentals of Direct Equity Investing",
    description: "Balance sheet basics, P/E ratios, Return on Equity (ROE), and competitive moats.",
    difficulty: "Applied",
    estimatedMinutes: 9,
    format: "conceptual",
    status: "coming_soon",
    tags: ["Stocks", "Fundamental Analysis", "P/E Ratio", "ROE"],
    quickSummary:
      "Buying a stock means purchasing a fractional ownership of a real business. Focus on durable competitive advantage, low debt, consistent return on equity (ROE > 15%), and reasonable valuation.",
    sourceAttribution: "SEBI Investor Education Modules",
  },
  {
    id: "elss-tax-saving",
    pathId: "stocks-taxes",
    title: "Tax-Saving Investments: ELSS vs PPF vs NPS",
    description: "Section 80C options: comparing 3-year lock-in equity vs 15-year guaranteed government PPF.",
    difficulty: "Applied",
    estimatedMinutes: 7,
    format: "conceptual",
    status: "coming_soon",
    tags: ["Tax Saving", "ELSS", "PPF", "NPS", "Section 80C"],
    quickSummary:
      "ELSS has the shortest lock-in (3 years) under Section 80C and offers equity upside. PPF offers sovereign guaranteed tax-free interest with a 15-year lock-in. Choose based on your time horizon.",
    sourceAttribution: "Income Tax Act & Ministry of Finance",
  },
];
