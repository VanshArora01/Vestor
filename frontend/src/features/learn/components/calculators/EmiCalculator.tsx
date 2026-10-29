import { useState } from "react";
import { CurrencyInput } from "../common/CurrencyInput";
import { SliderControl } from "../common/SliderControl";
import { calculateEmi } from "../../utils/calculations";
import { formatInr } from "../../../invest/utils/format";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AlertCircle } from "lucide-react";

export function EmiCalculator() {
  const [principal, setPrincipal] = useState<number>(3000000); // 30 Lakhs
  const [interestRate, setInterestRate] = useState<number>(8.5); // Home loan baseline
  const [tenureYears, setTenureYears] = useState<number>(20);

  const result = calculateEmi(principal, interestRate, tenureYears);

  const chartData = [
    { name: "Principal Loan Amount", value: result.totalPrincipal, color: "#0F766E" },
    { name: "Total Interest Charges", value: result.totalInterest, color: "#E11D48" },
  ];

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-950">
            Equated Monthly Installment (EMI) Calculator
          </h3>
          <p className="text-xs text-ink-500">
            Compute monthly outflows, total interest burden, and the impact of loan tenure.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-ink-500 mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => {
              setPrincipal(4000000);
              setInterestRate(8.5);
              setTenureYears(20);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-ink-700 hover:bg-slate-100"
          >
            Home (8.5%, 20y)
          </button>
          <button
            type="button"
            onClick={() => {
              setPrincipal(800000);
              setInterestRate(9.5);
              setTenureYears(5);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-ink-700 hover:bg-slate-100"
          >
            Car (9.5%, 5y)
          </button>
          <button
            type="button"
            onClick={() => {
              setPrincipal(300000);
              setInterestRate(13.5);
              setTenureYears(3);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-ink-700 hover:bg-slate-100"
          >
            Personal (13.5%, 3y)
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-5 lg:col-span-5">
          <CurrencyInput
            label="Total Loan Principal"
            value={principal}
            onChange={setPrincipal}
            min={10000}
            max={20000000}
            step={50000}
            quickIncrements={[500000, 1000000]}
            helperText="The initial lump-sum amount borrowed from the lender."
          />

          <SliderControl
            label="Annual Interest Rate"
            value={interestRate}
            onChange={setInterestRate}
            min={6.0}
            max={22.0}
            step={0.25}
            unit="%"
            presets={[
              { label: "Home (8.5%)", value: 8.5 },
              { label: "Car (9.5%)", value: 9.5 },
              { label: "Personal (14%)", value: 14.0 },
            ]}
            helperText="Reducing-balance annual interest rate offered by Indian banks/NBFCs."
          />

          <SliderControl
            label="Loan Tenure"
            value={tenureYears}
            onChange={setTenureYears}
            min={1}
            max={30}
            unit=" Yrs"
            presets={[
              { label: "3y", value: 3 },
              { label: "5y", value: 5 },
              { label: "15y", value: 15 },
              { label: "20y", value: 20 },
            ]}
            helperText="Longer tenure lowers monthly EMI but significantly inflates total interest paid."
          />

          <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-3.5 flex items-start gap-2.5 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p className="text-rose-950 leading-relaxed">
              <strong>Interest Drag:</strong> Interest accounts for{" "}
              <strong>{result.interestRatioPct}%</strong> of your total repayment over {tenureYears}{" "}
              years ({formatInr(result.totalInterest)} in pure financing charges).
            </p>
          </div>
        </div>

        {/* Output & Chart Column */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/40 p-5 lg:col-span-7">
          <div>
            {/* Massive EMI Hero Badge */}
            <div className="rounded-2xl border border-accent/40 bg-teal-50/60 p-4 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent block">
                Monthly Repayment (EMI)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-3xl sm:text-4xl font-bold text-ink-950">
                  {formatInr(result.monthlyEmi)}
                </span>
                <span className="text-xs text-ink-500 font-medium">/ month for {tenureYears * 12} months</span>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <span className="text-[11px] font-semibold text-ink-500 block">Principal Borrowed</span>
                <span className="font-display text-lg font-bold text-ink-950 mt-1 block">
                  {formatInr(result.totalPrincipal)}
                </span>
                <span className="text-[10px] text-ink-500">100% of requested debt</span>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
                <span className="text-[11px] font-semibold text-rose-800 block">Total Interest Payable</span>
                <span className="font-display text-lg font-bold text-rose-950 mt-1 block">
                  +{formatInr(result.totalInterest)}
                </span>
                <span className="text-[10px] text-rose-700">Bank financing charges</span>
              </div>
            </div>

            {/* Donut Distribution */}
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val: any) => [formatInr(val ?? 0), "Amount"]}
                    contentStyle={{
                      backgroundColor: "#0B1220",
                      borderColor: "#1E293B",
                      color: "#F8FAFC",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#F8FAFC" }}
                  />
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 text-xs">
            <span className="font-semibold text-ink-700">Total Outflow (Principal + Interest):</span>
            <span className="font-display font-bold text-ink-950 text-sm">
              {formatInr(result.totalPayment)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
