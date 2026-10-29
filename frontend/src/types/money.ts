export type CategoryScope = "money_plan" | "spending";
export type AllocationSemanticType = "savings" | "investment" | "goal" | "expense" | "other";
export type CategoryKind = "allocation" | "money_plan" | "spending";

export interface MoneyCategory {
  id: string;
  name: string;
  slug: string;
  scope: CategoryScope;
  is_system: boolean;
  is_others: boolean;
  is_custom: boolean;
  is_active: boolean;
  semantic_type: AllocationSemanticType | null;
}

export interface MonthMetrics {
  income: string | null;
  carryover?: string | null;
  confirmed_income?: string | null;
  manual_income_adjustment?: string | null;
  available_to_plan?: string | null;
  unallocated?: string | null;
  allocated_total: string | null;
  remaining_allocation: string | null;
  money_available_before_spending: string | null;
  allocation_percentage: string | null;
  allocation_complete: boolean;
  allocation_exceeds_income: boolean;
  spending_total: string | null;
  money_available: string | null;
  exceeds_income: boolean;
  excess_amount: string | null;
  surplus: string | null;
  spending_percentage: string | null;
  savings_rate: string | null;
}

export interface AllocationLine {
  line_type: "category" | "goal";
  category_id: string | null;
  goal_id: string | null;
  category_name: string | null;
  goal_name: string | null;
  category_slug: string | null;
  is_others: boolean;
  is_custom?: boolean;
  is_active?: boolean;
  semantic_type?: AllocationSemanticType | null;
  amount: string | null;
  percentage: string | null;
  planned_monthly_contribution?: string | null;
}

export interface SpendingLine {
  category_id: string;
  category_name: string;
  category_slug: string;
  is_others: boolean;
  is_custom?: boolean;
  is_active?: boolean;
  amount: string | null;
  percentage: string | null;
}

export interface InsightSignal {
  type: string;
  severity: string;
  data: Record<string, string | null>;
  message: string;
}

export interface IncomeCandidate {
  id: string;
  narration: string;
  amount: string;
  transaction_timestamp: string;
}

export interface MonthState {
  year: number;
  month: number;
  currency: string;
  is_locked: boolean;
  income: string | null;
  metrics: MonthMetrics;
  allocations: AllocationLine[];
  spending: SpendingLine[];
  context: { message: string } | null;
  insights: InsightSignal[];
  is_connected?: boolean;
  is_history_incomplete?: boolean;
  income_candidates?: IncomeCandidate[];
}

export interface MonthSummary {
  year: number;
  month: number;
  is_locked: boolean;
  has_income: boolean;
  metrics: MonthMetrics;
}

export interface ComparisonResponse {
  year: number;
  month: number;
  previous_year: number | null;
  previous_month: number | null;
  comparison: {
    current: { income: string | null; spending: string | null; surplus: string | null };
    previous: { income: string | null; spending: string | null; surplus: string | null };
    changes: {
      income: string | null;
      income_pct: string | null;
      spending: string | null;
      spending_pct: string | null;
      surplus: string | null;
      surplus_pct: string | null;
    };
  };
  spending_changes: Array<{
    category_id: string;
    category_name: string;
    spending: string | null;
    previous_amount: string | null;
    change: string | null;
  }>;
  allocation_changes: Array<{
    category_id: string;
    category_name: string;
    allocation: string | null;
    previous_amount: string | null;
    change: string | null;
  }>;
  insights: InsightSignal[];
}

export interface AllocationItemPayload {
  category_id?: string;
  goal_id?: string;
  amount: string;
}

export interface SpendingItemPayload {
  category_id: string;
  amount: string;
}

export interface CreateCategoryPayload {
  kind: CategoryKind;
  name: string;
  semantic_type?: AllocationSemanticType;
}

export interface UpdateCategoryPayload {
  name?: string;
  semantic_type?: AllocationSemanticType;
  is_active?: boolean;
}

export interface ReconciliationItem {
  name: string;
  planned: string;
  actual: string | null;
  remaining: string | null;
  status: "UNAVAILABLE" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "OVER_PLAN";
  provenance: "CONNECTED_ACCOUNT" | "MANUAL" | "DERIVED" | "UNAVAILABLE";
  category_slug: string;
  line_type: string;
}

export interface MoneyReconciliation {
  month: string;
  planned_allocation_total: string;
  actual_allocation_total: string | null;
  planned_spending_total: string;
  actual_spending_total: string | null;
  actual_income_total: string | null;
  actual_investment_total: string | null;
  items: ReconciliationItem[];
}

