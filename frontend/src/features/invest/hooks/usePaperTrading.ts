import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addPaperWatchlistItem,
  createPaperAccount,
  getPaperAccount,
  getPaperCandles,
  getPaperMovers,
  getPaperMarketStatus,
  getPaperQuote,
  getPaperWatchlist,
  listPaperInstruments,
  listPaperOrders,
  placePaperOrder,
  refreshPaperQuote,
  removePaperWatchlistItem,
} from "../../../api/paperTrading";
import type { PaperExchange, PaperRange } from "../../../types/paperTrading";

const paperKey = ["paper-trading"] as const;

export function usePaperAccount() {
  return useQuery({
    queryKey: [...paperKey, "account"],
    queryFn: getPaperAccount,
    staleTime: 15_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function usePaperInstruments(params: {
  q: string;
  exchange: PaperExchange | "ALL";
  category: "equity" | "index";
}) {
  return useQuery({
    queryKey: [...paperKey, "instruments", params],
    queryFn: () => listPaperInstruments({ ...params, limit: 60 }),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function usePaperQuote(assetId: string | undefined) {
  return useQuery({
    queryKey: [...paperKey, "quote", assetId],
    queryFn: () => getPaperQuote(assetId!),
    enabled: Boolean(assetId),
    staleTime: 20_000,
    refetchInterval: 30_000,
    retry: false,
  });
}

export function usePaperCandles(assetId: string | undefined, range: PaperRange, interval: string) {
  return useQuery({
    queryKey: [...paperKey, "candles", assetId, range, interval],
    queryFn: () => getPaperCandles(assetId!, range, interval),
    enabled: Boolean(assetId),
    staleTime: 60_000,
    retry: false,
  });
}

export function usePaperMovers(exchange: PaperExchange | "ALL") {
  return useQuery({
    queryKey: [...paperKey, "movers", exchange],
    queryFn: () => getPaperMovers(exchange),
    staleTime: 60_000,
    retry: false,
  });
}

export function usePaperMarketStatus(exchange: PaperExchange) {
  return useQuery({
    queryKey: [...paperKey, "market-status", exchange],
    queryFn: () => getPaperMarketStatus(exchange),
    staleTime: 30_000,
  });
}

export function usePaperWatchlist(enabled: boolean) {
  return useQuery({
    queryKey: [...paperKey, "watchlist"],
    queryFn: getPaperWatchlist,
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function usePaperOrders(enabled: boolean) {
  return useQuery({
    queryKey: [...paperKey, "orders"],
    queryFn: listPaperOrders,
    enabled,
    staleTime: 15_000,
  });
}

export function useCreatePaperAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createPaperAccount,
    onSuccess: async (account) => {
      client.setQueryData([...paperKey, "account"], account);
      await client.invalidateQueries({ queryKey: paperKey });
    },
  });
}

export function useRefreshPaperQuote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: refreshPaperQuote,
    onSuccess: async (quote) => {
      client.setQueryData([...paperKey, "quote", quote.id], quote);
      await Promise.all([
        client.invalidateQueries({ queryKey: [...paperKey, "instruments"] }),
        client.invalidateQueries({ queryKey: [...paperKey, "movers"] }),
        client.invalidateQueries({ queryKey: [...paperKey, "account"] }),
      ]);
    },
  });
}

export function usePaperOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: placePaperOrder,
    onSuccess: async (result) => {
      client.setQueryData([...paperKey, "account"], result.portfolio);
      await Promise.all([
        client.invalidateQueries({ queryKey: [...paperKey, "account"] }),
        client.invalidateQueries({ queryKey: [...paperKey, "orders"] }),
        client.invalidateQueries({ queryKey: [...paperKey, "watchlist"] }),
      ]);
    },
  });
}

export function usePaperWatchlistActions() {
  const client = useQueryClient();
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: [...paperKey, "watchlist"] }),
    client.invalidateQueries({ queryKey: [...paperKey, "movers"] }),
  ]);
  const add = useMutation({ mutationFn: addPaperWatchlistItem, onSuccess: refresh });
  const remove = useMutation({ mutationFn: removePaperWatchlistItem, onSuccess: refresh });
  return { add, remove };
}
