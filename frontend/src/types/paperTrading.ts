export type PaperSide = "buy" | "sell";
export type PaperRange = "1D" | "1W" | "1M" | "3M" | "1Y";
export type PaperExchange = "NSE" | "BSE";

export interface PaperSummary {
  starting_capital: string;
  available_cash: string;
  invested_cost_basis: string;
  current_market_value: string | null;
  portfolio_equity: string | null;
  realised_pnl: string;
  unrealised_pnl: string | null;
  total_pnl: string | null;
  net_deposits_withdrawals: string;
  valuation_complete: boolean;
  unvalued_positions: number;
}

export interface PaperInstrument {
  id: string;
  symbol: string;
  name: string;
  exchange: PaperExchange;
  instrument_type: "stock" | "etf" | "index";
  isin: string | null;
  provider_symbol: string | null;
  price: string | null;
  previous_close: string | null;
  change_pct: string | null;
  price_status: "fresh" | "stale" | "unavailable" | "error" | string;
  price_timestamp: string | null;
  fetched_at: string | null;
}

export interface PaperPosition {
  asset_id: string;
  symbol: string;
  name: string;
  exchange: string;
  quantity: string;
  average_cost: string;
  cost_basis: string;
  current_price: string | null;
  market_value: string | null;
  unrealised_pnl: string | null;
  price_status: string;
  price_timestamp: string | null;
}

export interface PaperPortfolio {
  account_id: string;
  summary: PaperSummary;
  positions: PaperPosition[];
}

export interface PaperOrder {
  id: string;
  asset_id: string;
  symbol: string;
  instrument_name: string;
  exchange: string;
  side: PaperSide;
  quantity: string;
  execution_price: string;
  gross_amount: string;
  charges: string;
  realised_pnl: string;
  status: string;
  created_at: string;
}

export interface PaperOrderResult {
  order: PaperOrder;
  portfolio: PaperPortfolio;
}

export interface PaperInstrumentList {
  items: PaperInstrument[];
  total: number;
  limit: number;
  offset: number;
  source: string;
}

export interface PaperWatchlist {
  items: PaperInstrument[];
}

export interface PaperOrderList {
  items: PaperOrder[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaperCandle {
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
}

export interface PaperCandles {
  asset_id: string;
  symbol: string;
  range: PaperRange;
  interval: string;
  source: string;
  retrieved_at: string;
  data_status: string;
  candles: PaperCandle[];
}

export interface PaperMovers {
  source: string;
  universe: string;
  gainers: PaperInstrument[];
  losers: PaperInstrument[];
}

export interface PaperMarketStatus {
  exchange: string;
  session: string;
  observed_at: string;
  note: string;
}
