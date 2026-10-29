export type GoalType = "general" | "emergency_fund" | "savings";
export type GoalStatus = "active" | "archived" | "completed";
export type PaceStatus = "AHEAD" | "ON_TRACK" | "BEHIND" | "COMPLETED" | "OVERDUE";

export interface GoalMetrics {
  progress_percentage: string;
  remaining_amount: string;
  months_remaining: number;
  required_monthly_contribution: string | null;
  planned_monthly_contribution: string;
  estimated_months: number | null;
  estimated_completion_date: string | null;
  pace_status: PaceStatus;
  deadline_reachable_at_plan: boolean;
  monthly_gap: string | null;
}

export interface GoalLinkedAccount {
  id: string;
  institution_name: string;
  masked_account_number: string;
  account_type: string;
}

export interface Goal {
  id: string;
  name: string;
  goal_type: GoalType;
  target_amount: string;
  current_amount: string;
  planned_monthly_contribution: string;
  deadline: string;
  description: string | null;
  status: GoalStatus;
  metrics: GoalMetrics;
  money_plan_seeded?: boolean | null;
  money_plan_seed_message?: string | null;
  linked_account_id?: string | null;
  linked_account?: GoalLinkedAccount | null;
}

export interface GoalContribution {
  id: string;
  amount: string;
  contributed_on: string;
  source: string;
  created_at: string;
}

export interface GoalPlanHistoryItem {
  year: number;
  month: number;
  amount: string;
}

export interface GoalDetail extends Goal {
  contributions: GoalContribution[];
  plan_history: GoalPlanHistoryItem[];
}

export interface GoalsSummary {
  total_goals: number;
  total_target: string;
  total_saved: string;
  overall_progress_percentage: string;
}

export interface GoalsListResponse {
  goals: Goal[];
  summary: GoalsSummary;
}

export interface CreateGoalPayload {
  name: string;
  goal_type?: GoalType;
  target_amount: string;
  current_amount?: string;
  planned_monthly_contribution: string;
  deadline?: string;
  months_until_deadline?: number;
  description?: string;
  linked_account_id?: string | null;
}

export interface UpdateGoalPayload {
  name?: string;
  target_amount?: string;
  planned_monthly_contribution?: string;
  deadline?: string;
  months_until_deadline?: number;
  description?: string;
  linked_account_id?: string | null;
}

export interface ContributionPayload {
  amount: string;
  contributed_on?: string;
}
