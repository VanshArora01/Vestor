import { apiClient } from "./client";
import type { TransactionSchemaType } from "../schemas/banking";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConnectedAccount {
  id: string;
  institution_name: string;
  account_type: string;
  masked_account_number: string;
  purpose: string;
  status: string;
  balance: number | null;
  balance_status: string;
  balance_timestamp: string | null;
  last_synced_at: string | null;
  earmarked_for_goals: number | null;
  unallocated_balance: number | null;
  over_allocated_amount: number | null;
}

export interface FinancialConnection {
  id: string;
  provider: string;
  status: string;
  created_at: string;
  last_synced_at: string | null;
  accounts: ConnectedAccount[];
  consent_id: string | null;
  consent_status: string | null;
  consent_expires_at: string | null;
}

export interface AccountDetail extends ConnectedAccount {
  consent_expires_at: string | null;
  transactions: TransactionSchemaType[];
}

export interface AggregatedBalances {
  actual_connected_cash: number | null;
  main_spending_balance: number | null;
  savings_balance: number | null;
  emergency_fund_balance: number | null;
  main_spending_has_accounts: boolean;
  savings_has_accounts: boolean;
  emergency_fund_has_accounts: boolean;
  resolved_main_spending_balance: number | null;
  resolved_savings_balance: number | null;
  resolved_emergency_fund_balance: number | null;
}

export interface ConsentStatus {
  consent_id: string;
  status: string;
  accounts?: ConnectedAccount[];
}

// ─── Connection / Consent ─────────────────────────────────────────────────────

export async function connectBank(mobileNumber: string, redirectUrl: string): Promise<{ redirect_url: string; consent_id: string; consent_url: string }> {
  const res = await apiClient.post("/banking/connect", {
    mobile_number: mobileNumber,
    redirect_url: redirectUrl,
  });
  return res.data;
}

export async function getConsentStatus(consentId: string): Promise<ConsentStatus> {
  const res = await apiClient.get(`/banking/consents/${consentId}/status`);
  return res.data;
}

export async function getConnections(): Promise<FinancialConnection[]> {
  const res = await apiClient.get("/banking/connections");
  return res.data;
}

export async function disconnectConnection(connectionId: string): Promise<FinancialConnection> {
  const res = await apiClient.post(`/banking/connections/${connectionId}/disconnect`);
  return res.data;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function getAccountDetails(accountId: string): Promise<AccountDetail> {
  const res = await apiClient.get(`/banking/accounts/${accountId}`);
  return res.data;
}

export async function updateAccountPurpose(accountId: string, purpose: string): Promise<ConnectedAccount> {
  const res = await apiClient.patch(`/banking/accounts/${accountId}/purpose`, { purpose });
  return res.data;
}

export async function syncAccount(accountId: string): Promise<unknown> {
  const res = await apiClient.post(`/banking/accounts/${accountId}/sync`);
  return res.data;
}

// ─── Balances ─────────────────────────────────────────────────────────────────

export async function getAggregatedBalances(): Promise<AggregatedBalances> {
  const res = await apiClient.get("/banking/balances/aggregate");
  return res.data;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(accountId: string, limit = 100): Promise<TransactionSchemaType[]> {
  const res = await apiClient.get(`/banking/accounts/${accountId}/transactions`, {
    params: { limit },
  });
  return res.data;
}

export async function getAllTransactions(limit = 500, accountId?: string, source: "connected" | "simulated" = "connected"): Promise<TransactionSchemaType[]> {
  const res = await apiClient.get("/banking/transactions", { params: { limit, ...(accountId ? { account_id: accountId } : {}), source } });
  return res.data;
}

export interface MonthlyTransactionAnalysis {
  year: number; month: number; transactions_analyzed: number; transaction_count: number;
  auto_categorized: number; confirmed_income: string; income_candidates: string; ordinary_expenses: string; cash_remaining: string;
  uncategorized_debits: string; total_recorded_ordinary_debits: string;
  investment_activity: string; transfer_activity: string; opening_cash: string; actual_end_cash: string; simulated: boolean;
  plan_preview: null | { carryover: string; confirmed_income: string; manual_income_adjustment: string; income: string; available_to_plan: string; allocated_total: string; unallocated: string };
  category_totals: Array<{ category: string; amount: string; count: number }>;
  unresolved: Array<{ id: string; description: string; date: string; amount: string; direction: string; category: string | null }>;
}

export async function analyzeTransactionMonth(year: number, month: number, accountId?: string): Promise<MonthlyTransactionAnalysis> {
  const res = await apiClient.post("/banking/transactions/analyze-month", { year, month, account_id: accountId });
  return res.data;
}

export async function updateTransactionClassification(
  transactionId: string,
  classification: string,
  category?: string,
): Promise<TransactionSchemaType> {
  const res = await apiClient.patch(`/banking/transactions/${transactionId}/classification`, {
    classification,
    category,
  });
  return res.data;
}
