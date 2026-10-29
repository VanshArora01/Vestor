import { useState } from "react";
import { CurrencyInput } from "../common/CurrencyInput";
import { SliderControl } from "../common/SliderControl";
import { calculateSipReturns } from "../../utils/calculations";
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
import { ShieldAlert, Layers } from "lucide-react";

export function SipCalculator() {
  const [monthlySip, setMonthlySip] = useState<number>(5000);
  const [expectedRate, setExpectedRate] = useState<number>(12);
  const [years, setYears] = useState<number>(15);

  const result = calculateSipReturns(monthlySip, expectedRate, years);

  const chartData = result.schedule.map((pt) => ({
    year: `Yr ${pt.year}`,
    invested: pt.totalInvested,
    returns: pt.estimatedReturns,
    total: pt.estimatedCorpus,
  }));

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h3 className="font-display text-lg font-semibold text-ink-950">
          Systematic Investment Plan (SIP) Simulator
        </h3>
        <p className="text-xs text-ink-500">
          Model regular monthly investing, rupee-cost averaging, and long-term equity compounding.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-5 lg:col-span-5">
          <CurrencyInput
            label="Monthly SIP Amount"
            value={monthlySip}
            onChange={setMonthlySip}
            min={500}
            max={200000}
            step={1000}
            quickIncrements={[2500, 5000]}
            helperText="The fixed installment debited automatically each month."
          />

          <SliderControl
            label="Expected Annual Return (Hypothetical)"
            value={expectedRate}
            onChange={setExpectedRate}
            min={6}
            max={18}
            unit="%"
            presets={[
              { label: "Cons (9%)", value: 9 },
              { label: "Nifty 50 (12%)", value: 12 },
              { label: "Aggr (14%)", value: 14 },
            ]}
            helperText="Indian broad equity indices (Nifty 50) have historically averaged 11-13% CAGR over 15+ years."
          />

          <SliderControl
            label="Investment Tenure"
            value={years}
            onChange={setYears}
            min={1}
            max={30}
            unit=" Yrs"
            presets={[
              { label: "5y", value: 5 },
              { label: "15y", value: 15 },
              { label: "25y", value: 25 },
            ]}
            helperText="Equity SIPs require at least 5 to 7 years to smooth out market downturns."
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5 text-xs text-ink-700">
            <div className="flex items-center gap-1.5 font-semibold text-ink-900">
              <Layers className="h-4 w-4 text-accent" />
              <span>Rupee-Cost Averaging at Work:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-ink-500">
              Over {years} years, you will complete {years * 12} automatic purchase cycles, buying
              more units when market NAVs are discounted and fewer when expensive.
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
                <span className="text-[10px] text-ink-500">{years * 12} installments</span>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <span className="text-[11px] font-semibold text-emerald-800 block">
                  Estimated Returns
                </span>
                <span className="font-display text-base sm:text-lg font-bold text-emerald-900 mt-1 block">
                  +{formatInr(result.estimatedReturns)}
                </span>
                <span className="text-[10px] text-emerald-700">Wealth generated</span>
              </div>

              <div className="rounded-xl border border-accent/40 bg-teal-50/60 p-3">
                <span className="text-[11px] font-bold text-accent block">Total Corpus</span>
                <span className="font-display text-base sm:text-lg font-bold text-ink-950 mt-1 block">
                  {formatInr(result.totalCorpus)}
                </span>
                <span className="text-[10px] font-semibold text-accent">
                  {result.wealthMultiplier}x multiple
                </span>
              </div>
            </div>

            {/* Growth Chart */}
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorInvestedSip" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748B" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#64748B" stopOpacity={0.1} />
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
                      name === "returns" ? "Capital Growth" : "Invested Out of Pocket",
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
                    fill="url(#colorInvestedSip)"
                  />
                  <Area
                    type="monotone"
                    dataKey="returns"
                    stackId="1"
                    stroke="#0F766E"
                    fill="url(#colorReturns)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regulatory Disclaimer */}
          <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-3 mt-4 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
            <p className="text-[10px] leading-relaxed text-slate-600">
              <strong>Statutory Disclosure:</strong> Mutual fund investments are subject to market
              risks. Read all scheme-related documents carefully. All figures are based on
              hypothetical assumed rates for educational purposes and do not represent guaranteed
              returns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
