/** Invest API types — mirrors backend schemas/invest.py */

export type InvestAssetType =
  | "stock"
  | "mutual_fund"
  | "etf"
  | "gold"
  | "fd"
  | "ppf"
  | "nps"
  | "other";

export interface InvestSummary {
  total_invested: string;
  valued_invested: string;
  current_value: string | null;
  absolute_gain_loss: string | null;
  return_pct: string | null;
  total_holdings: number;
  total_transactions: number;
  valued_holdings: number;
  unvalued_holdings: number;
  valuation_complete: boolean;
  fresh_holdings: number;
  stale_holdings: number;
}

export interface PriceRefreshResult {
  updated: number;
  failed: number;
  skipped: number;
  total: number;
  failed_assets: { asset_id: string; name: string }[];
  last_updated_at: string | null;
}

export interface Holding {
  id: string;
  asset_id: string | null;
  asset_type: InvestAssetType | string;
  display_name: string;
  symbol: string | null;
  quantity: string;
  total_invested: string;
  average_cost: string;
  valuation_mode: string;
  valuation_status: string;
  manual_current_value: string | null;
  manual_value_updated_at: string | null;
  current_value: string | null;
  absolute_gain_loss: string | null;
  return_pct: string | null;
  value_source: string | null;
  has_current_valuation: boolean;
  latest_price: string | null;
  price_timestamp: string | null;
  price_fetched_at: string | null;
  price_status: string | null;
  status: string;
  gold_unit: string | null;
  fd_principal: string | null;
  fd_interest_rate: string | null;
  fd_start_date: string | null;
  fd_maturity_date: string | null;
  fd_compounding: string | null;
  estimated_current_value: string | null;
  maturity_value: string | null;
  accrued_interest: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentTransaction {
  id: string;
  holding_id: string;
  asset_id: string | null;
  transaction_type: string;
  quantity: string | null;
  unit_price: string | null;
  amount: string;
  traded_on: string;
  notes: string | null;
  created_at: string;
}

export interface HoldingDetail {
  holding: Holding;
  transactions: InvestmentTransaction[];
  transaction?: InvestmentTransaction;
}

export interface HoldingsList {
  items: Holding[];
  total: number;
  limit: number;
  offset: number;
}

export interface HistoryItem {
  id: string;
  holding_id: string;
  asset_id: string | null;
  asset_type: string;
  display_name: string;
  symbol: string | null;
  transaction_type: string;
  quantity: string | null;
  unit_price: string | null;
  amount: string;
  traded_on: string;
  notes: string | null;
  created_at: string;
}

export interface HistoryList {
  items: HistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AssetSearchItem {
  id: string;
  name: string;
  symbol: string | null;
  exchange: string | null;
  asset_type: string;
  isin: string | null;
  active: boolean;
}

export interface AssetSearchResponse {
  items: AssetSearchItem[];
  total: number;
  limit: number;
}

export interface InvestPlanCategory {
  category: string;
  category_slug: string;
  planned: string;
  actual: string;
  remaining: string;
  over_invested: string;
  percentage_of_plan: string | null;
  status: string;
  asset_types: string[];
}

export interface InvestPlan {
  year: number;
  month: number;
  month_key: string;
  totals: {
    planned: string;
    actual: string;
    remaining: string;
    over_invested: string;
  };
  categories: InvestPlanCategory[];
}

export interface PerformanceSnapshot {
  date: string;
  total_invested: string;
  total_value: string | null;
  absolute_gain_loss: string | null;
  return_pct: string | null;
  valuation_status: string;
  total_holdings: number;
  valued_holdings: number;
  unvalued_holdings: number;
}

export interface InvestPerformance {
  from_date: string | null;
  to_date: string | null;
  snapshots: PerformanceSnapshot[];
}

export interface CreateInvestmentPayload {
  asset_type: InvestAssetType;
  asset_id?: string;
  quantity?: string;
  unit_price?: string;
  traded_on: string;
  notes?: string;
  display_name?: string;
  gold_unit?: "grams";
  fd_principal?: string;
  fd_interest_rate?: string;
  fd_start_date?: string;
  fd_maturity_date?: string;
  fd_compounding?: "simple" | "monthly" | "quarterly" | "yearly";
  amount?: string;
  manual_current_value?: string;
}
