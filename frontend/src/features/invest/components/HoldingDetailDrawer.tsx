import { Button } from "../../../components/ui/Button";
import { useHoldingDetail } from "../hooks/useInvest";
import {
  assetTypeLabel,
  formatInr,
  formatRelativeTime,
  formatSignedInr,
  formatSignedPercent,
  formatUnits,
  toneClass,
  toneForNumber,
} from "../utils/format";

interface HoldingDetailDrawerProps {
  holdingId: string | null;
  onClose: () => void;
}

export function HoldingDetailDrawer({ holdingId, onClose }: HoldingDetailDrawerProps) {
  const { data, isLoading, isError, refetch } = useHoldingDetail(holdingId);
  if (!holdingId) return null;

  const h = data?.holding;
  const lots = data?.transactions ?? [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-ink-950/30"
        aria-label="Close holding detail"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl animate-[fadeIn_0.15s_ease]">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-950">
              {h?.display_name ?? "Holding"}
            </h2>
            {h ? (
              <p className="mt-1 text-sm text-ink-500">
                {[h.symbol, assetTypeLabel(h.asset_type)].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" type="button" onClick={onClose} className="!px-2">
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-8 animate-pulse rounded bg-slate-100" />
              <div className="h-24 animate-pulse rounded bg-slate-100" />
            </div>
          ) : isError || !h ? (
            <div className="text-sm text-ink-500">
              <p>Couldn&apos;t load holding detail.</p>
              <button
                type="button"
                className="mt-2 font-semibold text-accent"
                onClick={() => refetch()}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-ink-500">Quantity</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink-950">
                    {formatUnits(h.quantity)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-500">Avg. cost</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink-950">
                    {formatInr(h.average_cost, { decimals: 2 })}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-500">Current price</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink-950">
                    {h.latest_price ? formatInr(h.latest_price, { decimals: 2 }) : "—"}
                  </dd>
                  {h.price_status === "stale" ? (
                    <p className="mt-0.5 text-xs text-amber-700">
                      Delayed · {formatRelativeTime(h.price_fetched_at) ?? "latest available"}
                    </p>
                  ) : h.price_fetched_at ? (
                    <p className="mt-0.5 text-xs text-ink-400">
                      Updated {formatRelativeTime(h.price_fetched_at)}
                    </p>
                  ) : null}
                </div>
                <div>
                  <dt className="text-ink-500">Invested</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink-950">
                    {formatInr(h.total_invested)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-500">Current value</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink-950">
                    {h.current_value ? formatInr(h.current_value) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-500">Gain</dt>
                  <dd
                    className={`mt-0.5 font-semibold tabular-nums ${toneClass(toneForNumber(h.absolute_gain_loss))}`}
                  >
                    {formatSignedInr(h.absolute_gain_loss)}
                    <span className="ml-1 text-xs font-medium">
                      {formatSignedPercent(h.return_pct)}
                    </span>
                  </dd>
                </div>
              </dl>

              <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-ink-400">
                Lots
              </h3>
              <ul className="mt-3 divide-y divide-slate-100">
                {lots.map((lot) => (
                  <li key={lot.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium text-ink-900">{lot.traded_on}</p>
                      <p className="text-xs text-ink-500">
                        {lot.quantity ? `${formatUnits(lot.quantity)} @ ` : ""}
                        {lot.unit_price
                          ? formatInr(lot.unit_price, { decimals: 2 })
                          : "BUY"}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums text-ink-950">
                      {formatInr(lot.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
