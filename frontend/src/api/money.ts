import { apiClient } from "./client";
import type {
  AllocationItemPayload,
  ComparisonResponse,
  MoneyCategory,
  MonthState,
  MonthSummary,
  SpendingItemPayload,
  MoneyReconciliation,
} from "../types/money";

export async function getCurrentMonth(): Promise<MonthState> {
  const { data } = await apiClient.get<MonthState>("/money/current");
  return data;
}

export async function listMonths(): Promise<MonthSummary[]> {
  const { data } = await apiClient.get<MonthSummary[]>("/money/months");
  return data;
}

export async function getMonth(year: number, month: number): Promise<MonthState> {
  const { data } = await apiClient.get<MonthState>(`/money/${year}/${month}`);
  return data;
}

export async function setIncome(year: number, month: number, amount: string): Promise<MonthState> {
  const { data } = await apiClient.post<MonthState>(`/money/${year}/${month}/income`, { amount });
  return data;
}

export async function setAdjustment(year: number, month: number, amount: string): Promise<MonthState> {
  const { data } = await apiClient.post<MonthState>(`/money/${year}/${month}/adjustment`, { amount });
  return data;
}

export async function setAllocation(
  year: number,
  month: number,
  items: AllocationItemPayload[],
  requireComplete = false,
): Promise<MonthState> {
  const { data } = await apiClient.put<MonthState>(`/money/${year}/${month}/allocation`, {
    items,
    require_complete: requireComplete,
  });
  return data;
}

export async function addRemainingToOthers(year: number, month: number): Promise<MonthState> {
  const { data } = await apiClient.post<MonthState>(
    `/money/${year}/${month}/allocation/add-remaining-to-others`,
  );
  return data;
}

export async function setSpending(
  year: number,
  month: number,
  items: SpendingItemPayload[],
): Promise<MonthState> {
  const { data } = await apiClient.put<MonthState>(`/money/${year}/${month}/spending`, { items });
  return data;
}

export async function getComparison(year: number, month: number): Promise<ComparisonResponse> {
  const { data } = await apiClient.get<ComparisonResponse>(`/money/${year}/${month}/comparison`);
  return data;
}

export async function unlockMonth(year: number, month: number): Promise<MonthState> {
  const { data } = await apiClient.post<MonthState>(`/money/${year}/${month}/unlock`);
  return data;
}

export async function listCategories(kind: "allocation" | "spending"): Promise<MoneyCategory[]> {
  const { data } = await apiClient.get<MoneyCategory[]>("/money/categories", { params: { kind } });
  return data;
}

export async function createCategory(payload: {
  kind: "allocation" | "money_plan" | "spending";
  name: string;
  semantic_type?: string;
}): Promise<MoneyCategory> {
  const { data } = await apiClient.post<MoneyCategory>("/money/categories", payload);
  return data;
}

export async function updateCategory(
  categoryId: string,
  kind: "allocation" | "money_plan" | "spending",
  payload: { name?: string; semantic_type?: string; is_active?: boolean },
): Promise<MoneyCategory> {
  const { data } = await apiClient.patch<MoneyCategory>(`/money/categories/${categoryId}`, payload, {
    params: { kind },
  });
  return data;
}

export async function deactivateCategory(
  categoryId: string,
  kind: "allocation" | "money_plan" | "spending",
): Promise<MoneyCategory> {
  const { data } = await apiClient.post<MoneyCategory>(
    `/money/categories/${categoryId}/deactivate`,
    null,
    { params: { kind } },
  );
  return data;
}

export async function getMoneyReconciliation(year: number, month: number): Promise<MoneyReconciliation> {
  const { data } = await apiClient.get<MoneyReconciliation>(`/money/reconciliation/${year}/${month}`);
  return data;
}

