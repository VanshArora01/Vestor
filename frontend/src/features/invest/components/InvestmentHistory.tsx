import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import type { HistoryItem } from "../../../types/invest";
import { downloadInvestCsv } from "../hooks/useInvest";
import { assetTypeLabel, formatInr, formatUnits } from "../utils/format";
import { getApiErrorMessage } from "../../../api/client";

interface InvestmentHistoryProps {
  items: HistoryItem[];
  total: number;
}

export function InvestmentHistory({ items, total }: InvestmentHistoryProps) {
  const [assetType, setAssetType] = useState("");
  const [txType, setTxType] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filtered = items.filter((i) => {
    if (assetType && i.asset_type !== assetType) return false;
    if (txType && i.transaction_type !== txType) return false;
    return true;
  });

  async function handleExport() {
    setExportError(null);
    setExporting(true);
    try {
      await downloadInvestCsv({
        ...(assetType ? { asset_type: assetType } : {}),
        ...(txType ? { transaction_type: txType } : {}),
      });
    } catch (err) {
      setExportError(getApiErrorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="pt-2" aria-labelledby="invest-history-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="invest-history-heading" className="font-display text-lg font-semibold text-ink-950">
            History
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">{total} transactions</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-ink-500">
            Asset{" "}
            <select
              className="ml-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-ink-800"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
            >
              <option value="">All</option>
              <option value="stock">Stocks</option>
              <option value="mutual_fund">Mutual Funds</option>
              <option value="etf">ETFs</option>
              <option value="gold">Gold</option>
              <option value="fd">FD</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-xs text-ink-500">
            Type{" "}
            <select
              className="ml-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-ink-800"
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
            >
              <option value="">All</option>
              <option value="buy">Buy</option>
            </select>
          </label>
          <Button
            variant="secondary"
            type="button"
            onClick={handleExport}
            isLoading={exporting}
            disabled={total === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>
      {exportError ? <p className="mb-2 text-sm text-red-700">{exportError}</p> : null}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-400">No transactions yet</p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <div className="grid grid-cols-12 gap-3 border-b border-slate-100 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              <div className="col-span-2">Date</div>
              <div className="col-span-4">Asset</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2 text-right">Qty / Price</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
            <ul>
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-12 gap-3 border-b border-slate-50 py-3.5 text-sm"
                >
                  <div className="col-span-2 tabular-nums text-ink-600">{item.traded_on}</div>
                  <div className="col-span-4 min-w-0">
                    <p className="truncate font-semibold text-ink-950">{item.display_name}</p>
                    <p className="truncate text-xs text-ink-400">
                      {[item.symbol, assetTypeLabel(item.asset_type)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="col-span-2 uppercase tracking-wide text-ink-600">
                    {item.transaction_type}
                  </div>
                  <div className="col-span-2 text-right tabular-nums text-ink-600">
                    {item.quantity ? formatUnits(item.quantity) : "—"}
                    {item.unit_price ? (
                      <p className="text-xs text-ink-400">
                        @ {formatInr(item.unit_price, { decimals: 2 })}
                      </p>
                    ) : null}
                  </div>
                  <div className="col-span-2 text-right font-display font-semibold tabular-nums text-ink-950">
                    {formatInr(item.amount)}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Mobile */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink-950">{item.display_name}</p>
                  <p className="text-xs text-ink-500">
                    {item.traded_on} · {assetTypeLabel(item.asset_type)} ·{" "}
                    {item.transaction_type.toUpperCase()}
                    {item.quantity
                      ? ` · ${formatUnits(item.quantity)}${
                          item.unit_price
                            ? ` @ ${formatInr(item.unit_price, { decimals: 2 })}`
                            : ""
                        }`
                      : ""}
                  </p>
                </div>
                <p className="font-display font-semibold tabular-nums text-ink-950">
                  {formatInr(item.amount)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
