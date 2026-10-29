import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useInvestPerformance } from "../hooks/useInvest";
import { formatInr, toIsoDate } from "../utils/format";
import { TrendingUp, RefreshCcw } from "lucide-react";

type RangeKey = "1M" | "3M" | "6M" | "1Y" | "ALL";

const RANGE_DAYS: Record<Exclude<RangeKey, "ALL">, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

function startForRange(key: RangeKey, earliest: string | null): string {
  const to = new Date();
  if (key === "ALL") {
    return earliest ?? toIsoDate(new Date(to.getFullYear() - 5, to.getMonth(), to.getDate()));
  }
  const from = new Date();
  from.setDate(from.getDate() - RANGE_DAYS[key]);
  return toIsoDate(from);
}

function formatAxisDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface PerformanceChartProps {
  seedEarliest?: string | null;
}

export function PerformanceChart({ seedEarliest = null }: PerformanceChartProps) {
  const [range, setRange] = useState<RangeKey>("ALL");
  const to = toIsoDate(new Date());

  const { data, isLoading, isError, refetch } = useInvestPerformance(
    seedEarliest ?? "2000-01-01",
    to,
  );

  const snapshots = data?.snapshots ?? [];
  const earliest = snapshots[0]?.date ?? seedEarliest;
  const spanDays =
    earliest != null
      ? Math.max(
          0,
          Math.round(
            (new Date(to + "T00:00:00").getTime() - new Date(earliest + "T00:00:00").getTime()) /
              86_400_000,
          ),
        )
      : 0;

  const availableRanges = useMemo(() => {
    const keys: RangeKey[] = [];
    if (spanDays >= 25) keys.push("1M");
    if (spanDays >= 80) keys.push("3M");
    if (spanDays >= 150) keys.push("6M");
    if (spanDays >= 300) keys.push("1Y");
    keys.push("ALL");
    return keys;
  }, [spanDays]);

  const filteredSnapshots = useMemo(() => {
    if (range === "ALL") return snapshots;
    const start = startForRange(range, earliest);
    return snapshots.filter((s) => s.date >= start);
  }, [snapshots, range, earliest]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DCE4DF]">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#121A15] text-[#22C55E]">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-sans text-base font-bold text-[#141C16]">
              Portfolio Performance
            </h3>
            <p className="font-sans text-xs text-[#6C7A70]">
              Historical valuation curve & invested baseline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-2xl bg-[#EFF3F0] p-1 border border-[#DCE4DF]">
          {availableRanges.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={`rounded-xl px-2.5 py-1 font-sans text-xs font-semibold transition-all ${
                range === key
                  ? "bg-[#121A15] text-white shadow-xs"
                  : "text-[#6C7A70] hover:text-[#141C16]"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-[22px] bg-[#EFF3F0]" />
      ) : isError ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-700 space-y-2">
          <p>Failed to load performance chart records.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 rounded-xl bg-rose-100 px-3 py-1 font-sans font-bold"
          >
            <RefreshCcw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        </div>
      ) : filteredSnapshots.length < 2 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#6C7A70]">
          <p className="font-sans text-xs">
            Performance chart will appear once multiple valuation dates are recorded.
          </p>
        </div>
      ) : (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredSnapshots} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8E4" />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                stroke="#95A59B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#95A59B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-2xl border border-[#DCE4DF] bg-white p-3 shadow-lg font-sans text-xs">
                      <p className="font-bold text-[#141C16]">{formatAxisDate(item.date)}</p>
                      <p className="text-[#22C55E] font-semibold mt-1">
                        Value: {formatInr(item.current_value)}
                      </p>
                      <p className="text-[#6C7A70]">
                        Invested: {formatInr(item.total_invested)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="current_value"
                stroke="#22C55E"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#valGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
