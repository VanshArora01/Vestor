import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Holding } from "../../../types/invest";
import { ASSET_TYPE_COLORS, assetTypePlural, formatInr } from "../../invest/utils/format";

interface PortfolioAllocationSummaryProps {
  holdings: Holding[];
  centerValue: string | number | null;
}

export function PortfolioAllocationSummary({ holdings, centerValue }: PortfolioAllocationSummaryProps) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const slices = useMemo(() => {
    const totals = new Map<string, number>();
    for (const h of holdings) {
      const raw = h.current_value ?? h.total_invested;
      const n = Number(raw);
      if (Number.isNaN(n) || n <= 0) continue;
      totals.set(h.asset_type, (totals.get(h.asset_type) ?? 0) + n);
    }
    const sum = [...totals.values()].reduce((a, b) => a + b, 0);
    return [...totals.entries()]
      .map(([type, value]) => ({
        name: assetTypePlural(type),
        type,
        value,
        percent: sum > 0 ? (value / sum) * 100 : 0,
        color: ASSET_TYPE_COLORS[type] ?? "#94A3B8",
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

  const displayVal = typeof centerValue === "number" ? centerValue : Number(centerValue);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="allocation-title">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 id="allocation-title" className="font-display text-lg font-semibold text-ink-950">
            Portfolio Allocation
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">Asset distribution breakdown</p>
        </div>
        <Link
          to="/invest"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-teal-800"
        >
          <span>Portfolio</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {slices.length === 0 ? (
        <div className="py-12 text-center text-sm text-ink-400">
          <p className="font-semibold text-ink-700">No active assets</p>
          <p className="mt-1 max-w-xs mx-auto text-xs">
            Add investments under the Portfolio module to construct your allocation donut.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-6">
          {/* Donut container */}
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="65%"
                  outerRadius="90%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                  onMouseEnter={(_, index) => {
                    if (slices[index]) setHoveredSlice(slices[index].type);
                  }}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  {slices.map((s) => (
                    <Cell
                      key={s.type}
                      fill={s.color}
                      style={{
                        filter: hoveredSlice === s.type ? "brightness(0.9)" : "none",
                        transition: "filter 0.15s ease",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const row = payload[0].payload as (typeof slices)[0];
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
                        <p className="font-semibold text-ink-950">{row.name}</p>
                        <p className="mt-0.5 tabular-nums text-ink-700 font-medium">
                          {formatInr(row.value)}
                        </p>
                        <p className="tabular-nums text-ink-400 text-[10px]">
                          {row.percent.toFixed(1)}% of total
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Value */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="font-display text-base font-semibold tabular-nums text-ink-950">
                {!Number.isNaN(displayVal) ? formatInr(displayVal) : "—"}
              </p>
              <p className="text-[10px] font-medium text-ink-400 uppercase tracking-wider">Total Value</p>
            </div>
          </div>

          {/* Slices legend */}
          <ul className="w-full space-y-2">
            {slices.map((s) => (
              <li
                key={s.type}
                className={`flex items-center justify-between text-xs transition-opacity duration-150 ${
                  hoveredSlice && hoveredSlice !== s.type ? "opacity-40" : "opacity-100"
                }`}
                onMouseEnter={() => setHoveredSlice(s.type)}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate font-medium text-ink-700">{s.name}</span>
                </span>
                <span className="tabular-nums font-semibold text-ink-950">
                  {s.percent.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
