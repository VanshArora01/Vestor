import { apiClient } from "./client";
import type {
  AssetSearchResponse,
  CreateInvestmentPayload,
  HoldingDetail,
  HoldingsList,
  HistoryList,
  InvestPerformance,
  InvestPlan,
  InvestSummary,
  PriceRefreshResult,
} from "../types/invest";

export async function getInvestSummary(): Promise<InvestSummary> {
  const { data } = await apiClient.get<InvestSummary>("/invest/summary");
  return data;
}

export async function listHoldings(params?: {
  asset_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<HoldingsList> {
  const { data } = await apiClient.get<HoldingsList>("/invest/holdings", { params });
  return data;
}

export async function getHolding(holdingId: string): Promise<HoldingDetail> {
  const { data } = await apiClient.get<HoldingDetail>(`/invest/holdings/${holdingId}`);
  return data;
}

export async function listHistory(params?: {
  asset_type?: string;
  transaction_type?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}): Promise<HistoryList> {
  const { data } = await apiClient.get<HistoryList>("/invest/history", { params });
  return data;
}

export async function searchInvestAssets(params: {
  q: string;
  type?: string;
  exchange?: string;
  limit?: number;
}): Promise<AssetSearchResponse> {
  const { data } = await apiClient.get<AssetSearchResponse>("/invest/assets/search", {
    params: {
      q: params.q,
      type: params.type,
      exchange: params.exchange,
      limit: params.limit,
    },
  });
  return data;
}

export async function getInvestPlan(year: number, month: number): Promise<InvestPlan> {
  const { data } = await apiClient.get<InvestPlan>("/invest/plan", {
    params: { year, month },
  });
  return data;
}

export async function getInvestPerformance(params?: {
  from_date?: string;
  to_date?: string;
}): Promise<InvestPerformance> {
  const { data } = await apiClient.get<InvestPerformance>("/invest/performance", { params });
  return data;
}

export async function createInvestment(
  payload: CreateInvestmentPayload,
): Promise<HoldingDetail> {
  const { data } = await apiClient.post<HoldingDetail>("/invest/transactions", payload);
  return data;
}

export async function refreshInvestPrices(): Promise<PriceRefreshResult> {
  const { data } = await apiClient.post<PriceRefreshResult>("/invest/prices/refresh");
  return data;
}

export async function exportInvestHistory(params?: {
  asset_type?: string;
  transaction_type?: string;
  from_date?: string;
  to_date?: string;
}): Promise<Blob> {
  const { data } = await apiClient.get<Blob>("/invest/export", {
    params,
    responseType: "blob",
  });
  return data;
}
