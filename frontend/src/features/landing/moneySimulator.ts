export type BudgetShares = {
  needs: number;
  wants: number;
  savings: number;
};

export type BudgetAmounts = BudgetShares & {
  needsAmount: number;
  wantsAmount: number;
  savingsAmount: number;
  income: number;
};

export function updateBudgetShare(
  shares: BudgetShares,
  category: "needs" | "wants",
  requestedValue: number,
): BudgetShares {
  const value = Math.max(0, Math.min(100, Math.round(requestedValue)));
  const other = category === "needs" ? shares.wants : shares.needs;
  const selected = Math.min(value, 100 - other);
  const needs = category === "needs" ? selected : shares.needs;
  const wants = category === "wants" ? selected : shares.wants;
  return { needs, wants, savings: 100 - needs - wants };
}

export function calculateBudget(incomeValue: number, shares: BudgetShares): BudgetAmounts {
  const income = Math.max(0, Math.round(incomeValue));
  const needsAmount = Math.round((income * shares.needs) / 100);
  const wantsAmount = Math.round((income * shares.wants) / 100);
  return {
    ...shares,
    income,
    needsAmount,
    wantsAmount,
    savingsAmount: income - needsAmount - wantsAmount,
  };
}
