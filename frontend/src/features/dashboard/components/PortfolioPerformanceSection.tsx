import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { useInvestPerformance } from "../../invest/hooks/useInvest";
import { formatInr, formatSignedInr, formatSignedPercent, toneClass, toneForNumber, toIsoDate } from "../../invest/utils/format";

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

interface PortfolioPerformanceSectionProps {
  portfolioValue: number;
  absoluteGainLoss: number | null;
  returnPct: number | null;
}

export function PortfolioPerformanceSection({
  portfolioValue,
  absoluteGainLoss,
  returnPct,
}: PortfolioPerformanceSectionProps) {
  const [range, setRange] = useState<RangeKey>("ALL");
  const to = toIsoDate(new Date());
  
  const { data, isLoading, isError, refetch } = useInvestPerformance("2000-01-01", to);

  const snapshots = data?.snapshots ?? [];
  const earliest = snapshots[0]?.date ?? null;
  
  const spanDays = useMemo(() => {
    if (!earliest) return 0;
    const diff = new Date(to + "T00:00:00").getTime() - new Date(earliest + "T00:00:00").getTime();
    return Math.max(0, Math.round(diff / 86_400_000));
  }, [earliest, to]);

  const availableRanges = useMemo(() => {
    const keys: RangeKey[] = [];
    if (spanDays >= 25) keys.push("1M");
    if (spanDays >= 80) keys.push("3M");
    if (spanDays >= 150) keys.push("6M");
    if (spanDays >= 330) keys.push("1Y");
    if (snapshots.length > 0) keys.push("ALL");
    return keys;
  }, [spanDays, snapshots.length]);

  const activeRange = availableRanges.includes(range)
    ? range
    : (availableRanges[availableRanges.length - 1] ?? "ALL");

  const chartData = useMemo(() => {
    const from = startForRange(activeRange, earliest);
    return snapshots
      .filter((s) => s.date >= from && s.total_value != null)
      .map((s) => ({
        date: s.date,
        value: Number(s.total_value),
        invested: Number(s.total_invested),
        gain: s.absolute_gain_loss != null ? Number(s.absolute_gain_loss) : null,
        label: formatAxisDate(s.date),
      }));
  }, [snapshots, activeRange, earliest]);

  const gainTone = toneForNumber(absoluteGainLoss);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="journey-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="journey-title" className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
            Your Wealth Journey
          </h2>
          
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <p className="font-display text-3xl font-semibold tabular-nums tracking-tight text-ink-950">
              {formatInr(portfolioValue)}
            </p>
            {absoluteGainLoss !== null && absoluteGainLoss !== 0 ? (
              <div className={`flex items-center gap-1 text-xs font-semibold ${toneClass(gainTone)}`}>
                {gainTone === "up" ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span className="tabular-nums">
                  {formatSignedInr(absoluteGainLoss)} ({formatSignedPercent(returnPct)})
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {availableRanges.length > 0 ? (
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Performance snapshots range selection">
            {availableRanges.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeRange === key}
                onClick={() => setRange(key)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30 ${
                  activeRange === key
                    ? "bg-ink-950 text-white"
                    : "text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="h-64 w-full sm:h-72">
        {isLoading ? (
          <div className="h-full animate-pulse rounded-xl bg-slate-100/70" />
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-ink-500">
            <p>Performance data couldn&apos;t be loaded.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="font-semibold text-accent underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        ) : chartData.length < 2 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-ink-950">Your wealth history is just getting started</h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-500">
              Daily snapshots will build your investment journey over time. Add holdings to establish your portfolio baselines.
            </p>
            
            {/* Timeline progress tracker */}
            <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-semibold text-ink-500">
              <div className="flex items-center gap-1.5 text-accent">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span>First snap</span>
              </div>
              <span className="h-[1px] w-8 bg-slate-200" />
              <div className="flex items-center gap-1.5 opacity-60">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span>More snaps</span>
              </div>
              <span className="h-[1px] w-8 bg-slate-200" />
              <div className="flex items-center gap-1.5 opacity-60">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span>Unlock chart</span>
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="wealthJourneyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F766E" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#0F766E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F8FAFC" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("en-IN", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v)
                }
              />
              <Tooltip
                cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const row = payload[0].payload as {
                    date: string;
                    value: number;
                    gain: number | null;
                  };
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
                      <p className="font-semibold text-ink-500">
                        {new Date(row.date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="mt-1 font-display text-sm font-semibold tabular-nums text-ink-950">
                        {formatInr(row.value)}
                      </p>
                      {row.gain != null ? (
                        <p className={`mt-0.5 font-medium tabular-nums ${row.gain >= 0 ? 'text-teal-700' : 'text-red-700'}`}>
                          Gain {formatSignedInr(row.gain)}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0F766E"
                strokeWidth={2}
                fill="url(#wealthJourneyFill)"
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, fill: "#0F766E", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
