import type { Holding } from "../../../types/invest";
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
import { Layers } from "lucide-react";

interface HoldingsListProps {
  holdings: Holding[];
  onSelect: (holdingId: string) => void;
}

export function HoldingsList({ holdings, onSelect }: HoldingsListProps) {
  if (holdings.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#DCE4DF]">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#121A15] text-[#22C55E]">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-sans text-base font-bold text-[#141C16]">
              Holdings & Assets
            </h3>
            <p className="font-sans text-xs text-[#6C7A70]">
              {holdings.length} tracked instruments with current valuation status
            </p>
          </div>
        </div>
      </div>

      {/* Responsive Table with horizontal scroll safety */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full min-w-[700px] text-left border-collapse">
          <thead>
            <tr className="border-b border-[#DCE4DF] text-[10px] font-bold uppercase tracking-wider text-[#6C7A70]">
              <th className="py-3 px-3">Asset Name</th>
              <th className="py-3 px-3 text-right">Qty / Avg Cost</th>
              <th className="py-3 px-3 text-right">Latest Price</th>
              <th className="py-3 px-3 text-right">Current Value</th>
              <th className="py-3 px-3 text-right">Total Gain/Loss</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE4DF] text-xs">
            {holdings.map((h) => {
              const gainTone = toneForNumber(h.absolute_gain_loss);
              return (
                <tr
                  key={h.id}
                  onClick={() => onSelect(h.id)}
                  className="group hover:bg-[#EFF3F0]/60 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-3 min-w-[200px]">
                    <p className="font-sans font-bold text-[#141C16] group-hover:text-[#22C55E] transition-colors truncate">
                      {h.display_name}
                    </p>
                    <p className="font-sans text-[11px] text-[#6C7A70] mt-0.5">
                      {[h.symbol, assetTypeLabel(h.asset_type)].filter(Boolean).join(" · ")}
                      {h.price_status === "stale" ? " · Stale price" : h.price_status === "unavailable" ? " · Price unavailable" : ""}
                    </p>
                  </td>

                  <td className="py-4 px-3 text-right font-sans tabular-nums text-[#141C16]">
                    <p className="font-semibold">{formatUnits(h.quantity)}</p>
                    <p className="text-[11px] text-[#6C7A70]">
                      {formatInr(h.average_cost, { decimals: 2 })}
                    </p>
                  </td>

                  <td className="py-4 px-3 text-right font-sans tabular-nums text-[#141C16]">
                    <p className="font-semibold">
                      {h.latest_price ? formatInr(h.latest_price, { decimals: 2 }) : "—"}
                    </p>
                    {h.price_fetched_at && (
                      <p className="text-[11px] text-[#6C7A70]">
                        {formatRelativeTime(h.price_fetched_at)}
                      </p>
                    )}
                  </td>

                  <td className="py-4 px-3 text-right font-sans font-bold tabular-nums text-[#141C16]">
                    {h.current_value ? formatInr(h.current_value) : "—"}
                  </td>

                  <td className={`py-4 px-3 text-right font-sans tabular-nums ${toneClass(gainTone)}`}>
                    <p className="font-bold">
                      {formatSignedInr(h.absolute_gain_loss)}
                    </p>
                    <p className="text-[11px] font-semibold">
                      {formatSignedPercent(h.return_pct)}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
