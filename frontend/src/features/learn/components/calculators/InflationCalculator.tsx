import { useState } from "react";
import { CurrencyInput } from "../common/CurrencyInput";
import { SliderControl } from "../common/SliderControl";
import { calculateInflationImpact } from "../../utils/calculations";
import { formatInr } from "../../../invest/utils/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Flame } from "lucide-react";

export function InflationCalculator() {
  const [amount, setAmount] = useState<number>(50000);
  const [inflationRate, setInflationRate] = useState<number>(6.0);
  const [years, setYears] = useState<number>(15);

  const result = calculateInflationImpact(amount, inflationRate, years);

  // Milestone points for comparison: Today, Halfway, and Final Year
  const halfwayYear = Math.round(years / 2);
  const chartData = [
    {
      period: "Today (Yr 0)",
      futurePrice: amount,
      realValue: amount,
    },
    {
      period: `Yr ${halfwayYear}`,
      futurePrice: result.schedule[halfwayYear]?.futurePrice ?? amount,
      realValue: result.schedule[halfwayYear]?.realPurchasingPower ?? amount,
    },
    {
      period: `Yr ${years}`,
      futurePrice: result.futurePrice,
      realValue: result.realPurchasingPower,
    },
  ];

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h3 className="font-display text-lg font-semibold text-ink-950">
          Inflation & Purchasing Power Simulator
        </h3>
        <p className="text-xs text-ink-500">
          See how persistent price inflation shrinks purchasing power and swells future expenses.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-5 lg:col-span-5">
          <CurrencyInput
            label="Current Value / Monthly Expense"
            value={amount}
            onChange={setAmount}
            min={1000}
            max={5000000}
            step={5000}
            quickIncrements={[10000, 50000]}
            helperText="Enter an expense (e.g. monthly rent) or a cash sum saved."
          />

          <SliderControl
            label="Annual Inflation Rate (CPI)"
            value={inflationRate}
            onChange={setInflationRate}
            min={3}
            max={12}
            step={0.5}
            unit="%"
            presets={[
              { label: "RBI Target (4%)", value: 4 },
              { label: "India Avg (6%)", value: 6 },
              { label: "Education (9%)", value: 9 },
            ]}
            helperText="India's CPI historically averages 5% to 7%; specialized education/healthcare runs 8-11%."
          />

          <SliderControl
            label="Time Horizon"
            value={years}
            onChange={setYears}
            min={3}
            max={30}
            unit=" Yrs"
            presets={[
              { label: "5y", value: 5 },
              { label: "12y", value: 12 },
              { label: "20y", value: 20 },
            ]}
            helperText="The duration over which price increases compound."
          />

          <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-3.5 flex items-start gap-2.5 text-xs">
            <Flame className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p className="text-rose-950 leading-relaxed">
              <strong>Rule of 70:</strong> At {inflationRate}% inflation, the cost of living doubles
              every <strong>{result.doublingYears} years</strong>.
            </p>
          </div>
        </div>

        {/* Output & Chart Column */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/40 p-5 lg:col-span-7">
          <div>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                <span className="text-[11px] font-semibold text-amber-800 block">
                  Future Cost to Buy the Same
                </span>
                <span className="font-display text-lg sm:text-xl font-bold text-ink-950 mt-1 block">
                  {formatInr(result.futurePrice)}
                </span>
                <span className="text-[10px] text-amber-700 font-medium">
                  Requires {formatInr(result.futurePrice - amount)} more in Yr {years}
                </span>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
                <span className="text-[11px] font-semibold text-rose-800 block">
                  Real Purchasing Power of Fixed Cash
                </span>
                <span className="font-display text-lg sm:text-xl font-bold text-rose-950 mt-1 block">
                  {formatInr(result.realPurchasingPower)}
                </span>
                <span className="text-[10px] text-rose-700 font-medium">
                  Down {result.purchasingPowerLossPct}% in real goods value
                </span>
              </div>
            </div>

            {/* Comparison Bar Chart */}
            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      formatInr(val ?? 0),
                      name === "futurePrice" ? "Future Price Required" : "Real Cash Value",
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
                  <Bar
                    dataKey="futurePrice"
                    fill="#D97706"
                    radius={[4, 4, 0, 0]}
                    name="futurePrice"
                  />
                  <Bar
                    dataKey="realValue"
                    fill="#E11D48"
                    radius={[4, 4, 0, 0]}
                    name="realValue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 text-[11px] text-ink-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                Future Price of Basket
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                Real Cash Power
              </span>
            </div>
            <span className="italic">Assumes steady {inflationRate}% compounding CPI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
