import { useState } from "react";
import { CurrencyInput } from "../common/CurrencyInput";
import { SliderControl } from "../common/SliderControl";
import { calculateCompoundGrowth } from "../../utils/calculations";
import { formatInr } from "../../../invest/utils/format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Clock } from "lucide-react";

export function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState<number>(25000);
  const [monthlyAddition, setMonthlyAddition] = useState<number>(5000);
  const [annualRate, setAnnualRate] = useState<number>(10);
  const [years, setYears] = useState<number>(20);
  const [frequency, setFrequency] = useState<1 | 12>(12);

  const result = calculateCompoundGrowth(principal, monthlyAddition, annualRate, years, frequency);

  // Downsample schedule for charting clarity if years > 20
  const chartData = result.schedule.map((pt) => ({
    year: `Yr ${pt.year}`,
    invested: pt.totalInvested,
    interest: pt.interestEarned,
    total: pt.compoundValue,
  }));

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-950">
            Compound Growth & Time Horizon Simulator
          </h3>
          <p className="text-xs text-ink-500">
            Visualize how exponential interest overtakes invested principal over long decades.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <span className="text-[11px] font-semibold text-ink-500 px-1">Compounding:</span>
          <button
            type="button"
            onClick={() => setFrequency(12)}
            className={`rounded-md px-2 py-0.5 text-xs font-semibold transition ${
              frequency === 12
                ? "bg-white text-ink-950 shadow-xs"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setFrequency(1)}
            className={`rounded-md px-2 py-0.5 text-xs font-semibold transition ${
              frequency === 1
                ? "bg-white text-ink-950 shadow-xs"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            Annual
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-5 lg:col-span-5">
          <CurrencyInput
            label="Initial Lump Sum Principal"
            value={principal}
            onChange={setPrincipal}
            min={0}
            max={5000000}
            step={5000}
            quickIncrements={[10000, 50000]}
            helperText="Starting money you have right now."
          />

          <CurrencyInput
            label="Monthly Recurring Contribution"
            value={monthlyAddition}
            onChange={setMonthlyAddition}
            min={0}
            max={200000}
            step={1000}
            quickIncrements={[2500, 5000]}
            helperText="Amount added every single month without fail."
          />

          <SliderControl
            label="Assumed Annual Return (Hypothetical)"
            value={annualRate}
            onChange={setAnnualRate}
            min={4}
            max={18}
            unit="%"
            presets={[
              { label: "FD (6%)", value: 6 },
              { label: "Bal (9%)", value: 9 },
              { label: "Eq (12%)", value: 12 },
            ]}
            helperText="Purely illustrative. Actual market investments fluctuate year-to-year."
          />

          <SliderControl
            label="Time Horizon"
            value={years}
            onChange={setYears}
            min={3}
            max={35}
            unit=" Yrs"
            presets={[
              { label: "10y", value: 10 },
              { label: "20y", value: 20 },
              { label: "30y", value: 30 },
            ]}
            helperText="The duration your money remains untouched to compound."
          />

          <div className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-3.5 flex items-start gap-2.5 text-xs">
            <Clock className="h-4 w-4 shrink-0 text-accent mt-0.5" />
            <p className="text-teal-900 leading-relaxed">
              <strong>Rule of 72:</strong> At your assumed rate of {annualRate}%, your money
              doubles approximately every <strong>{(72 / annualRate).toFixed(1)} years</strong>.
            </p>
          </div>
        </div>

        {/* Output & Chart Column */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/40 p-5 lg:col-span-7">
          <div>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="text-[11px] font-semibold text-ink-500 block">Total Invested</span>
                <span className="font-display text-base sm:text-lg font-bold text-ink-950 mt-1 block">
                  {formatInr(result.totalInvested)}
                </span>
                <span className="text-[10px] text-ink-500">Your out-of-pocket</span>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <span className="text-[11px] font-semibold text-emerald-800 block">
                  Compound Gains
                </span>
                <span className="font-display text-base sm:text-lg font-bold text-emerald-900 mt-1 block">
                  +{formatInr(result.totalGains)}
                </span>
                <span className="text-[10px] text-emerald-700">Money made on money</span>
              </div>

              <div className="rounded-xl border border-accent/40 bg-teal-50/60 p-3">
                <span className="text-[11px] font-bold text-accent block">Estimated Future Value</span>
                <span className="font-display text-base sm:text-lg font-bold text-ink-950 mt-1 block">
                  {formatInr(result.futureValue)}
                </span>
                <span className="text-[10px] font-semibold text-accent">
                  {result.multiplier}x wealth multiplier
                </span>
              </div>
            </div>

            {/* Growth Chart */}
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      formatInr(val ?? 0),
                      name === "interest" ? "Compound Gains" : "Capital Invested",
                    ]}
                    contentStyle={{
                      backgroundColor: "#0B1220",
                      borderColor: "#1E293B",
                      color: "#F8FAFC",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#F8FAFC" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="invested"
                    stackId="1"
                    stroke="#64748B"
                    fill="url(#colorInvested)"
                  />
                  <Area
                    type="monotone"
                    dataKey="interest"
                    stackId="1"
                    stroke="#0F766E"
                    fill="url(#colorInterest)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 text-[11px] text-ink-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                Capital Invested
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                Compound Interest Gains
              </span>
            </div>
            <span className="italic">*Purely educational illustration. Returns not guaranteed.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
