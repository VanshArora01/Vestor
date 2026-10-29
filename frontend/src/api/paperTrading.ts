import { apiClient } from "./client";
import type {
  PaperCandles,
  PaperExchange,
  PaperInstrument,
  PaperInstrumentList,
  PaperMovers,
  PaperMarketStatus,
  PaperOrderList,
  PaperOrderResult,
  PaperPortfolio,
  PaperRange,
  PaperSide,
  PaperWatchlist,
} from "../types/paperTrading";

export async function getPaperAccount(): Promise<PaperPortfolio | null> {
  const { data } = await apiClient.get<PaperPortfolio | null>("/paper-trading/account");
  return data;
}

export async function createPaperAccount(startingCapital: string): Promise<PaperPortfolio> {
  const { data } = await apiClient.post<PaperPortfolio>("/paper-trading/account", {
    starting_capital: startingCapital,
  });
  return data;
}

export async function listPaperInstruments(params: {
  q?: string;
  exchange?: PaperExchange | "ALL";
  category?: "equity" | "index";
  limit?: number;
  offset?: number;
} = {}): Promise<PaperInstrumentList> {
  const { data } = await apiClient.get<PaperInstrumentList>("/paper-trading/instruments", {
    params: { ...params, exchange: params.exchange === "ALL" ? undefined : params.exchange },
  });
  return data;
}

export async function getPaperQuote(assetId: string): Promise<PaperInstrument> {
  const { data } = await apiClient.get<PaperInstrument>(`/paper-trading/instruments/${assetId}/quote`);
  return data;
}

export async function refreshPaperQuote(assetId: string): Promise<PaperInstrument> {
  const { data } = await apiClient.post<PaperInstrument>(`/paper-trading/instruments/${assetId}/refresh`);
  return data;
}

export async function getPaperCandles(
  assetId: string,
  range: PaperRange,
  interval?: string,
): Promise<PaperCandles> {
  const { data } = await apiClient.get<PaperCandles>(`/paper-trading/instruments/${assetId}/candles`, {
    params: { range, interval },
  });
  return data;
}

export async function getPaperMovers(exchange?: PaperExchange | "ALL"): Promise<PaperMovers> {
  const { data } = await apiClient.get<PaperMovers>("/paper-trading/movers", {
    params: { exchange: exchange === "ALL" ? undefined : exchange },
  });
  return data;
}

export async function getPaperMarketStatus(exchange: PaperExchange): Promise<PaperMarketStatus> {
  const { data } = await apiClient.get<PaperMarketStatus>(`/paper-trading/market-status/${exchange}`);
  return data;
}

export async function getPaperWatchlist(): Promise<PaperWatchlist> {
  const { data } = await apiClient.get<PaperWatchlist>("/paper-trading/watchlist");
  return data;
}

export async function addPaperWatchlistItem(assetId: string): Promise<PaperWatchlist> {
  const { data } = await apiClient.post<PaperWatchlist>(`/paper-trading/watchlist/${assetId}`);
  return data;
}

export async function removePaperWatchlistItem(assetId: string): Promise<PaperWatchlist> {
  const { data } = await apiClient.delete<PaperWatchlist>(`/paper-trading/watchlist/${assetId}`);
  return data;
}

export async function listPaperOrders(): Promise<PaperOrderList> {
  const { data } = await apiClient.get<PaperOrderList>("/paper-trading/orders", { params: { limit: 100 } });
  return data;
}

export async function placePaperOrder(payload: {
  asset_id: string;
  side: PaperSide;
  quantity: string;
  idempotency_key: string;
}): Promise<PaperOrderResult> {
  const { data } = await apiClient.post<PaperOrderResult>("/paper-trading/orders", payload);
  return data;
}
