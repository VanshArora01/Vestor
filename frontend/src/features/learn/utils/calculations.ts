/**
 * Deterministic Financial Calculations Engine for Vestor Learn.
 * All calculations use tested, verifiable financial mathematics without LLM dependencies.
 */

export interface BudgetSplitResult {
  needsAmount: number;
  wantsAmount: number;
  savingsAmount: number;
  totalPct: number;
  remainingPct: number;
  isOverallocated: boolean;
  isValid: boolean;
}

export function calculateBudgetSplit(
  income: number,
  needsPct: number,
  wantsPct: number,
  savingsPct: number,
): BudgetSplitResult {
  const safeIncome = Math.max(0, income);
  const totalPct = needsPct + wantsPct + savingsPct;
  const remainingPct = 100 - totalPct;

  const needsAmount = Math.round((safeIncome * Math.max(0, needsPct)) / 100);
  const wantsAmount = Math.round((safeIncome * Math.max(0, wantsPct)) / 100);
  const savingsAmount = Math.round((safeIncome * Math.max(0, savingsPct)) / 100);

  return {
    needsAmount,
    wantsAmount,
    savingsAmount,
    totalPct,
    remainingPct,
    isOverallocated: totalPct > 100,
    isValid: totalPct === 100,
  };
}

export interface EmergencyRunwayResult {
  runwayMonths: number;
  runwayCategory: "critical" | "vulnerable" | "adequate" | "robust";
  runwayLabel: string;
  target3Months: number;
  target6Months: number;
  target12Months: number;
  gapFor6Months: number;
  percentOf6MonthTarget: number;
}

export function calculateEmergencyRunway(
  monthlyExpenses: number,
  liquidSavings: number,
): EmergencyRunwayResult {
  const safeExpenses = Math.max(0, monthlyExpenses);
  const safeSavings = Math.max(0, liquidSavings);

  let runwayMonths = 0;
  if (safeExpenses > 0) {
    runwayMonths = Number((safeSavings / safeExpenses).toFixed(1));
  } else if (safeSavings > 0) {
    runwayMonths = 99.9; // Expenses are 0, infinite runway
  }

  let runwayCategory: "critical" | "vulnerable" | "adequate" | "robust" = "critical";
  let runwayLabel = "High Risk (< 1 month)";

  if (runwayMonths >= 6.0) {
    runwayCategory = "robust";
    runwayLabel = "Resilient (6+ months covered)";
  } else if (runwayMonths >= 3.0) {
    runwayCategory = "adequate";
    runwayLabel = "Standard Baseline (3–6 months)";
  } else if (runwayMonths >= 1.0) {
    runwayCategory = "vulnerable";
    runwayLabel = "Vulnerable (1–3 months)";
  }

  const target3Months = safeExpenses * 3;
  const target6Months = safeExpenses * 6;
  const target12Months = safeExpenses * 12;
  const gapFor6Months = Math.max(0, target6Months - safeSavings);
  const percentOf6MonthTarget =
    target6Months > 0 ? Math.min(100, Math.round((safeSavings / target6Months) * 100)) : 100;

  return {
    runwayMonths,
    runwayCategory,
    runwayLabel,
    target3Months,
    target6Months,
    target12Months,
    gapFor6Months,
    percentOf6MonthTarget,
  };
}

export interface CompoundingYearPoint {
  year: number;
  totalInvested: number;
  compoundValue: number;
  simpleValue: number;
  interestEarned: number;
}

export interface CompoundGrowthResult {
  totalInvested: number;
  totalGains: number;
  futureValue: number;
  multiplier: number;
  schedule: CompoundingYearPoint[];
}

export function calculateCompoundGrowth(
  principal: number,
  monthlyAddition: number,
  annualRatePct: number,
  years: number,
  compoundingFrequency: 1 | 12 = 12,
): CompoundGrowthResult {
  const p = Math.max(0, principal);
  const pmt = Math.max(0, monthlyAddition);
  const r = Math.max(0, annualRatePct) / 100;
  const yMax = Math.max(1, Math.min(40, years));

  const schedule: CompoundingYearPoint[] = [];

  for (let y = 0; y <= yMax; y++) {
    const totalInvested = Math.round(p + pmt * 12 * y);

    // Compound future value of lump sum
    const lumpSumGrowth =
      r > 0 ? p * Math.pow(1 + r / compoundingFrequency, compoundingFrequency * y) : p;

    // Compound future value of monthly annuity (end-of-month or beginning-of-month)
    let annuityGrowth = 0;
    if (y > 0 && pmt > 0) {
      if (r > 0) {
        const monthlyRate = r / 12;
        const totalMonths = y * 12;
        // Future value of ordinary annuity with advance compounding
        annuityGrowth =
          pmt * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
      } else {
        annuityGrowth = pmt * 12 * y;
      }
    }

    const compoundValue = Math.round(lumpSumGrowth + annuityGrowth);

    // Simple interest comparison for learning
    const simpleLumpSum = p * (1 + r * y);
    const simpleAnnuity = pmt * 12 * y + pmt * 12 * ((y * (y + 1)) / 2) * (r / 2);
    const simpleValue = Math.round(simpleLumpSum + (y > 0 ? simpleAnnuity : 0));

    schedule.push({
      year: y,
      totalInvested,
      compoundValue,
      simpleValue,
      interestEarned: Math.max(0, compoundValue - totalInvested),
    });
  }

  const finalPoint = schedule[schedule.length - 1];
  const futureValue = finalPoint.compoundValue;
  const totalInvested = finalPoint.totalInvested;
  const totalGains = Math.max(0, futureValue - totalInvested);
  const multiplier = totalInvested > 0 ? Number((futureValue / totalInvested).toFixed(2)) : 1;

  return {
    totalInvested,
    totalGains,
    futureValue,
    multiplier,
    schedule,
  };
}

export interface InflationYearPoint {
  year: number;
  futurePrice: number;
  realPurchasingPower: number;
  purchasingPowerLossPct: number;
}

export interface InflationResult {
  currentAmount: number;
  futurePrice: number;
  realPurchasingPower: number;
  purchasingPowerLossPct: number;
  doublingYears: number;
  schedule: InflationYearPoint[];
}

export function calculateInflationImpact(
  amount: number,
  annualInflationPct: number,
  years: number,
): InflationResult {
  const pv = Math.max(0, amount);
  const r = Math.max(0.1, annualInflationPct) / 100;
  const yMax = Math.max(1, Math.min(40, years));

  const schedule: InflationYearPoint[] = [];

  for (let y = 0; y <= yMax; y++) {
    const futurePrice = Math.round(pv * Math.pow(1 + r, y));
    const realPurchasingPower = Math.round(pv / Math.pow(1 + r, y));
    const purchasingPowerLossPct = pv > 0 ? Math.round(((pv - realPurchasingPower) / pv) * 100) : 0;

    schedule.push({
      year: y,
      futurePrice,
      realPurchasingPower,
      purchasingPowerLossPct,
    });
  }

  const finalPoint = schedule[schedule.length - 1];
  const doublingYears = Number((70 / annualInflationPct).toFixed(1));

  return {
    currentAmount: pv,
    futurePrice: finalPoint.futurePrice,
    realPurchasingPower: finalPoint.realPurchasingPower,
    purchasingPowerLossPct: finalPoint.purchasingPowerLossPct,
    doublingYears,
    schedule,
  };
}

export interface SipYearPoint {
  year: number;
  totalInvested: number;
  estimatedCorpus: number;
  estimatedReturns: number;
}

export interface SipResult {
  monthlyInvestment: number;
  tenureYears: number;
  expectedReturnRate: number;
  totalInvested: number;
  estimatedReturns: number;
  totalCorpus: number;
  wealthMultiplier: number;
  schedule: SipYearPoint[];
}

export function calculateSipReturns(
  monthlyInvestment: number,
  expectedReturnRatePct: number,
  years: number,
): SipResult {
  const p = Math.max(0, monthlyInvestment);
  const r = Math.max(0, expectedReturnRatePct) / 100;
  const yMax = Math.max(1, Math.min(35, years));

  const schedule: SipYearPoint[] = [];

  for (let y = 1; y <= yMax; y++) {
    const n = y * 12;
    const i = r / 12;

    const totalInvested = p * n;
    let estimatedCorpus = 0;

    if (i > 0) {
      estimatedCorpus = Math.round(p * ((Math.pow(1 + i, n) - 1) / i) * (1 + i));
    } else {
      estimatedCorpus = totalInvested;
    }

    const estimatedReturns = Math.max(0, estimatedCorpus - totalInvested);

    schedule.push({
      year: y,
      totalInvested,
      estimatedCorpus,
      estimatedReturns,
    });
  }

  const finalPoint = schedule[schedule.length - 1] || {
    totalInvested: 0,
    estimatedCorpus: 0,
    estimatedReturns: 0,
  };

  const totalInvested = finalPoint.totalInvested;
  const totalCorpus = finalPoint.estimatedCorpus;
  const estimatedReturns = finalPoint.estimatedReturns;
  const wealthMultiplier = totalInvested > 0 ? Number((totalCorpus / totalInvested).toFixed(2)) : 1;

  return {
    monthlyInvestment: p,
    tenureYears: yMax,
    expectedReturnRate: expectedReturnRatePct,
    totalInvested,
    estimatedReturns,
    totalCorpus,
    wealthMultiplier,
    schedule,
  };
}

export interface EmiYearPoint {
  year: number;
  principalPaid: number;
  interestPaid: number;
  balanceRemaining: number;
}

export interface EmiResult {
  monthlyEmi: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
  interestRatioPct: number;
  schedule: EmiYearPoint[];
}

export function calculateEmi(
  principal: number,
  annualInterestRatePct: number,
  years: number,
): EmiResult {
  const p = Math.max(0, principal);
  const r = Math.max(0.1, annualInterestRatePct);
  const y = Math.max(1, Math.min(35, years));
  const n = y * 12;
  const i = r / (12 * 100);

  let monthlyEmi = 0;
  if (p > 0 && i > 0) {
    const factor = Math.pow(1 + i, n);
    monthlyEmi = Math.round(p * i * (factor / (factor - 1)));
  } else if (p > 0) {
    monthlyEmi = Math.round(p / n);
  }

  const totalPayment = monthlyEmi * n;
  const totalInterest = Math.max(0, totalPayment - p);
  const interestRatioPct = totalPayment > 0 ? Math.round((totalInterest / totalPayment) * 100) : 0;

  const schedule: EmiYearPoint[] = [];
  let balance = p;
  let cumPrincipal = 0;
  let cumInterest = 0;

  for (let yr = 1; yr <= y; yr++) {
    for (let m = 1; m <= 12; m++) {
      const interestForMonth = balance * i;
      const principalForMonth = Math.min(balance, monthlyEmi - interestForMonth);
      balance = Math.max(0, balance - principalForMonth);
      cumPrincipal += principalForMonth;
      cumInterest += interestForMonth;
    }
    schedule.push({
      year: yr,
      principalPaid: Math.round(cumPrincipal),
      interestPaid: Math.round(cumInterest),
      balanceRemaining: Math.round(balance),
    });
  }

  return {
    monthlyEmi,
    totalPrincipal: p,
    totalInterest,
    totalPayment,
    interestRatioPct,
    schedule,
  };
}
