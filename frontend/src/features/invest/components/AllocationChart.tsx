import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Holding } from "../../../types/invest";
import {
  ASSET_TYPE_COLORS,
  assetTypePlural,
  formatInr,
} from "../utils/format";

interface AllocationChartProps {
  holdings: Holding[];
  centerValue: string | null;
}

export function AllocationChart({ holdings, centerValue }: AllocationChartProps) {
  const slices = useMemo(() => {
    const totals = new Map<string, number>();
    for (const h of holdings) {
      const raw = h.current_value;
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

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b border-[#DCE4DF]">
        <h3 className="font-sans text-base font-bold text-[#141C16]">
          Asset Allocation
        </h3>
        <p className="font-sans text-xs text-[#6C7A70] mt-0.5">
          Distribution by instrument type
        </p>
      </div>

      {slices.length === 0 ? (
        <p className="py-10 text-center font-sans text-xs text-[#6C7A70]">
          No valued holdings yet
        </p>
      ) : (
        <div className="flex flex-col items-center gap-5">
          {/* Donut */}
          <div className="relative h-44 w-44 shrink-0" role="img" aria-label="Portfolio allocation">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.type} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const row = payload[0].payload as (typeof slices)[0];
                    return (
                      <div className="rounded-2xl border border-[#DCE4DF] bg-white px-3 py-2 shadow-lg font-sans text-xs">
                        <p className="font-bold text-[#141C16]">{row.name}</p>
                        <p className="text-[#6C7A70] tabular-nums mt-0.5">
                          {formatInr(String(row.value))} · {row.percent.toFixed(1)}%
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-sans text-lg font-bold tabular-nums text-[#141C16]">
                {centerValue ? formatInr(centerValue) : "—"}
              </span>
              <span className="font-sans text-[10px] text-[#6C7A70]">Total Value</span>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full space-y-2">
            {slices.map((s) => (
              <div
                key={s.type}
                className="flex items-center justify-between rounded-xl bg-[#EFF3F0]/50 border border-[#DCE4DF] px-3.5 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-md shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-sans text-xs font-semibold text-[#141C16]">
                    {s.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-sans text-xs tabular-nums">
                  <span className="text-[#6C7A70]">{s.percent.toFixed(1)}%</span>
                  <span className="font-bold text-[#141C16]">{formatInr(String(s.value))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
