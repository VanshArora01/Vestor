import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CandlestickChart,
  Check,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { getApiErrorMessage } from "../../api/client";
import {
  useCreatePaperAccount,
  usePaperAccount,
  usePaperCandles,
  usePaperInstruments,
  usePaperMarketStatus,
  usePaperMovers,
  usePaperOrder,
  usePaperOrders,
  usePaperQuote,
  usePaperWatchlist,
  usePaperWatchlistActions,
  useRefreshPaperQuote,
} from "../../features/invest/hooks/usePaperTrading";
import { PaperTradingChart } from "../../features/invest/components/PaperTradingChart";
import type { PaperExchange, PaperInstrument, PaperRange, PaperSide } from "../../types/paperTrading";

type WorkspaceTab = "Watchlist" | "Positions" | "Orders" | "Trade History";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const RANGES: PaperRange[] = ["1D", "1W", "1M", "3M", "1Y"];
const INTERVALS: Record<PaperRange, string[]> = {
  "1D": ["1m", "5m", "15m", "30m", "1h"],
  "1W": ["5m", "15m", "30m", "1h", "1d"],
  "1M": ["15m", "30m", "1h", "1d"],
  "3M": ["1h", "1d", "1wk"],
  "1Y": ["1d", "1wk", "1mo"],
};
const DEFAULT_INTERVAL: Record<PaperRange, string> = { "1D": "5m", "1W": "15m", "1M": "1d", "3M": "1d", "1Y": "1d" };

function currency(value: string | number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return INR.format(Number(value));
}

function percent(value: string | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function formatTime(value: string | null | undefined) {
  if (!value) return "No quote yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Timestamp unavailable";
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

function priceState(status: string) {
  if (status === "fresh") return { label: "Latest provider quote", tone: "text-[#18794E] bg-[#E7F5EB]" };
  if (status === "stale") return { label: "Last known · stale", tone: "text-[#8A5B10] bg-[#FFF5DE]" };
  return { label: "Price unavailable", tone: "text-[#64746A] bg-[#EFF3F0]" };
}

function SummaryMetric({ label, value, detail, emphasis = false }: { label: string; value: string; detail?: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 border-r border-white/10 px-4 py-3 first:pl-0 last:border-0 sm:px-5">
      <p className="truncate text-[11px] font-medium text-white/65">{label}</p>
      <p className={`mt-1 truncate text-lg font-semibold tabular-nums ${emphasis ? "text-[#B9F2D2]" : "text-white"}`}>{value}</p>
      {detail ? <p className="mt-0.5 truncate text-[10px] text-white/55">{detail}</p> : null}
    </div>
  );
}

function InstrumentRow({
  instrument,
  active,
  onSelect,
}: {
  instrument: PaperInstrument;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${active ? "bg-[#E8F4EE]" : "hover:bg-[#F5F8F6]"}`}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-[#141C16]">{instrument.symbol}</span>
          <span className="shrink-0 text-[9px] font-semibold text-[#64746A]">{instrument.exchange}</span>
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-[#64746A]">{instrument.name}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-xs font-semibold tabular-nums text-[#141C16]">{currency(instrument.price)}</span>
        <span className={`mt-0.5 block text-[10px] font-medium tabular-nums ${Number(instrument.change_pct) >= 0 ? "text-[#18794E]" : "text-[#B42318]"}`}>
          {instrument.change_pct == null ? "—" : percent(instrument.change_pct)}
        </span>
      </span>
    </button>
  );
}

export function PaperTradingPage() {
  const accountQuery = usePaperAccount();
  const account = accountQuery.data;
  const createAccount = useCreatePaperAccount();
  const [capital, setCapital] = useState("100000");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [exchange, setExchange] = useState<PaperExchange | "ALL">("NSE");
  const [category, setCategory] = useState<"equity" | "index">("equity");
  const [selected, setSelected] = useState<PaperInstrument | null>(null);
  const [range, setRange] = useState<PaperRange>("1D");
  const [interval, setInterval] = useState(DEFAULT_INTERVAL["1D"]);
  const [chartStyle, setChartStyle] = useState<"candles" | "line">("candles");
  const [side, setSide] = useState<PaperSide>("buy");
  const [quantity, setQuantity] = useState("1");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("Watchlist");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setInterval(DEFAULT_INTERVAL[range]);
  }, [range]);

  const instrumentsQuery = usePaperInstruments({ q: debouncedSearch, exchange, category });
  const indicesQuery = usePaperInstruments({ q: "", exchange: "ALL", category: "index" });
  const watchlistQuery = usePaperWatchlist(Boolean(account));
  const ordersQuery = usePaperOrders(Boolean(account));
  const moversQuery = usePaperMovers(exchange);
  const marketStatusQuery = usePaperMarketStatus(exchange === "ALL" ? "NSE" : exchange);
  const watchlistActions = usePaperWatchlistActions();
  const refreshQuote = useRefreshPaperQuote();
  const placeOrder = usePaperOrder();

  const quoteQuery = usePaperQuote(selected?.id);
  const activeInstrument = selected ?? instrumentsQuery.data?.items[0] ?? indicesQuery.data?.items[0] ?? null;
  const quote = quoteQuery.data ?? activeInstrument;
  const candlesQuery = usePaperCandles(activeInstrument?.id, range, interval);
  const watchlistIds = useMemo(() => new Set((watchlistQuery.data?.items ?? []).map((item) => item.id)), [watchlistQuery.data?.items]);
  const availableQuantity = Number(account?.positions.find((position) => position.asset_id === activeInstrument?.id)?.quantity ?? 0);
  const quotePrice = Number(quote?.price ?? 0);
  const requestedQuantity = Number(quantity);
  const estimatedValue = Number.isFinite(requestedQuantity) && requestedQuantity > 0 && quotePrice > 0 ? requestedQuantity * quotePrice : 0;
  const hasFreshQuote = quote?.price_status === "fresh" && quotePrice > 0;
  const isTradeable = activeInstrument?.instrument_type === "stock" || activeInstrument?.instrument_type === "etf";
  const canPlaceOrder = Boolean(account && activeInstrument && isTradeable && hasFreshQuote && requestedQuantity > 0 && Number.isInteger(requestedQuantity) && !placeOrder.isPending && (side === "buy" ? estimatedValue <= Number(account.summary.available_cash) : requestedQuantity <= availableQuantity));
  const currentStatus = priceState(quote?.price_status ?? "unavailable");

  useEffect(() => {
    if (!selected && instrumentsQuery.data?.items.length) setSelected(instrumentsQuery.data.items[0]);
  }, [instrumentsQuery.data?.items, selected]);

  function chooseInstrument(item: PaperInstrument) {
    setSelected(item);
    setActionMessage("");
    setActionError("");
  }

  async function submitOrder() {
    if (!activeInstrument || !canPlaceOrder) return;
    setActionError("");
    setActionMessage("");
    try {
      const result = await placeOrder.mutateAsync({
        asset_id: activeInstrument.id,
        side,
        quantity: String(requestedQuantity),
        idempotency_key: crypto.randomUUID(),
      });
      setActionMessage(`${result.order.side === "buy" ? "Bought" : "Sold"} ${result.order.quantity} ${result.order.symbol} at ${currency(result.order.execution_price)}. Paper order filled.`);
      setQuantity("1");
      setActiveTab("Positions");
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Paper order could not be placed. Refresh the quote and try again."));
    }
  }

  async function toggleWatchlist() {
    if (!activeInstrument) return;
    setActionError("");
    try {
      if (watchlistIds.has(activeInstrument.id)) await watchlistActions.remove.mutateAsync(activeInstrument.id);
      else await watchlistActions.add.mutateAsync(activeInstrument.id);
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Watchlist could not be updated."));
    }
  }

  async function createAccountFromForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");
    try {
      await createAccount.mutateAsync(capital);
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Paper account could not be created."));
    }
  }

  if (accountQuery.isLoading) {
    return <div className="mx-auto max-w-[1500px] animate-pulse space-y-5" aria-label="Loading paper account">
      <div className="h-14 rounded-2xl bg-white" />
      <div className="h-28 rounded-2xl bg-[#121A15]" />
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_280px]"><div className="h-[520px] rounded-2xl bg-white" /><div className="h-[520px] rounded-2xl bg-white" /><div className="h-[520px] rounded-2xl bg-white" /></div>
    </div>;
  }

  if (accountQuery.isError) {
    return <section role="alert" className="mx-auto max-w-3xl rounded-2xl border border-[#E8C9C7] bg-white p-6">
      <h1 className="text-lg font-semibold text-[#141C16]">Paper Trading could not load</h1>
      <p className="mt-2 text-sm text-[#64746A]">{getApiErrorMessage(accountQuery.error, "Check your connection and reload Paper Trading.")}</p>
      <Button className="mt-4" onClick={() => void accountQuery.refetch()}>Reload Paper Trading</Button>
    </section>;
  }

  if (!account) {
    return <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0F766E]">Simulated account</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#141C16]">Paper Trading</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52615A]">Practice market orders with virtual cash. Trades here never reach a broker and stay separate from your real investments and bank accounts.</p>
      </header>
      <form onSubmit={createAccountFromForm} className="rounded-2xl border border-[#DCE4DF] bg-white p-5 sm:p-7">
        <h2 className="text-base font-semibold text-[#141C16]">Set up your virtual account</h2>
        <p className="mt-1 text-xs text-[#64746A]">Choose your starting capital. It can’t be changed after the account is created.</p>
        <label htmlFor="paper-capital" className="mt-5 block text-xs font-semibold text-[#26332C]">Starting virtual capital</label>
        <div className="mt-2 flex max-w-sm items-center rounded-xl border border-[#DCE4DF] focus-within:ring-2 focus-within:ring-[#0F766E]/40">
          <span className="px-3 text-sm text-[#64746A]">₹</span>
          <input id="paper-capital" type="number" inputMode="decimal" min="1000" max="1000000000" step="1000" value={capital} onChange={(event) => setCapital(event.target.value)} className="h-11 min-w-0 flex-1 rounded-r-xl border-0 bg-transparent px-2 text-sm font-semibold tabular-nums text-[#141C16] outline-none" required />
        </div>
        <p className="mt-2 text-[11px] text-[#64746A]">Default ₹1,00,000 · Minimum ₹1,000</p>
        {actionError ? <p className="mt-4 text-xs text-[#B42318]" role="alert">{actionError}</p> : null}
        <Button type="submit" className="mt-5" isLoading={createAccount.isPending} loadingLabel="Creating account…">Create paper account</Button>
      </form>
    </div>;
  }

  const summary = account.summary;
  const resultTab = activeTab === "Positions" ? (
    account.positions.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-[#64746A]"><tr><th className="px-3 py-3 font-semibold">Instrument</th><th className="px-3 py-3 text-right font-semibold">Units</th><th className="px-3 py-3 text-right font-semibold">Avg. cost</th><th className="px-3 py-3 text-right font-semibold">Market price</th><th className="px-3 py-3 text-right font-semibold">Market value</th><th className="px-3 py-3 text-right font-semibold">Unrealised P&amp;L</th></tr></thead><tbody className="divide-y divide-[#EFF3F0]">{account.positions.map((position) => <tr key={position.asset_id} className="hover:bg-[#F8FAF8]"><td className="px-3 py-3"><span className="font-semibold text-[#141C16]">{position.symbol}</span><span className="ml-2 text-[10px] text-[#64746A]">{position.exchange}</span><span className="mt-0.5 block max-w-[240px] truncate text-[10px] text-[#64746A]">{position.name}</span></td><td className="px-3 py-3 text-right tabular-nums">{position.quantity}</td><td className="px-3 py-3 text-right tabular-nums">{currency(position.average_cost)}</td><td className="px-3 py-3 text-right tabular-nums">{currency(position.current_price)}</td><td className="px-3 py-3 text-right font-semibold tabular-nums">{currency(position.market_value)}</td><td className={`px-3 py-3 text-right font-semibold tabular-nums ${Number(position.unrealised_pnl) >= 0 ? "text-[#18794E]" : "text-[#B42318]"}`}>{currency(position.unrealised_pnl)}</td></tr>)}</tbody></table></div> : <EmptyTab title="No open positions" text="Choose an NSE or BSE equity, refresh its quote and place a paper order to start a position." />
  ) : activeTab === "Watchlist" ? (
    watchlistQuery.isLoading ? <InlineLoading /> : watchlistQuery.data?.items.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{watchlistQuery.data.items.map((item) => <button type="button" key={item.id} onClick={() => chooseInstrument(item)} className="flex items-center justify-between gap-3 rounded-xl border border-[#E5EBE7] px-3.5 py-3 text-left transition-colors hover:border-[#BCD3C3] hover:bg-[#F8FAF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"><span className="min-w-0"><span className="block truncate text-xs font-semibold text-[#141C16]">{item.symbol}<span className="ml-2 text-[10px] font-medium text-[#64746A]">{item.exchange}</span></span><span className="mt-0.5 block truncate text-[10px] text-[#64746A]">{item.name}</span></span><span className="text-right"><span className="block text-xs font-semibold tabular-nums">{currency(item.price)}</span><span className={`block text-[10px] tabular-nums ${Number(item.change_pct) >= 0 ? "text-[#18794E]" : "text-[#B42318]"}`}>{percent(item.change_pct)}</span></span></button>)}</div> : <EmptyTab title="Your watchlist is empty" text="Select an instrument and add it to your watchlist to keep it close." />
  ) : (
    ordersQuery.isLoading ? <InlineLoading /> : ordersQuery.data?.items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-[#64746A]"><tr><th className="px-3 py-3 font-semibold">Time</th><th className="px-3 py-3 font-semibold">Instrument</th><th className="px-3 py-3 font-semibold">Side</th><th className="px-3 py-3 text-right font-semibold">Units</th><th className="px-3 py-3 text-right font-semibold">Execution price</th><th className="px-3 py-3 text-right font-semibold">Gross value</th><th className="px-3 py-3 text-right font-semibold">Status</th></tr></thead><tbody className="divide-y divide-[#EFF3F0]">{ordersQuery.data.items.map((order) => <tr key={order.id} className="hover:bg-[#F8FAF8]"><td className="px-3 py-3 text-[10px] text-[#64746A]">{formatTime(order.created_at)}</td><td className="px-3 py-3"><span className="font-semibold text-[#141C16]">{order.symbol}</span><span className="ml-2 text-[10px] text-[#64746A]">{order.exchange}</span></td><td className={`px-3 py-3 font-semibold uppercase ${order.side === "buy" ? "text-[#18794E]" : "text-[#B42318]"}`}>{order.side}</td><td className="px-3 py-3 text-right tabular-nums">{order.quantity}</td><td className="px-3 py-3 text-right tabular-nums">{currency(order.execution_price)}</td><td className="px-3 py-3 text-right font-semibold tabular-nums">{currency(order.gross_amount)}</td><td className="px-3 py-3 text-right"><span className="rounded-full bg-[#E7F5EB] px-2 py-1 text-[9px] font-semibold text-[#18794E]">{order.status}</span></td></tr>)}</tbody></table></div> : <EmptyTab title={activeTab === "Orders" ? "No orders yet" : "No trade history yet"} text="Confirmed paper orders appear here with their execution price and timestamp." />
  );

  const tabs: WorkspaceTab[] = ["Watchlist", "Positions", "Orders", "Trade History"];

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-[#141C16]">Paper Trading</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E7F5EB] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#18794E]"><Activity className="h-3 w-3" /> Simulated</span>
          </div>
          <p className="mt-1 text-xs text-[#64746A]">Practice with virtual cash. Orders never reach a broker.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#64746A]">
          <span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${marketStatusQuery.data?.session.startsWith("within") ? "bg-[#16A34A]" : "bg-[#A3ACA6]"}`} />{exchange === "ALL" ? "NSE" : exchange} · {marketStatusQuery.data?.session ?? "Market session unavailable"}</span>
          <span title={marketStatusQuery.data?.note} className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> Exchange holidays not included</span>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl bg-[#121A15] px-4 py-3 sm:px-6" aria-label="Paper portfolio summary">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          <SummaryMetric label="Starting capital" value={currency(summary.starting_capital)} detail="Virtual account" />
          <SummaryMetric label="Available cash" value={currency(summary.available_cash)} detail="Ready to trade" />
          <SummaryMetric label="Invested cost basis" value={currency(summary.invested_cost_basis)} />
          <SummaryMetric label="Open positions · market value" value={currency(summary.current_market_value)} detail={summary.valuation_complete ? "Latest available prices" : `${summary.unvalued_positions} position(s) unpriced`} />
          <SummaryMetric label="Paper equity" value={currency(summary.portfolio_equity)} detail={summary.valuation_complete ? "Cash + market value" : "Incomplete market data"} emphasis />
          <SummaryMetric label="Total paper P&amp;L" value={currency(summary.total_pnl)} detail={`Realised ${currency(summary.realised_pnl)} · Unrealised ${currency(summary.unrealised_pnl)}`} emphasis={Number(summary.total_pnl) >= 0} />
        </div>
        {!summary.valuation_complete ? <p className="mt-2 border-t border-white/10 pt-2 text-[10px] text-white/65">Equity and total P&amp;L are withheld until every open position has a valid market value.</p> : null}
      </section>

      <section className="grid gap-3 rounded-2xl border border-[#DCE4DF] bg-white p-3 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center sm:p-4" aria-label="Market overview">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#141C16]"><Activity className="h-4 w-4 text-[#0F766E]" /> Market overview</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <MoverGroup title="Top gainers" icon={<TrendingUp className="h-3.5 w-3.5 text-[#18794E]" />} items={moversQuery.data?.gainers ?? []} onSelect={chooseInstrument} />
          <MoverGroup title="Top losers" icon={<TrendingDown className="h-3.5 w-3.5 text-[#B42318]" />} items={moversQuery.data?.losers ?? []} onSelect={chooseInstrument} />
        </div>
        <p className="max-w-[180px] text-[9px] leading-4 text-[#718077]">{moversQuery.data?.universe ?? (moversQuery.isError ? "Mover data unavailable until valid quotes are cached." : "Cached quotes only · no exchange-wide live scan")}</p>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[250px_minmax(0,1fr)_285px]">
        <section className="rounded-2xl border border-[#DCE4DF] bg-white p-3.5" aria-labelledby="instrument-search-heading">
          <div className="flex items-center justify-between gap-2">
            <h2 id="instrument-search-heading" className="text-sm font-semibold text-[#141C16]">Markets</h2>
            <span className="text-[9px] text-[#64746A]">{instrumentsQuery.data?.total ?? 0} matches</span>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#77867C]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && instrumentsQuery.data?.items[0]) chooseInstrument(instrumentsQuery.data.items[0]); }} placeholder="Symbol or company" aria-label="Search stocks and indices" className="h-10 w-full rounded-xl border border-[#DCE4DF] bg-[#FAFCFA] pl-9 pr-3 text-xs text-[#141C16] outline-none placeholder:text-[#829187] focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15" />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {(["NSE", "BSE", "ALL"] as const).map((item) => <button key={item} type="button" onClick={() => setExchange(item)} aria-pressed={exchange === item} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${exchange === item ? "bg-[#121A15] text-white" : "bg-[#F1F5F2] text-[#52615A] hover:bg-[#E5EBE7]"}`}>{item === "ALL" ? "All" : item}</button>)}
            <button type="button" onClick={() => setCategory(category === "equity" ? "index" : "equity")} className="ml-auto rounded-lg border border-[#DCE4DF] px-2.5 py-1.5 text-[10px] font-semibold text-[#52615A] hover:bg-[#F5F8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]">{category === "equity" ? "Equities" : "Indices"}</button>
          </div>
          {instrumentsQuery.isError ? <div className="mt-4 rounded-xl bg-[#FFF7F6] p-3 text-[10px] leading-4 text-[#9B302A]" role="alert">Instrument search could not load. Try again in a moment.</div> : null}
          <div className="mt-3 max-h-[420px] space-y-0.5 overflow-y-auto">
            {instrumentsQuery.isLoading ? <InlineLoading /> : instrumentsQuery.data?.items.length ? instrumentsQuery.data.items.map((item) => <InstrumentRow key={item.id} instrument={item} active={activeInstrument?.id === item.id} onSelect={() => chooseInstrument(item)} />) : <p className="px-2 py-8 text-center text-xs text-[#64746A]">No instruments match that search.</p>}
          </div>
          <p className="mt-2 border-t border-[#EFF3F0] pt-2 text-[9px] leading-4 text-[#718077]">Universe: {instrumentsQuery.data?.source ?? "Vestor instrument catalog"}</p>
        </section>

        <section className="min-w-0 rounded-2xl border border-[#DCE4DF] bg-white p-3.5 sm:p-4" aria-labelledby="chart-heading">
          {activeInstrument ? <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EFF3F0] pb-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="chart-heading" className="text-base font-semibold text-[#141C16]">{activeInstrument.symbol}</h2>
                  <span className="rounded-md bg-[#EFF3F0] px-1.5 py-0.5 text-[9px] font-semibold text-[#52615A]">{activeInstrument.exchange}</span>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${currentStatus.tone}`}>{currentStatus.label}</span>
                </div>
                <p className="mt-1 max-w-[500px] truncate text-[10px] text-[#64746A]">{activeInstrument.name}</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-xl font-semibold tabular-nums tracking-tight text-[#141C16]">{currency(quote?.price)}</span>
                  <span className={`text-xs font-semibold tabular-nums ${Number(quote?.change_pct) >= 0 ? "text-[#18794E]" : "text-[#B42318]"}`}>{percent(quote?.change_pct)}</span>
                  <span className="text-[9px] text-[#7A8980]">vs previous close</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => void toggleWatchlist()} disabled={!account || watchlistActions.add.isPending || watchlistActions.remove.isPending} aria-pressed={watchlistIds.has(activeInstrument.id)} className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] disabled:opacity-50 ${watchlistIds.has(activeInstrument.id) ? "border-[#B9D8C4] bg-[#E7F5EB] text-[#18794E]" : "border-[#DCE4DF] bg-white text-[#52615A] hover:bg-[#F8FAF8]"}`}><Star className={`h-3.5 w-3.5 ${watchlistIds.has(activeInstrument.id) ? "fill-current" : ""}`} />{watchlistIds.has(activeInstrument.id) ? "Saved" : "Watch"}</button>
                <Button type="button" variant="secondary" className="!h-9 !min-h-9 !px-2.5 !py-1.5 text-[10px]" isLoading={refreshQuote.isPending} loadingLabel="Refreshing…" onClick={() => refreshQuote.mutate(activeInstrument.id)}><RefreshCw className="h-3.5 w-3.5" />Refresh quote</Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="flex items-center gap-1">
                {RANGES.map((item) => <button type="button" key={item} onClick={() => setRange(item)} aria-pressed={range === item} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${range === item ? "bg-[#121A15] text-white" : "text-[#64746A] hover:bg-[#EFF3F0] hover:text-[#141C16]"}`}>{item}</button>)}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="chart-interval" className="sr-only">Candle interval</label>
                <select id="chart-interval" value={interval} onChange={(event) => setInterval(event.target.value)} className="h-8 rounded-lg border border-[#DCE4DF] bg-white px-2 text-[10px] font-medium text-[#52615A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]">{INTERVALS[range].map((item) => <option key={item} value={item}>{item}</option>)}</select>
                <div className="flex rounded-lg bg-[#EFF3F0] p-0.5" role="group" aria-label="Chart style">
                  <button type="button" aria-pressed={chartStyle === "candles"} onClick={() => setChartStyle("candles")} className={`rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${chartStyle === "candles" ? "bg-white text-[#141C16] shadow-sm" : "text-[#64746A]"}`} aria-label="Candlestick chart"><CandlestickChart className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-pressed={chartStyle === "line"} onClick={() => setChartStyle("line")} className={`rounded-md px-2 py-1 text-[9px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${chartStyle === "line" ? "bg-white text-[#141C16] shadow-sm" : "text-[#64746A]"}`}>Line</button>
                </div>
              </div>
            </div>

            {candlesQuery.isLoading ? <div className="flex h-[410px] flex-col items-center justify-center rounded-xl bg-[#FAFCFA] text-center"><LoaderCircle className="h-5 w-5 animate-spin text-[#0F766E]" aria-hidden="true" /><p className="mt-3 text-xs font-semibold text-[#26332C]">Loading {range} history</p><p className="mt-1 text-[10px] text-[#718077]">Fetching provider candles for {activeInstrument.symbol}</p></div> : null}
            {candlesQuery.isError ? <div className="flex h-[410px] flex-col items-center justify-center rounded-xl bg-[#FAFCFA] px-5 text-center" role="status"><Activity className="h-5 w-5 text-[#829187]" /><p className="mt-3 text-sm font-semibold text-[#26332C]">Chart data unavailable</p><p className="mt-1 max-w-sm text-[11px] leading-5 text-[#64746A]">The configured market-data provider returned no {range} history for this instrument. No sample prices are shown.</p><button type="button" onClick={() => void candlesQuery.refetch()} className="mt-3 rounded-lg px-3 py-2 text-[10px] font-semibold text-[#0F766E] hover:bg-[#E8F4EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]">Try again</button></div> : null}
            {candlesQuery.data && !candlesQuery.isLoading ? <PaperTradingChart key={`${activeInstrument.id}-${range}-${interval}-${chartStyle}`} data={candlesQuery.data} instrument={quote ?? activeInstrument} range={range} interval={interval} style={chartStyle} /> : null}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[9px] text-[#718077]">
              <span>Provider: {candlesQuery.data?.source ?? "yfinance"} · retrieved {formatTime(candlesQuery.data?.retrieved_at)}</span>
              <span>Quote timestamp: {formatTime(quote?.price_timestamp ?? quote?.fetched_at)}</span>
            </div>
          </> : <EmptyTab title="Select an instrument" text="Choose a supported NSE or BSE equity to load its quote and chart." />}
        </section>

        <aside className="rounded-2xl border border-[#DCE4DF] bg-white p-4" aria-labelledby="order-ticket-heading">
          <div className="flex items-center justify-between gap-2">
            <h2 id="order-ticket-heading" className="text-sm font-semibold text-[#141C16]">Order ticket</h2>
            <span className="rounded-full bg-[#F1F5F2] px-2 py-1 text-[9px] font-semibold uppercase text-[#64746A]">Virtual</span>
          </div>
          <p className="mt-1 truncate text-[10px] text-[#64746A]">{activeInstrument?.symbol ?? "Select an instrument"} · {activeInstrument?.exchange ?? "—"}</p>

          <div className="mt-4 grid grid-cols-2 rounded-xl bg-[#EFF3F0] p-1" role="group" aria-label="Order side">
            {(["buy", "sell"] as const).map((item) => <button key={item} type="button" onClick={() => setSide(item)} aria-pressed={side === item} className={`h-9 rounded-lg text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${side === item ? item === "buy" ? "bg-white text-[#18794E] shadow-sm" : "bg-white text-[#B42318] shadow-sm" : "text-[#64746A] hover:text-[#141C16]"}`}>{item}</button>)}
          </div>

          <label htmlFor="paper-quantity" className="mt-4 block text-[10px] font-semibold text-[#52615A]">Quantity · whole units</label>
          <input id="paper-quantity" type="number" inputMode="numeric" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#DCE4DF] px-3 text-sm font-semibold tabular-nums text-[#141C16] outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15" />

          <div className="mt-4 space-y-2 border-y border-[#EFF3F0] py-3 text-[10px]">
            <TicketRow label="Market quote" value={currency(quote?.price)} />
            <TicketRow label="Estimated order value" value={currency(estimatedValue || null)} strong />
            <TicketRow label={side === "buy" ? "Virtual cash available" : "Units available to sell"} value={side === "buy" ? currency(summary.available_cash) : String(availableQuantity)} />
            <TicketRow label="Simulated charges" value="₹0.00" />
          </div>

          <p className="mt-3 text-[9px] leading-4 text-[#718077]">Market order uses the latest available provider quote. No slippage or brokerage is simulated.</p>
          {!isTradeable && activeInstrument ? <p className="mt-3 rounded-lg bg-[#F5F8F6] p-2.5 text-[10px] leading-4 text-[#64746A]">Indices are for reference and can’t be traded.</p> : null}
          {!hasFreshQuote && isTradeable ? <p className="mt-3 rounded-lg bg-[#FFF5DE] p-2.5 text-[10px] leading-4 text-[#765014]">Refresh a current quote before placing a paper order. Stale quotes can’t execute trades.</p> : null}
          {actionError ? <p className="mt-3 text-[10px] leading-4 text-[#B42318]" role="alert">{actionError}</p> : null}
          {actionMessage ? <p className="mt-3 flex gap-1.5 text-[10px] leading-4 text-[#18794E]" role="status"><Check className="mt-0.5 h-3 w-3 shrink-0" />{actionMessage}</p> : null}
          <Button type="button" variant={side === "buy" ? "dark" : "secondary"} className="mt-4 w-full !min-h-11 !rounded-xl !text-xs" isLoading={placeOrder.isPending} loadingLabel="Submitting paper order…" disabled={!canPlaceOrder} onClick={() => void submitOrder()}>
            {side === "buy" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            Confirm {side === "buy" ? "buy" : "sell"} · {currency(estimatedValue || null)}
          </Button>
          <p className="mt-2 text-center text-[9px] text-[#718077]">Simulation only · no real order is sent</p>
        </aside>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#DCE4DF] bg-white" aria-labelledby="paper-workspace-heading">
        <div className="flex flex-col gap-2 border-b border-[#EFF3F0] px-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div><h2 id="paper-workspace-heading" className="text-sm font-semibold text-[#141C16]">Paper account activity</h2><p className="mt-0.5 text-[10px] text-[#64746A]">Your virtual trades and saved instruments</p></div>
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Paper account activity">
            {tabs.map((tab) => <button key={tab} id={`paper-tab-${tab.replaceAll(" ", "-")}`} type="button" role="tab" aria-selected={activeTab === tab} aria-controls="paper-tab-panel" onClick={() => setActiveTab(tab)} className={`shrink-0 border-b-2 px-3 py-2.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F766E] ${activeTab === tab ? "border-[#0F766E] text-[#0F766E]" : "border-transparent text-[#718077] hover:text-[#141C16]"}`}>{tab}{tab === "Positions" && account.positions.length ? <span className="ml-1.5 rounded-full bg-[#EFF3F0] px-1.5 py-0.5 text-[9px]">{account.positions.length}</span> : null}</button>)}
          </div>
        </div>
        <div id="paper-tab-panel" role="tabpanel" aria-labelledby={`paper-tab-${activeTab.replaceAll(" ", "-")}`} className="min-h-[190px] p-3 sm:p-5">{resultTab}</div>
      </section>

      <div className="flex flex-wrap items-start justify-between gap-2 px-1 text-[9px] leading-4 text-[#718077]">
        <span>Market data from Yahoo Finance via yfinance; provider timestamps are shown and prices may be delayed or stale.</span>
        <span>Paper account data is separate from Invest portfolio holdings and bank balances.</span>
      </div>
    </div>
  );
}

function TicketRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-[#64746A]">{label}</span><span className={`text-right tabular-nums ${strong ? "font-semibold text-[#141C16]" : "font-medium text-[#26332C]"}`}>{value}</span></div>;
}

function EmptyTab({ title, text }: { title: string; text: string }) {
  return <div className="flex min-h-[160px] flex-col items-center justify-center px-4 py-8 text-center"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF3F0] text-[#64746A]"><Wallet className="h-4 w-4" /></span><p className="mt-3 text-xs font-semibold text-[#26332C]">{title}</p><p className="mt-1 max-w-sm text-[10px] leading-5 text-[#718077]">{text}</p></div>;
}

function InlineLoading() {
  return <div className="flex items-center justify-center gap-2 py-8 text-[10px] text-[#64746A]" role="status"><LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#0F766E]" />Loading saved activity…</div>;
}

function MoverGroup({ title, icon, items, onSelect }: { title: string; icon: ReactNode; items: PaperInstrument[]; onSelect: (item: PaperInstrument) => void }) {
  return <div className="flex min-w-0 items-center gap-2 rounded-xl bg-[#F7FAF8] px-3 py-2">
    <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold text-[#64746A]">{icon}{title}</span>
    {items.length ? <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">{items.slice(0, 3).map((item) => <button type="button" key={item.id} onClick={() => onSelect(item)} className="flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-[9px] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"><span className="font-semibold text-[#26332C]">{item.symbol}</span><span className={Number(item.change_pct) >= 0 ? "text-[#18794E]" : "text-[#B42318]"}>{percent(item.change_pct)}</span></button>)}</div> : <span className="truncate text-[9px] text-[#718077]">No fresh cached movers</span>}
  </div>;
}
