// Pure functions for step progression, XP calculation, and validation.
// No side effects — all state is managed externally.

import type { StepType } from "./stepTypes";

// ---------------------------------------------------------------------------
// XP helpers
// ---------------------------------------------------------------------------

export function calculateTotalXp(steps: StepType[]): number {
  return steps.reduce((sum, step) => sum + step.xpReward, 0);
}

export function calculateLessonXp(
  completedSteps: number,
  totalSteps: number,
  baseXp: number
): number {
  if (totalSteps === 0) return 0;
  const ratio = completedSteps / totalSteps;
  return Math.round(baseXp * ratio);
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

export function getNextStepIndex(
  current: number,
  total: number
): number | null {
  if (current + 1 < total) return current + 1;
  return null; // lesson complete
}

// ---------------------------------------------------------------------------
// Step completion validation
// isStepComplete returns true when the user has provided a valid answer for
// the given step type.  The answer shape depends on the step type.
// ---------------------------------------------------------------------------

export function isStepComplete(step: StepType, answer: unknown): boolean {
  switch (step.type) {
    case "story-card":
      // Story cards are complete as soon as the user presses Continue (truthy flag)
      return answer === true;

    case "predict-slider": {
      // Answer is a number that has been "locked in"
      if (typeof answer !== "number") return false;
      return answer >= step.min && answer <= step.max;
    }

    case "sort-buckets": {
      // Answer is Record<itemId, bucketId>
      if (!answer || typeof answer !== "object") return false;
      const a = answer as Record<string, string>;
      return step.items.every((item) => Boolean(a[item.id]));
    }

    case "budget-builder": {
      // Answer is Record<categoryId, percent>; all must sum to 100
      if (!answer || typeof answer !== "object") return false;
      const a = answer as Record<string, number>;
      const sum = Object.values(a).reduce((s, v) => s + v, 0);
      return Math.abs(sum - 100) < 1;
    }

    case "scenario-branch": {
      // Answer is the selected choice id (string)
      return typeof answer === "string" && answer.length > 0;
    }

    case "match-pairs": {
      // Answer is Record<pairId, definitionId>; all pairs must be matched
      if (!answer || typeof answer !== "object") return false;
      const a = answer as Record<string, string>;
      return step.pairs.every((pair) => Boolean(a[pair.id]));
    }

    case "spot-mistake": {
      // Answer is the selected statement id (string)
      return typeof answer === "string" && answer.length > 0;
    }

    case "number-entry": {
      // Answer is a number that has been submitted
      return typeof answer === "number" && !isNaN(answer);
    }

    case "mini-sim": {
      // Mini-sim is complete when the user has interacted (answer is a number)
      return typeof answer === "number";
    }

    default:
      return false;
  }
}

// Fuzzy check: is the numeric answer within the correct range?
export function isNumericAnswerCorrect(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Check if all sort items have been placed into a bucket
export function isSortComplete(
  assignments: Record<string, string>,
  totalItems: number,
): boolean {
  return Object.keys(assignments).length >= totalItems;
}

// Count correct bucket assignments
export function countCorrectAssignments(
  assignments: Record<string, string>,
  correctMap: Record<string, string>,
): { correct: number; total: number } {
  const total = Object.keys(correctMap).length;
  let correct = 0;
  for (const [itemId, bucketId] of Object.entries(assignments)) {
    if (correctMap[itemId] === bucketId) correct++;
  }
  return { correct, total };
}

// Budget slider: redistribute remaining percent on change
export function redistributeOnSliderChange(
  percents: Record<string, number>,
  changedId: string,
  newValue: number,
  categoryIds: string[],
): Record<string, number> {
  const clamped = Math.max(0, Math.min(100, newValue));
  const others = categoryIds.filter((id) => id !== changedId);
  const remaining = 100 - clamped;
  const otherTotal = others.reduce((s, id) => s + (percents[id] ?? 0), 0);

  const newPercents: Record<string, number> = { ...percents, [changedId]: clamped };

  if (otherTotal === 0) {
    // Distribute evenly
    const even = Math.floor(remaining / others.length);
    others.forEach((id, i) => {
      newPercents[id] = i === others.length - 1 ? remaining - even * (others.length - 1) : even;
    });
  } else {
    // Distribute proportionally
    let distributed = 0;
    others.forEach((id, i) => {
      if (i === others.length - 1) {
        newPercents[id] = remaining - distributed;
      } else {
        const share = Math.round((percents[id] / otherTotal) * remaining);
        newPercents[id] = share;
        distributed += share;
      }
    });
  }

  return newPercents;
}

// Compute mini-sim output based on simType
export function computeMiniSim(
  simType: "compound-growth" | "sip-returns" | "inflation-erosion" | "emi-breakdown",
  input: number,
): { label: string; value: string; highlight?: boolean }[] {
  switch (simType) {
    case "compound-growth": {
      const principal = 10000;
      const rate = input / 100;
      const years = [1, 5, 10, 20];
      return years.map((y) => ({
        label: `${y} year${y > 1 ? "s" : ""}`,
        value: `₹${Math.round(principal * Math.pow(1 + rate, y)).toLocaleString("en-IN")}`,
        highlight: y === 10,
      }));
    }
    case "sip-returns": {
      const monthlyAmount = input;
      const rate = 0.12 / 12; // 12% annual
      const months = [12, 36, 60, 120];
      return months.map((m) => {
        const value = monthlyAmount * ((Math.pow(1 + rate, m) - 1) / rate) * (1 + rate);
        return {
          label: `${m / 12} year${m / 12 > 1 ? "s" : ""}`,
          value: `₹${Math.round(value).toLocaleString("en-IN")}`,
          highlight: m === 60,
        };
      });
    }
    case "inflation-erosion": {
      const purchasing = 100000;
      const rate = input / 100;
      const years = [1, 5, 10, 20];
      return years.map((y) => ({
        label: `${y}y real value`,
        value: `₹${Math.round(purchasing * Math.pow(1 - rate, y)).toLocaleString("en-IN")}`,
        highlight: y === 10,
      }));
    }
    case "emi-breakdown": {
      const principal = input;
      const monthlyRate = 0.1 / 12;
      const n = 60; // 5 years
      const emi =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) /
        (Math.pow(1 + monthlyRate, n) - 1);
      const totalPaid = emi * n;
      const totalInterest = totalPaid - principal;
      return [
        { label: "Monthly EMI", value: `₹${Math.round(emi).toLocaleString("en-IN")}`, highlight: true },
        { label: "Total paid (5yr)", value: `₹${Math.round(totalPaid).toLocaleString("en-IN")}` },
        { label: "Total interest", value: `₹${Math.round(totalInterest).toLocaleString("en-IN")}` },
        { label: "Cost %", value: `${Math.round((totalInterest / principal) * 100)}%` },
      ];
    }
  }
}
