import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInvestment,
  exportInvestHistory,
  getHolding,
  getInvestPerformance,
  getInvestPlan,
  getInvestSummary,
  listHistory,
  listHoldings,
  searchInvestAssets,
  refreshInvestPrices,
} from "../../../api/invest";
import type { CreateInvestmentPayload } from "../../../types/invest";
import { toIsoDate } from "../utils/format";

export function useInvestDashboard(year: number, month: number) {
  const queryClient = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: ["invest", "summary"],
    queryFn: getInvestSummary,
  });

  const holdingsQuery = useQuery({
    queryKey: ["invest", "holdings", "open"],
    queryFn: () => listHoldings({ status: "open", limit: 100 }),
  });

  const planQuery = useQuery({
    queryKey: ["invest", "plan", year, month],
    queryFn: () => getInvestPlan(year, month),
  });

  const historyQuery = useQuery({
    queryKey: ["invest", "history"],
    queryFn: () => listHistory({ limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateInvestmentPayload) => createInvestment(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invest"] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshInvestPrices(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invest"] });
    },
  });

  const coreLoading = summaryQuery.isLoading || holdingsQuery.isLoading;
  const coreError = summaryQuery.error ?? holdingsQuery.error;

  return {
    summary: summaryQuery.data,
    holdings: holdingsQuery.data,
    plan: planQuery.data,
    planError: planQuery.error,
    planLoading: planQuery.isLoading,
    history: historyQuery.data,
    historyError: historyQuery.error,
    historyLoading: historyQuery.isLoading,
    isLoading: coreLoading,
    error: coreError,
    refetch: () => {
      void summaryQuery.refetch();
      void holdingsQuery.refetch();
      void planQuery.refetch();
      void historyQuery.refetch();
    },
    createInvestment: createMutation.mutateAsync,
    refreshPrices: refreshMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isRefreshing: refreshMutation.isPending,
  };
}

export function useInvestPerformance(fromDate: string, toDate: string, enabled = true) {
  return useQuery({
    queryKey: ["invest", "performance", fromDate, toDate],
    queryFn: () => getInvestPerformance({ from_date: fromDate, to_date: toDate }),
    enabled,
  });
}

export function useHoldingDetail(holdingId: string | null) {
  return useQuery({
    queryKey: ["invest", "holding", holdingId],
    queryFn: () => getHolding(holdingId!),
    enabled: Boolean(holdingId),
  });
}

export function useAssetSearch(query: string, assetType?: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["invest", "search", q, assetType ?? ""],
    queryFn: () =>
      searchInvestAssets({
        q,
        type: assetType,
        limit: 20,
      }),
    enabled: q.length >= 1,
  });
}

export async function downloadInvestCsv(params?: {
  asset_type?: string;
  transaction_type?: string;
  from_date?: string;
  to_date?: string;
}) {
  const blob = await exportInvestHistory(params);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vestor-investment-history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function defaultPerformanceWindow(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}
