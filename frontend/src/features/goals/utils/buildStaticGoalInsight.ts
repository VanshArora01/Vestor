import type { Goal, PaceStatus } from "../../../types/goals";

/** Future AI payload shape — UI can consume this without redesign. */
export type GoalInsightType =
  | "goal_progress"
  | "ahead_of_schedule"
  | "behind_schedule"
  | "near_completion"
  | "deadline_approaching"
  | "goal_reached"
  | "contribution_adjustment"
  | "competing_goals";

export interface GoalInsight {
  title: string;
  message: string;
  generated_at: string;
  type: GoalInsightType;
  goal_id?: string;
}

const PACE_COPY: Record<
  PaceStatus,
  { title: string; type: GoalInsightType; lead: (name: string) => string }
> = {
  AHEAD: {
    title: "You're ahead of pace",
    type: "ahead_of_schedule",
    lead: (name) => `Your ${name} goal is currently ahead of schedule.`,
  },
  ON_TRACK: {
    title: "You're on track",
    type: "goal_progress",
    lead: (name) => `Your ${name} goal is on track for the deadline.`,
  },
  BEHIND: {
    title: "You're behind pace",
    type: "behind_schedule",
    lead: (name) => `Your ${name} goal is currently behind schedule.`,
  },
  COMPLETED: {
    title: "Goal reached",
    type: "goal_reached",
    lead: (name) => `You've reached your ${name} goal.`,
  },
  OVERDUE: {
    title: "Deadline passed",
    type: "deadline_approaching",
    lead: (name) => `Your ${name} goal deadline has passed and the target isn't fully met yet.`,
  },
};

function formatInr(amount: string | null | undefined): string {
  if (!amount) return "—";
  const value = Number(amount);
  if (Number.isNaN(value)) return `₹${amount}`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Builds a deterministic frontend insight from live Goals API metrics.
 * Not AI — placeholder surface for a future daily insight payload.
 */
export function buildStaticGoalInsight(goals: Goal[]): GoalInsight | null {
  const active = goals.filter((g) => g.status === "active" || g.status === "completed");
  if (active.length === 0) return null;

  const ranked = [...active].sort((a, b) => {
    const order: Record<PaceStatus, number> = {
      OVERDUE: 0,
      BEHIND: 1,
      AHEAD: 2,
      ON_TRACK: 3,
      COMPLETED: 4,
    };
    return order[a.metrics.pace_status] - order[b.metrics.pace_status];
  });

  const goal = ranked[0];
  const pace = goal.metrics.pace_status;
  const copy = PACE_COPY[pace];
  const planned = formatInr(goal.planned_monthly_contribution);
  const required = formatInr(goal.metrics.required_monthly_contribution);

  let message = copy.lead(goal.name);
  if (pace === "AHEAD" || pace === "ON_TRACK" || pace === "BEHIND") {
    if (goal.metrics.required_monthly_contribution) {
      message += ` Your planned contribution of ${planned}/month compares with the ${required}/month required to reach this goal by the deadline.`;
    } else {
      message += ` At your current monthly contribution of ${planned}, review your plan to stay aligned.`;
    }
  } else if (pace === "COMPLETED") {
    message += ` Target of ${formatInr(goal.target_amount)} is fully met.`;
  } else if (pace === "OVERDUE" && goal.metrics.required_monthly_contribution) {
    message += ` Catching up would require about ${required}/month at the current remaining amount.`;
  }

  return {
    title: copy.title,
    message,
    generated_at: new Date().toISOString(),
    type: copy.type,
    goal_id: goal.id,
  };
}
