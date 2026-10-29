import type { Lesson } from "../types";

export const FLAGSHIP_LESSONS: Lesson[] = [
  // =========================================================================
  // LESSON A: The 50/30/20 Budgeting Guideline
  // =========================================================================
  {
    id: "budgeting-50-30-20",
    title: "The 50/30/20 Budgeting Guideline",
    subtitle: "A flexible framework to partition take-home income into Needs, Wants, and Savings.",
    category: "Budgeting & Planning",
    tier: 1,
    difficulty: "Foundational",
    estimatedMinutes: 6,
    lastReviewed: "2026-10-27",
    sources: [
      {
        title: "SEBI Investor Education — Income and Expense Management",
        publisher: "Securities and Exchange Board of India (SEBI)",
        url: "https://investor.sebi.gov.in/moneymatters-inc-exp.html",
        context: "Official SEBI principles on cash flow tracking, expense ratios, and prioritizing savings over discretionary lifestyle expenses.",
      },
      {
        title: "RBI Financial Awareness Messages (FAME) — Budgeting Basics",
        publisher: "Reserve Bank of India (RBI)",
        url: "https://www.rbi.org.in/commonman/images/FAME%20Booklet%20second%20edition/FAME%20Booklet%20English/FAME30072020.pdf",
        context: "Central banking guidelines for household savings, debt management, and sustainable living.",
      },
    ],

    hook: {
      badge: "Real-World Context",
      headline: "How would you divide ₹30,000 monthly take-home pay?",
      scenario:
        "You land your first job or monthly contract in an Indian metro earning ₹30,000 after taxes. Between rent, Swiggy, electricity, and peer pressure, money evaporates by the 22nd of each month.",
      relatablePrompt:
        "Without a benchmark, every rupee feels available to spend. The 50/30/20 guideline provides an immediate mental map to retain control before lifestyle inflation takes over.",
      defaultMonthlyIncome: 30000,
    },

    predict: {
      question:
        "Under the classic 50/30/20 framework, what is the maximum monthly rupee ceiling recommended for essential 'Needs' on a ₹30,000 take-home income?",
      helperText: "Needs include rent, basic groceries, utilities, and mandatory transportation.",
      options: [
        {
          id: "opt-1",
          label: "₹10,000 (roughly 33%)",
          sublabel: "Highly conservative, rarely achievable in metro cities.",
        },
        {
          id: "opt-2",
          label: "₹15,000 (exactly 50%)",
          sublabel: "The classical guideline benchmark for all non-negotiable living expenses.",
          isRecommended: true,
        },
        {
          id: "opt-3",
          label: "₹20,000 (roughly 66%)",
          sublabel: "Leaves only ₹10,000 combined for both lifestyle and future wealth building.",
        },
        {
          id: "opt-4",
          label: "₹25,000 (roughly 83%)",
          sublabel: "High financial fragility; virtually zero room for emergency buffers.",
        },
      ],
      explanation: {
        revealedFact:
          "50% of ₹30,000 is ₹15,000. In the classical framework, non-negotiables (rent, essential groceries, commute, health insurance) should ideally stay at or below this ceiling.",
        takeaway:
          "However, in high-cost cities like Mumbai, Bengaluru, or Delhi NCR, rent alone can consume 40% of early-career pay. That is why 50/30/20 is a flexible compass, not an inflexible prison.",
      },
    },

    teachSections: [
      {
        id: "section-1",
        title: "The Three Buckets Explained",
        paragraphs: [
          "The 50/30/20 framework divides your net take-home income into three clear, non-overlapping categories:",
          "1. Needs (50% max): Expenses you cannot stop paying without immediate severe consequences. This covers housing rent, basic groceries, electricity, water, internet for work, minimum loan EMIs, and health insurance.",
          "2. Wants (30% max): Discretionary choices that upgrade your quality of life but are not mandatory for survival. This includes dining out, weekend travel, gym memberships, OTT subscriptions, and shopping.",
          "3. Savings & Debt Reduction (20% min): Money allocated toward your future financial resilience. This funds your emergency fund, retirement, PPF/EPF, mutual fund SIPs, and prepayments on high-interest debt.",
        ],
        callout: {
          type: "concept",
          title: "The Golden Rule of Take-Home",
          text: "Always calculate percentages against net in-hand salary (after EPF deductions and TDS), not gross CTC. Gross CTC includes employer PF, insurance premiums, and variable bonuses you cannot budget monthly.",
        },
      },
      {
        id: "section-2",
        title: "The Indian Urban Reality: When 50% is Too Tight",
        paragraphs: [
          "A common frustration among young professionals in Indian metros is that rent and security deposits make a strict 50% Needs cap impossible. If your salary is ₹35,000 and shared flat rent is ₹18,000, your rent alone is already 51%.",
          "When essential costs are unusually high, the correct adaptation is NOT to abandon savings. Instead, compress the 'Wants' bucket.",
          "For example, a 65/15/20 split preserves the critical 20% savings habit while acknowledging elevated urban shelter costs.",
        ],
        callout: {
          type: "indian-context",
          title: "Tier 1 vs Tier 2 Cities",
          text: "In Tier 2 and Tier 3 cities, living expenses are frequently lower, allowing ambitious young earners to invert the ratio to 40/20/40 (saving 40% of income during early career stages).",
        },
      },
      {
        id: "section-3",
        title: "Pay Yourself First: The Mental Shift",
        paragraphs: [
          "Most people practice 'Residual Saving': Income − Spending = Savings. When you save whatever happens to be left over on the 30th, the answer is almost always zero.",
          "Sound personal finance reverses this formula: Income − Savings = Spending. As soon as salary is credited, transfer your 20% savings target into designated savings or investment accounts automatically. You then spend the remainder with complete freedom and zero guilt.",
        ],
        callout: {
          type: "misconception",
          title: "Misconception: Budgeting Means Deprivation",
          text: "A good budget does not eliminate fun. The 30% Wants bucket explicitly gives you permission to spend on lifestyle without feeling guilty, because your future is already funded.",
        },
      },
    ],

    playConfig: {
      calculatorType: "budget-50-30-20",
      promptTitle: "Interactive Budget Allocator",
      promptSubtitle: "Adjust your take-home pay and experiment with bucket splits to see how your money divides.",
    },

    quiz: [
      {
        id: "q1",
        question: "Which of the following is strictly categorized as a 'Need' rather than a 'Want'?",
        scenario: "Arjun is sorting his monthly bank statement in Mumbai.",
        options: [
          {
            id: "a",
            text: "Weekend dinners and food delivery via Swiggy",
            isCorrect: false,
            feedback: "Food delivery is a convenience upgrade (Want). Basic raw groceries and cooking supplies are the true Need.",
          },
          {
            id: "b",
            text: "Annual premium for comprehensive Health Insurance",
            isCorrect: true,
            feedback: "Correct. Health insurance protects you from catastrophic medical debt and is a non-negotiable financial shield.",
          },
          {
            id: "c",
            text: "Subscription to four OTT streaming services",
            isCorrect: false,
            feedback: "Entertainment subscriptions are discretionary lifestyle choices (Wants).",
          },
          {
            id: "d",
            text: "Upgrading to the newest flagship smartphone on zero-downpayment EMI",
            isCorrect: false,
            feedback: "Discretionary gadget upgrades are lifestyle wants, even if financed through monthly EMIs.",
          },
        ],
      },
      {
        id: "q2",
        question: "If living in a high-rent metro forces your essential costs to 65% of your income, what is the soundest adaptation?",
        options: [
          {
            id: "a",
            text: "Eliminate savings entirely until you earn a higher promotion",
            isCorrect: false,
            feedback: "Pausing savings completely destroys the habit of compounding and leaves you without an emergency buffer.",
          },
          {
            id: "b",
            text: "Reduce discretionary 'Wants' (e.g. to 15%) while maintaining a 20% savings rate",
            isCorrect: true,
            feedback: "Correct! The 'Wants' bucket acts as a shock absorber. Compressing wants preserves your financial resilience.",
          },
          {
            id: "c",
            text: "Borrow on credit cards to cover the gap",
            isCorrect: false,
            feedback: "Using revolving credit to bridge lifestyle gaps leads directly into a high-interest debt spiral.",
          },
          {
            id: "d",
            text: "Classify your weekend social outings as essential mental health needs",
            isCorrect: false,
            feedback: "Misclassifying discretionary spending hides the real deficit and prevents corrective action.",
          },
        ],
      },
    ],

    act: {
      keyTakeaways: [
        "50/30/20 is a flexible benchmark: 50% Needs maximum, 30% Wants maximum, 20% Savings minimum.",
        "Always calculate ratios against net take-home salary, not gross CTC.",
        "In high-rent cities, use the Wants bucket as the shock absorber (e.g. 65/15/20) rather than cutting savings.",
        "Automate your savings on salary day: Income − Savings = Allowable Spending.",
      ],
      actionChallenge:
        "Open your Vestor Money Plan. Inspect your planned income for this month and check if your planned allocations keep your essential commitments under control.",
      vestorBridge: {
        title: "Review Your Monthly Plan",
        description: "Open Vestor Money to compare your actual spending categories against your planned allocations.",
        actionLabel: "Go to Money Plan",
        route: "/money",
        moduleBadge: "Money Plan",
      },
    },
  },

  // =========================================================================
  // LESSON B: Building an Emergency Fund
  // =========================================================================
  {
    id: "emergency-fund",
    title: "Building an Emergency Fund",
    subtitle: "How to calculate your financial runway and protect your investments from unexpected shocks.",
    category: "Resilience & Safety",
    tier: 1,
    difficulty: "Essential",
    estimatedMinutes: 7,
    lastReviewed: "2026-10-27",
    sources: [
      {
        title: "SEBI Investor Education — Things to Do Before Investing",
        publisher: "Securities and Exchange Board of India (SEBI)",
        url: "https://investor.sebi.gov.in/investment-thingsbeforeinv.html",
        context: "Explicit SEBI mandate emphasizing emergency liquidity and health cover prior to entering capital markets.",
      },
      {
        title: "RBI Financial Awareness — Precautionary Savings",
        publisher: "Reserve Bank of India (RBI)",
        url: "https://www.rbi.org.in/commonman/images/FAME%20Booklet%20second%20edition/FAME%20Booklet%20English/FAME30072020.pdf",
        context: "Guidelines on liquid savings buffers, preventing reliance on high-cost informal or uncollateralized debt during emergencies.",
      },
    ],

    hook: {
      badge: "Financial Resilience",
      headline: "If your income stopped tomorrow, how many weeks could you survive?",
      scenario:
        "A sudden medical emergency in the family, a layoff, or a delayed freelance invoice can occur without warning. If all your money is locked in equity mutual funds or spent on rent, you are forced to borrow at 36% credit card interest or sell investments at a market loss.",
      relatablePrompt:
        "An emergency fund is not an investment designed for high returns. It is insurance for your peace of mind and your financial independence.",
      defaultMonthlyIncome: 35000,
    },

    predict: {
      question:
        "For a salaried individual with stable employment in India, how many months of non-negotiable living expenses should ideally be maintained in liquid emergency reserves?",
      helperText: "Think strictly about baseline essential expenses: rent, food, insurance, and loan EMIs.",
      options: [
        {
          id: "opt-1",
          label: "1 month of total salary",
          sublabel: "Easily wiped out by a single dental procedure or minor repair.",
        },
        {
          id: "opt-2",
          label: "3 to 6 months of essential expenses",
          sublabel: "The universally recommended safety buffer for salaried professionals.",
          isRecommended: true,
        },
        {
          id: "opt-3",
          label: "2 to 3 years of total lifestyle spending",
          sublabel: "Excessive cash dragging behind inflation; hurts long-term wealth.",
        },
        {
          id: "opt-4",
          label: "Zero (use credit cards as emergency backup)",
          sublabel: "Extreme risk; credit card APRs in India range from 36% to 45% annually.",
        },
      ],
      explanation: {
        revealedFact:
          "3 to 6 months of essential living expenses is the standard baseline. Freelancers, gig workers, and single-income families with dependents often aim for 6 to 12 months.",
        takeaway:
          "Crucially, base the fund on essential monthly expenses (e.g. ₹25,000), not your total salary (₹45,000). You will not be dining out or buying clothes during a job crisis.",
      },
    },

    teachSections: [
      {
        id: "section-1",
        title: "The Mathematical Definition of Runway",
        paragraphs: [
          "Your Financial Runway is the exact number of months you can sustain your baseline life if all income ceases:",
          "Runway (in Months) = Total Liquid Savings ÷ Essential Monthly Expenses",
          "For example, if your baseline survival expenses (rent, groceries, electricity, medical, EMIs) are ₹20,000/month, and you have ₹60,000 in a savings account, your runway is exactly 3.0 months.",
        ],
        callout: {
          type: "concept",
          title: "Runway Calculation Rule",
          text: "Never count stock holdings, crypto, or locked provident funds (PPF/EPF) as emergency runway. When a crisis strikes during a market crash, selling equity locks in permanent capital destruction.",
        },
      },
      {
        id: "section-2",
        title: "Where Should Emergency Money Be Kept?",
        paragraphs: [
          "The primary job of an emergency fund is Liquidity and Capital Preservation, NOT maximum yield. A return of 6% with instant access beats a 12% return that is locked or volatile.",
          "Ideal parking spots in India:",
          "1. High-Yield Savings Accounts with Auto Sweep-In (allows instant ATM/UPI withdrawal while earning FD rates).",
          "2. Overnight or Liquid Debt Mutual Funds (T+1 redemption, very low duration risk).",
          "3. Short-term Bank Fixed Deposits with zero exit penalty or low premature penalty.",
        ],
        callout: {
          type: "regulatory",
          title: "DICGC Bank Deposit Insurance",
          text: "In India, the Deposit Insurance and Credit Guarantee Corporation (DICGC), a subsidiary of the RBI, insures bank deposits up to ₹5,00,000 per depositor per bank (covering principal and interest).",
        },
      },
      {
        id: "section-3",
        title: "The Psychological Armor Against Market Crashes",
        paragraphs: [
          "When young investors skip an emergency fund and put 100% of their savings into Nifty 50 stocks, any sudden cash need forces them to sell. If the market is down 20%, they are forced to sell at the bottom.",
          "Having 6 months of runway gives you psychological immunity. You never touch your long-term compounding portfolio to pay for an emergency car repair or hospital admission.",
        ],
        callout: {
          type: "misconception",
          title: "Misconception: Credit Cards are an Emergency Fund",
          text: "Credit cards provide 30-45 days of interest-free credit, not capital. If you cannot pay the full balance on the due date, finance charges in India average 3.5% per month (over 42% APR).",
        },
      },
    ],

    playConfig: {
      calculatorType: "emergency-runway",
      promptTitle: "Interactive Runway & Target Simulator",
      promptSubtitle: "Enter your essential monthly burn rate and available cash to test your resilience.",
    },

    quiz: [
      {
        id: "q1",
        question: "Why should you NOT keep your primary emergency fund in equity mutual funds or direct stocks?",
        options: [
          {
            id: "a",
            text: "Equity markets can crash right when economic downturns or job losses occur, forcing you to sell at a loss",
            isCorrect: true,
            feedback: "Correct! Emergencies often correlate with economic recessions. Liquidating equity during a downturn crystallizes paper losses.",
          },
          {
            id: "b",
            text: "Indian equity funds do not allow withdrawals for at least 5 years",
            isCorrect: false,
            feedback: "Only ELSS tax-saving funds have a 3-year lock-in; open-ended equity funds allow withdrawals, but market volatility makes them unsafe for emergency cash.",
          },
          {
            id: "c",
            text: "SEBI regulations prohibit using equity profits for personal medical needs",
            isCorrect: false,
            feedback: "There is no such regulation; your money is yours, but using volatile assets for emergencies is bad financial planning.",
          },
        ],
      },
      {
        id: "q2",
        question: "Priya spends ₹40,000 each month: ₹22,000 on rent, groceries & EMIs, and ₹18,000 on dining, shopping, and travel. How should she calculate her 6-month emergency fund target?",
        options: [
          {
            id: "a",
            text: "₹40,000 × 6 = ₹2,40,000 based on total monthly lifestyle spending",
            isCorrect: false,
            feedback: "This over-inflates the requirement and keeps too much cash idle behind inflation.",
          },
          {
            id: "b",
            text: "₹22,000 × 6 = ₹1,32,000 based strictly on non-negotiable essential expenses",
            isCorrect: true,
            feedback: "Spot on! In an emergency, discretionary lifestyle spending is paused immediately. The safety buffer protects non-negotiables.",
          },
          {
            id: "c",
            text: "₹18,000 × 6 = ₹1,08,000 based only on discretionary wants",
            isCorrect: false,
            feedback: "Discretionary expenses are the first things cut; basing the fund on them leaves essentials unpaid.",
          },
        ],
      },
    ],

    act: {
      keyTakeaways: [
        "Your emergency runway equals Liquid Cash divided by Non-Negotiable Monthly Expenses.",
        "Target 3 to 6 months of essential expenses if you are a salaried employee; 6 to 12 months if self-employed.",
        "Store this money in high-liquidity, low-risk instruments: sweep-in bank accounts, liquid mutual funds, or short-term FDs.",
        "Never invest in equity until your emergency runway has at least 3 months of baseline coverage.",
      ],
      actionChallenge:
        "Visit your Vestor Goals dashboard. Create an 'Emergency Fund' goal with your calculated 3 to 6 month target so you can track your progress as you deposit reserves.",
      vestorBridge: {
        title: "Track Your Emergency Fund",
        description: "Set up a dedicated Emergency Fund goal in Vestor to visualize your runway progress.",
        actionLabel: "Go to Goals",
        route: "/goals",
        moduleBadge: "Goals",
      },
    },
  },

  // =========================================================================
  // LESSON C: Understanding Compound Interest
  // =========================================================================
  {
    id: "compound-interest",
    title: "Understanding Compound Interest",
    subtitle: "The mathematical engine of long-term wealth, exponential growth, and the cost of delay.",
    category: "Wealth Creation",
    tier: 1,
    difficulty: "Essential",
    estimatedMinutes: 8,
    lastReviewed: "2026-10-27",
    sources: [
      {
        title: "SEBI Investor Education — The Power of Compounding",
        publisher: "Securities and Exchange Board of India (SEBI)",
        url: "https://investor.sebi.gov.in/moneymatters-powerofcom.html",
        context: "Mathematical walkthrough of simple interest vs compound interest, frequency effects, and long investment horizons.",
      },
      {
        title: "AMFI India — The 8th Wonder of the World: Compounding",
        publisher: "Association of Mutual Funds in India (AMFI)",
        url: "https://www.amfiindia.com/investor-corner/investor-education/power-of-compounding.html",
        context: "Practical illustrations of early start advantages and systematic wealth accumulation across decades.",
      },
    ],

    hook: {
      badge: "The Exponential Multiplier",
      headline: "Who ends up with more wealth at age 60?",
      scenario:
        "Person A invests ₹5,000 every month from age 22 to 32 (10 years, total ₹6 Lakhs invested) and never adds another rupee. Person B delays until age 32, then invests ₹5,000 every month continuously until age 60 (28 years, total ₹16.8 Lakhs invested). Assuming an identical 10% annual return, who wins?",
      relatablePrompt:
        "Most people assume Person B must win because they invested nearly triple the capital. Compounding math reveals a staggering truth about time.",
      defaultMonthlyIncome: 40000,
    },

    predict: {
      question:
        "In the scenario above, which investor will have accumulated a higher final portfolio balance at age 60 at a 10% annual rate?",
      helperText: "Consider the compound interest earned on Person A's money over the 28 years it sat growing untouched.",
      options: [
        {
          id: "opt-1",
          label: "Person B by a huge margin (invested ₹16.8 Lakhs vs ₹6 Lakhs)",
          sublabel: "A common intuition that prioritizes capital over time.",
        },
        {
          id: "opt-2",
          label: "Person A has more (or virtually equal) despite investing ₹10.8 Lakhs less",
          sublabel: "The exponential curve rewards starting 10 years earlier.",
          isRecommended: true,
        },
        {
          id: "opt-3",
          label: "Both will have exactly the same amount down to the rupee",
          sublabel: "Mathematically impossible given differing contribution schedules.",
        },
      ],
      explanation: {
        revealedFact:
          "Person A accumulates approximately ₹1.36 Crore by age 60 with only ₹6 Lakhs out of pocket! Person B accumulates approximately ₹1.05 Crore despite contributing ₹16.8 Lakhs.",
        takeaway:
          "Starting 10 years earlier allowed Person A to earn interest on interest for an extra decade. Time in the market is vastly more powerful than timing or extra capital.",
      },
    },

    teachSections: [
      {
        id: "section-1",
        title: "Simple Interest vs Compound Interest",
        paragraphs: [
          "With Simple Interest, you only earn returns on your original principal. If you invest ₹1,00,000 at 10%, you earn ₹10,000 each year forever. After 20 years, your total gain is linear: ₹2,00,000.",
          "With Compound Interest, your earnings are reinvested. In Year 1, you earn ₹10,000. In Year 2, you earn 10% on ₹1,10,000 (₹11,000). By Year 20, your annual gain alone is over ₹60,000, and your total balance is ₹6,72,750.",
          "Formula: A = P × (1 + r/n)^(n×t)",
          "Where P is principal, r is the annual rate, n is compounding frequency, and t is time in years.",
        ],
        callout: {
          type: "concept",
          title: "The Hockey Stick Curve",
          text: "Compounding looks deceptively slow during the first 5 to 7 years. The real exponential explosion occurs in years 15 through 30. Patience is the price of admission.",
        },
      },
      {
        id: "section-2",
        title: "The Mental Shortcut: The Rule of 72",
        paragraphs: [
          "Want to know how fast your money doubles without a financial calculator? Use the Rule of 72:",
          "Years to Double Money ≈ 72 ÷ Annual Interest Rate",
          "• At 6% (Bank Fixed Deposit): 72 ÷ 6 = 12 years to double.",
          "• At 9% (Conservative Balanced Fund): 72 ÷ 9 = 8 years to double.",
          "• At 12% (Long-term Broad Equity Index): 72 ÷ 12 = 6 years to double.",
        ],
        callout: {
          type: "tip",
          title: "The Power of an Extra 3%",
          text: "An increase from 6% to 12% does not just double your returns — over 30 years, it quadruples your final wealth due to compounding cycles.",
        },
      },
      {
        id: "section-3",
        title: "Crucial Reality Checks",
        paragraphs: [
          "Compounding works miracles in spreadsheets, but real life includes two major counterweights:",
          "1. Inflation: 6% inflation silently reduces the purchasing power of your compounded corpus.",
          "2. Market Volatility: Stock markets do not deliver a clean 12% every single year. Some years will be −15%, others +25%. Compound annual growth rate (CAGR) is a smoothed long-term geometric average, not a guaranteed fixed interest payment.",
        ],
        callout: {
          type: "regulatory",
          title: "SEBI Compliance Reminder",
          text: "Past performance and illustrative compound rate calculations are purely educational tools. They do not guarantee future investment returns.",
        },
      },
    ],

    playConfig: {
      calculatorType: "compound-interest",
      promptTitle: "Interactive Compounding Simulator",
      promptSubtitle: "Adjust initial capital, monthly additions, hypothetical rate, and time horizon to see exponential growth.",
    },

    quiz: [
      {
        id: "q1",
        question: "Using the Rule of 72, if an investment yields a hypothetical 8% annual return, approximately how many years will it take for your capital to double?",
        options: [
          {
            id: "a",
            text: "6 years",
            isCorrect: false,
            feedback: "72 ÷ 8 = 9 years, not 6. (6 years would require a 12% return).",
          },
          {
            id: "b",
            text: "9 years",
            isCorrect: true,
            feedback: "Correct! 72 ÷ 8 = 9 years. In 18 years it will quadruple, and in 27 years it will octuple (8x).",
          },
          {
            id: "c",
            text: "12 years",
            isCorrect: false,
            feedback: "72 ÷ 8 = 9 years. A 12-year doubling time corresponds to a 6% return.",
          },
        ],
      },
      {
        id: "q2",
        question: "Why does compounding feel unimpressive during the first 3 to 5 years of an investment journey?",
        options: [
          {
            id: "a",
            text: "Because Indian asset managers secretly withhold compound interest until Year 10",
            isCorrect: false,
            feedback: "False. All mutual funds and deposits credit returns according to standard NAV and interest accounting.",
          },
          {
            id: "b",
            text: "Because in early years, the accumulated returns are small relative to your principal; the exponential multiplier takes time to build a large base",
            isCorrect: true,
            feedback: "Spot on! 10% on ₹50,000 is just ₹5,000. But 10% on ₹50,00,000 is ₹5,00,000 per year. The base must mature first.",
          },
          {
            id: "c",
            text: "Because simple interest is actually faster than compound interest in early decades",
            isCorrect: false,
            feedback: "Compound interest is always equal to or strictly greater than simple interest for any rate above zero.",
          },
        ],
      },
    ],

    act: {
      keyTakeaways: [
        "Compound interest is interest earned on previously accumulated interest.",
        "Time is the single most valuable asset in compounding — starting early beats investing more money later.",
        "Use the Rule of 72 (72 ÷ Rate) to quickly estimate doubling periods in your head.",
        "Keep investments uninterrupted during market downturns to let the compound curve do its work.",
      ],
      actionChallenge:
        "Inspect your actual investment portfolio in Vestor Invest. Notice whether you have started building long-term compounding assets or if your capital is sitting in low-yield cash.",
      vestorBridge: {
        title: "Track Your Portfolio Holdings",
        description: "Open Vestor Invest to track your real asset allocation and holding values.",
        actionLabel: "Go to Invest",
        route: "/invest",
        moduleBadge: "Invest",
      },
    },
  },

  // =========================================================================
  // LESSON D: Inflation and Purchasing Power
  // =========================================================================
  {
    id: "inflation-purchasing-power",
    title: "Inflation and Purchasing Power",
    subtitle: "Why ₹1 Lakh today will buy half as much in 12 years, and how to protect your future.",
    category: "Macroeconomics",
    tier: 1,
    difficulty: "Essential",
    estimatedMinutes: 6,
    lastReviewed: "2026-10-27",
    sources: [
      {
        title: "SEBI Investor Education — Inflation and Its Impact",
        publisher: "Securities and Exchange Board of India (SEBI)",
        url: "https://investor.sebi.gov.in/moneymatters-inflation.html",
        context: "Official SEBI primer on CPI, real vs nominal returns, and the silent destruction of idle cash savings.",
      },
      {
        title: "RBI Consumer Price Index & Monetary Policy Framework",
        publisher: "Reserve Bank of India (RBI)",
        url: "https://www.rbi.org.in",
        context: "The RBI inflation targeting band of 4% (+/- 2%) and its impact on household purchasing power across India.",
      },
    ],

    hook: {
      badge: "The Silent Wealth Thief",
      headline: "₹1,00,000 in your cupboard in 2010 vs 2026: What happened?",
      scenario:
        "If your grandmother kept a ₹1,00,000 bundle of cash safely locked in a Godrej cupboard in 2010, today she still has exactly ₹1,00,000. But what can that money actually purchase today?",
      relatablePrompt:
        "In 2010, ₹1 Lakh paid for an entire year of college tuition or 100 grams of gold. Today, that same ₹1 Lakh barely pays for a single semester or 12 grams of gold. The rupee count stayed identical, but its value melted away.",
      defaultMonthlyIncome: 50000,
    },

    predict: {
      question:
        "If retail inflation in India averages 6% annually, in roughly how many years will the cost of living double (Rule of 70)?",
      helperText: "When prices double, your fixed cash purchases exactly 50% of what it used to.",
      options: [
        {
          id: "opt-1",
          label: "Roughly 6 years",
          sublabel: "Would require hyperinflation of ~12% per year.",
        },
        {
          id: "opt-2",
          label: "Roughly 11.7 to 12 years",
          sublabel: "70 ÷ 6 ≈ 11.67 years.",
          isRecommended: true,
        },
        {
          id: "opt-3",
          label: "Roughly 25 years",
          sublabel: "Underestimates the compounding speed of 6% price increases.",
        },
        {
          id: "opt-4",
          label: "Prices never double in stable economies",
          sublabel: "All fiat currencies experience gradual baseline inflation.",
        },
      ],
      explanation: {
        revealedFact:
          "At 6% annual inflation, prices double every ~11.7 years (70 ÷ 6). That means an expense of ₹50,000/month today will cost ₹1,00,000/month by 2038 just to maintain the identical standard of living.",
        takeaway:
          "Keeping your money in a traditional 3% bank savings account guarantees you are losing 3% in real purchasing power every single year.",
      },
    },

    teachSections: [
      {
        id: "section-1",
        title: "Nominal Value vs Real Purchasing Power",
        paragraphs: [
          "Money has two distinct values:",
          "1. Nominal Value: The number printed on the currency note or bank statement. This never changes if cash sits in a drawer.",
          "2. Real Value (Purchasing Power): The actual volume of goods, services, healthcare, and education that money can buy.",
          "Inflation is the rate at which general price levels rise over time. When inflation is 6%, an item that costs ₹100 this year will cost ₹106 next year.",
        ],
        callout: {
          type: "concept",
          title: "The Real Return Equation",
          text: "Real Return = Nominal Interest Rate − Inflation Rate − Taxes. If your Fixed Deposit pays 6.5% and inflation is 6%, your pre-tax real return is just 0.5%. After 20% or 30% income tax on interest, your real return is actually NEGATIVE.",
        },
      },
      {
        id: "section-2",
        title: "Why Fixed Deposits Alone Cannot Fund Long-Term Goals",
        paragraphs: [
          "Many traditional Indian households believe Bank Fixed Deposits are the 'safest' investment because they never show a negative number on a statement.",
          "While FDs carry zero nominal risk (your principal is guaranteed up to ₹5 Lakhs by DICGC), they carry immense 'Inflation Risk' over 10 to 20 year horizons.",
          "If your child's higher education costs ₹20 Lakhs today and education inflation runs at 8-10%, an FD earning 6.5% leaves you with a massive deficit when the college fees come due.",
        ],
        callout: {
          type: "indian-context",
          title: "Education and Healthcare Inflation",
          text: "In India, specialized inflation indices for private healthcare and higher education historically outpace headline CPI, often averaging 8% to 11% annually.",
        },
      },
      {
        id: "section-3",
        title: "Beating Inflation: Growth Assets",
        paragraphs: [
          "To preserve and grow purchasing power across decades, a portfolio must include assets whose revenues or intrinsic values grow with the economy:",
          "• Equity Mutual Funds & Stocks: Businesses raise product prices as raw materials inflate, protecting profit margins and dividends.",
          "• Real Estate: Rental yields and land prices typically adjust upward over long cycles.",
          "• Gold: Historically used as a global monetary store of value during currency debasement.",
        ],
        callout: {
          type: "regulatory",
          title: "Balanced Allocation Reminder",
          text: "Beating inflation requires accepting short-term market volatility. Never put short-term money (< 3 years) into equity just to beat inflation.",
        },
      },
    ],

    playConfig: {
      calculatorType: "inflation",
      promptTitle: "Interactive Purchasing Power Visualizer",
      promptSubtitle: "Simulate how inflation diminishes purchasing power and increases future living costs.",
    },

    quiz: [
      {
        id: "q1",
        question: "If your bank savings account pays 3.0% interest per year, and CPI inflation in India is 5.5%, what is happening to your wealth?",
        options: [
          {
            id: "a",
            text: "Your wealth is growing by 3.0% each year safely",
            isCorrect: false,
            feedback: "Nominally your balance grows, but the goods you can buy with that balance decline.",
          },
          {
            id: "b",
            text: "You are losing approximately 2.5% in real purchasing power every single year",
            isCorrect: true,
            feedback: "Correct! Real return = 3.0% − 5.5% = −2.5%. You can buy 2.5% fewer goods each year.",
          },
          {
            id: "c",
            text: "The bank will adjust your balance to match inflation at year-end",
            isCorrect: false,
            feedback: "Banks pay contractual interest rates; they do not compensate depositors for inflation.",
          },
        ],
      },
      {
        id: "q2",
        question: "Why is education inflation particularly dangerous for young parents planning 15 years in advance?",
        options: [
          {
            id: "a",
            text: "Education costs in India often inflate at 8–10%, far higher than headline food and fuel inflation",
            isCorrect: true,
            feedback: "Correct! Planning for higher education using a standard 5% inflation assumption leads to a massive shortfall.",
          },
          {
            id: "b",
            text: "Universities do not accept payments from mutual fund redemptions",
            isCorrect: false,
            feedback: "Universities accept standard bank transfers from redeemed investments.",
          },
          {
            id: "c",
            text: "Because student loans are illegal in India",
            isCorrect: false,
            feedback: "Student loans are widely available, but rely on high interest and collateral.",
          },
        ],
      },
    ],

    act: {
      keyTakeaways: [
        "Inflation is the erosion of purchasing power: the same money buys fewer goods over time.",
        "Real Return = Nominal Return − Inflation − Taxes. Aim for positive real returns on long-term capital.",
        "Cash in a cupboard or basic savings account guaranteed to lose purchasing power year after year.",
        "Equity and real growth assets are necessary engines to beat long-term inflation for goals 5+ years away.",
      ],
      actionChallenge:
        "Check your Vestor Goals. Are your target goal amounts adjusted for the year you actually need the money, or are you targeting today's prices?",
      vestorBridge: {
        title: "Review Goal Timelines & Targets",
        description: "Review your target deadlines in Vestor Goals to see if you have accounted for inflation.",
        actionLabel: "Go to Goals",
        route: "/goals",
        moduleBadge: "Goals",
      },
    },
  },

  // =========================================================================
  // LESSON E: SIPs and Mutual Fund Basics
  // =========================================================================
  {
    id: "sip-mutual-funds",
    title: "SIPs and Mutual Fund Basics",
    subtitle: "Pooled investing, rupee-cost averaging, market realities, and disciplined wealth building.",
    category: "Investing Principles",
    tier: 1,
    difficulty: "Essential",
    estimatedMinutes: 8,
    lastReviewed: "2026-10-27",
    sources: [
      {
        title: "AMFI India — What is a Mutual Fund & How SIP Works",
        publisher: "Association of Mutual Funds in India (AMFI)",
        url: "https://www.amfiindia.com/investor-corner/investor-education/what-are-mutual-funds.html",
        context: "Official industry guidelines on pooled trusts, Net Asset Value (NAV), SEBI categorization, and rupee-cost averaging.",
      },
      {
        title: "SEBI Master Circular on Mutual Funds",
        publisher: "Securities and Exchange Board of India (SEBI)",
        url: "https://www.sebi.gov.in",
        context: "Regulatory protections, expense ratio caps (TER), scheme risk-o-meters, and disclosure requirements.",
      },
    ],

    hook: {
      badge: "Disciplined Investing",
      headline: "Does investing via SIP guarantee you will never suffer a loss?",
      scenario:
        "You hear friends and influencers talk about starting a ₹2,000 monthly SIP like it's a magical savings account with guaranteed 15% returns that never drops. Then a geopolitical shock or rate hike hits, and your portfolio turns red.",
      relatablePrompt:
        "A Systematic Investment Plan (SIP) is NOT an asset class. It is a disciplined purchase method for investing in mutual funds. Understanding how it works prevents panic selling during market dips.",
      defaultMonthlyIncome: 45000,
    },

    predict: {
      question:
        "What happens when the stock market crashes by 20% while your monthly equity mutual fund SIP is actively running?",
      helperText: "Think about Net Asset Value (NAV) and the number of mutual fund units your fixed installment buys.",
      options: [
        {
          id: "opt-1",
          label: "Your SIP is automatically paused by the fund house to prevent losses",
          sublabel: "Incorrect; SIPs continue unless you actively stop them.",
        },
        {
          id: "opt-2",
          label: "Your fixed monthly payment buys MORE units at cheaper NAVs",
          sublabel: "This is the mathematical core of Rupee-Cost Averaging.",
          isRecommended: true,
        },
        {
          id: "opt-3",
          label: "Your past accumulated units vanish permanently",
          sublabel: "Market prices fluctuate, but your unit count never decreases unless you sell.",
        },
      ],
      explanation: {
        revealedFact:
          "When NAV drops from ₹100 to ₹80, your fixed ₹5,000 monthly SIP buys 62.5 units instead of 50 units. When the market eventually rebounds, those discounted units supercharge your gains.",
        takeaway:
          "This is Rupee-Cost Averaging. Market corrections are not disasters for SIP investors — they are discount sales on productive business units.",
      },
    },

    teachSections: [
      {
        id: "section-1",
        title: "What is a Mutual Fund?",
        paragraphs: [
          "A mutual fund pools money from thousands of investors to purchase a diversified portfolio of securities (stocks, bonds, or gold).",
          "Instead of needing ₹1,50,000 to buy shares across 50 different Indian companies yourself, you can invest ₹500 into a mutual fund and immediately own a proportional fraction of all 50 companies.",
          "Net Asset Value (NAV): The market price of a single unit of the mutual fund, calculated daily after trading closes.",
        ],
        callout: {
          type: "concept",
          title: "Direct vs Regular Plans",
          text: "In India, every mutual fund has two variants: 'Direct' (no distributor commission, lower expense ratio) and 'Regular' (pays ongoing commissions to an agent). Over 25 years, choosing Direct plans can increase your final corpus by 15-20%.",
        },
      },
      {
        id: "section-2",
        title: "SIP: A Method, Not a Product",
        paragraphs: [
          "A Systematic Investment Plan (SIP) is simply an automated instruction to invest a fixed sum into a designated mutual fund scheme on a recurring date (e.g. the 5th of each month).",
          "Key benefits of SIP:",
          "1. Removes market timing: You never have to predict whether the market will be up or down tomorrow.",
          "2. Automates financial discipline: Money moves right after salary credit before discretionary spending occurs.",
          "3. Rupee-Cost Averaging: Eliminates the emotional pain of buying at peaks by automatically buying more units during downturns.",
        ],
        callout: {
          type: "misconception",
          title: "Common Myth: 'SIP Guarantees No Losses'",
          text: "SIP does not eliminate market risk. If you invest for 1 year in an equity fund and the market enters a prolonged bear cycle, your portfolio value can and will be negative in the short term. Equity SIPs require a 5+ year time horizon.",
        },
      },
      {
        id: "section-3",
        title: "Costs, Taxes, and the Risk-O-Meter",
        paragraphs: [
          "Before investing in any mutual fund in India, check these three essentials:",
          "1. Total Expense Ratio (TER): The annual percentage fee the fund charges to manage your capital. For broad index funds, this should ideally be under 0.30%.",
          "2. Exit Load: A fee charged if you redeem units before a specified period (e.g., 1% if redeemed within 1 year).",
          "3. SEBI Risk-O-Meter: A mandatory visual dial ranking schemes from Low to Very High risk.",
        ],
        callout: {
          type: "regulatory",
          title: "Mandatory Regulatory Disclaimer",
          text: "Mutual fund investments are subject to market risks. Read all scheme-related documents carefully before investing. Past performance is not an indicator of future returns.",
        },
      },
    ],

    playConfig: {
      calculatorType: "sip-calculator",
      promptTitle: "Interactive SIP Wealth Accumulator",
      promptSubtitle: "Simulate monthly contributions, investment horizons, and hypothetical compounding returns.",
    },

    quiz: [
      {
        id: "q1",
        question: "What is the primary difference between a Direct Plan and a Regular Plan in an Indian mutual fund?",
        options: [
          {
            id: "a",
            text: "Direct plans invest in safer government bonds while Regular plans invest in risky derivatives",
            isCorrect: false,
            feedback: "Both plans hold the exact same portfolio of securities managed by the same fund manager.",
          },
          {
            id: "b",
            text: "Direct plans have lower expense ratios because no intermediary commission is deducted, leading to higher net returns",
            isCorrect: true,
            feedback: "Correct! Direct plans pass the saved broker commissions back to you as higher NAV growth.",
          },
          {
            id: "c",
            text: "Direct plans are only available to accredited institutional corporations",
            isCorrect: false,
            feedback: "Any retail Indian citizen can invest in Direct mutual funds directly via AMC websites or registered execution platforms.",
          },
        ],
      },
      {
        id: "q2",
        question: "Why is a 1-year time horizon unsuitable for an Equity Mutual Fund SIP?",
        options: [
          {
            id: "a",
            text: "Equity markets are volatile in the short term and can easily deliver negative returns over 12 months",
            isCorrect: true,
            feedback: "Spot on! Equities require at least 5 to 7 years to smooth out business and market cycles. Short-term money belongs in Liquid or Debt funds.",
          },
          {
            id: "b",
            text: "SEBI freezes all mutual fund investments until the 3rd financial year",
            isCorrect: false,
            feedback: "Open-ended equity funds allow withdrawals anytime (subject to exit loads and capital gains taxes).",
          },
          {
            id: "c",
            text: "SIP installments only begin investing actual money from Month 13 onwards",
            isCorrect: false,
            feedback: "Every monthly SIP installment buys units immediately on the transaction date.",
          },
        ],
      },
    ],

    act: {
      keyTakeaways: [
        "A mutual fund pools resources to give you instant, low-cost diversification across hundreds of companies.",
        "A SIP is an automated installment method that leverages rupee-cost averaging across market fluctuations.",
        "Always choose Direct Plans over Regular Plans to avoid paying lifelong distributor commissions.",
        "Equity mutual funds are long-term instruments: give them at least 5 to 7 years to weather market cycles.",
      ],
      actionChallenge:
        "Check your Vestor Invest module. Record any mutual fund holdings or explore how recurring investments align with your monthly planned allocation in Money.",
      vestorBridge: {
        title: "Track Your Investments",
        description: "Open Vestor Invest to monitor your actual holdings, purchase lots, and portfolio diversification.",
        actionLabel: "Go to Invest",
        route: "/invest",
        moduleBadge: "Invest",
      },
    },
  },
];
