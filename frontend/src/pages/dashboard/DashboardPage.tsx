import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { getAggregatedBalances, getAllTransactions } from "../../api/banking";
import { Skeleton } from "../../components/ui/Skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import { useMoneyMonth } from "../../features/money/hooks/useMoneyMonth";
import { useGoals } from "../../features/goals/hooks/useGoals";
import { useInvestDashboard } from "../../features/invest/hooks/useInvest";
import { formatInr } from "../../features/invest/utils/format";
import { useRegisterPageContext } from "../../context/PageContext";

import {
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Plus,
  Calendar,
  Utensils,
  Receipt,
  Target,
} from "lucide-react";

export function DashboardPage() {
  const navigate = useNavigate();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [hideBalance, setHideBalance] = useState(false);

  // Queries
  const { monthState, isLoading: moneyLoading } = useMoneyMonth(year, month);
  const { data: goalsData, isLoading: goalsLoading } = useGoals(false);
  const { data: aggregatedBalances, isLoading: balancesLoading } = useQuery({
    queryKey: ["aggregated-balances"],
    queryFn: getAggregatedBalances,
  });
  const { data: transactions = [], isLoading: transactionsLoading, isError: transactionsError } = useQuery({
    queryKey: ["all-transactions"],
    queryFn: () => getAllTransactions(50),
  });
  const { summary: investSummary, isLoading: investLoading } = useInvestDashboard(year, month);

  useEffect(() => {
    document.title = "Overview · Vestor AI";
  }, []);

  const overallLoading = moneyLoading || goalsLoading || investLoading || balancesLoading || transactionsLoading;

  // Real calculations
  const portfolioVal = Number(investSummary?.current_value ?? investSummary?.total_invested ?? 0);
  const emergencySaved = Number(goalsData?.goals?.find((g) => g.goal_type === "emergency_fund")?.current_amount ?? 0);
  const savingsSaved = Number(goalsData?.goals?.find((g) => g.goal_type === "savings")?.current_amount ?? 0);
  const mainSpendingCash = Number(aggregatedBalances?.main_spending_balance ?? monthState?.metrics?.money_available ?? 0);

  const totalBalance = mainSpendingCash + savingsSaved + emergencySaved + portfolioVal;

  const monthlyIncome = Number(monthState?.metrics?.income ?? 0);
  const monthlyExpenses = Number(monthState?.metrics?.spending_total ?? 0);
  const monthlySavings = Number(monthState?.metrics?.allocated_total ?? (monthlyIncome > monthlyExpenses ? monthlyIncome - monthlyExpenses : 0));

  // Spending categories for donut
  const spendingList = monthState?.spending ?? [];
  const totalSpent = monthlyExpenses;

  // Exact FinAI Donut Colors: Obsidian Black, Neon Mint Green, Soft Pastel Mint, Slate 700, Slate 400
  const donutColors = ["#121A15", "#22C55E", "#86EFAC", "#374151", "#9CA3AF"];
  const chartData = spendingList.filter((s) => Number(s.amount) > 0).length > 0
    ? spendingList.filter((s) => Number(s.amount) > 0).slice(0, 5).map((s, i) => ({
        name: s.category_name,
        value: Number(s.amount),
        color: donutColors[i % donutColors.length],
      }))
    : [];

  const topCategoryName = chartData[0]?.name || "No spending yet";
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.transaction_timestamp).getTime() - new Date(a.transaction_timestamp).getTime())
    .slice(0, 3);

  useRegisterPageContext({
    page: "dashboard",
    route_title: "Financial Overview",
    metadata: {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
    },
    suggestedPrompts: [
      "Explain my spending breakdown",
      "How can I cut expenses on my top category?",
      "Am I saving enough of my monthly income?",
    ],
  });

  if (overallLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <Skeleton className="h-44 rounded-[26px]" />
          <Skeleton className="h-44 rounded-[26px]" />
          <Skeleton className="h-44 rounded-[26px]" />
          <Skeleton className="h-44 rounded-[26px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-72 rounded-[26px] lg:col-span-2" />
          <Skeleton className="h-72 rounded-[26px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* ── ROW 1: 4 Metric Cards (FinAI Top Grid) ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        
        {/* Total Balance Card (Pitch Obsidian Black Card #121A15) */}
        <div className="rounded-[26px] bg-[#121A15] p-6 text-white shadow-[0_12px_32px_-8px_rgba(18,26,21,0.35)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/70">
            <span className="font-sans text-xs font-medium">Total Balance</span>
            <button
              type="button"
              onClick={() => setHideBalance(!hideBalance)}
              className="text-white/80 hover:text-white transition-colors"
            >
              {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="py-2.5">
            <div className="font-sans text-3xl lg:text-[34px] font-bold text-white tracking-tight tabular-nums">
              {hideBalance ? "••••••••" : formatInr(totalBalance)}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-[11px] text-white/60">Across linked accounts and investments</span>
          </div>
        </div>

        {/* Monthly Income Card (Pure White #FFFFFF) */}
        <div className="rounded-[26px] bg-white border border-[#DCE4DF] p-6 shadow-[0_4px_20px_-4px_rgba(20,28,22,0.04)] text-[#141C16] flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#DCFCE7] text-[#22C55E]">
              <ArrowDownLeft className="h-3 w-3" />
            </div>
            <span className="font-sans text-xs font-semibold text-[#6C7A70]">Monthly Income</span>
          </div>

          <div className="py-2.5">
            <div className="font-sans text-2xl lg:text-3xl font-bold text-[#141C16] tracking-tight tabular-nums">
              {formatInr(monthlyIncome)}
            </div>
          </div>

          <p className="pt-1 text-[11px] text-[#6C7A70]">Confirmed for this month</p>
        </div>

        {/* Monthly Expenses Card (Pure White #FFFFFF) */}
        <div className="rounded-[26px] bg-white border border-[#DCE4DF] p-6 shadow-[0_4px_20px_-4px_rgba(20,28,22,0.04)] text-[#141C16] flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[#EF4444]">
              <ArrowUpRight className="h-3 w-3" />
            </div>
            <span className="font-sans text-xs font-semibold text-[#6C7A70]">Monthly Expenses</span>
          </div>

          <div className="py-2.5">
            <div className="font-sans text-2xl lg:text-3xl font-bold text-[#141C16] tracking-tight tabular-nums">
              {formatInr(monthlyExpenses)}
            </div>
          </div>

          <p className="pt-1 text-[11px] text-[#6C7A70]">Recorded for this month</p>
        </div>

        {/* Monthly Savings Card (Pure White #FFFFFF) */}
        <div className="rounded-[26px] bg-white border border-[#DCE4DF] p-6 shadow-[0_4px_20px_-4px_rgba(20,28,22,0.04)] text-[#141C16] flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#DCFCE7] text-[#22C55E]">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="font-sans text-xs font-semibold text-[#6C7A70]">Monthly Savings</span>
          </div>

          <div className="py-2.5">
            <div className="font-sans text-2xl lg:text-3xl font-bold text-[#141C16] tracking-tight tabular-nums">
              {formatInr(monthlySavings)}
            </div>
          </div>

          <p className="pt-1 text-[11px] text-[#6C7A70]">Based on this month’s plan</p>
        </div>
      </div>

      {/* ── ROW 2: Spending Overview (White) + AI Smart Insight (Pitch Black) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Spending Overview (Donut Chart & Breakdown Table) — 8 cols */}
        <div className="lg:col-span-8 rounded-[26px] bg-white border border-[#DCE4DF] p-6 shadow-[0_4px_20px_-4px_rgba(20,28,22,0.04)] text-[#141C16] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-[#DCE4DF]">
            <div>
              <span className="font-sans text-xs font-semibold text-[#6C7A70]">Spending Overview</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xs text-[#6C7A70]">Total spent</span>
                <span className="font-sans text-2xl font-bold text-[#141C16] tabular-nums">
                  {formatInr(totalSpent)}
                </span>
              </div>
            </div>

            <span className="rounded-full bg-[#EFF3F0] px-3.5 py-1 font-sans text-xs font-medium text-[#6C7A70]">This month</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-6">
            {/* Donut Chart with Center Text */}
            <div className="md:col-span-5 relative flex items-center justify-center">
              {chartData.length ? <div className="h-48 w-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={84}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                  <span className="font-sans text-[11px] text-[#6C7A70]">Top Category</span>
                  <span className="font-sans text-xs font-bold text-[#141C16] leading-tight truncate max-w-[100px]">
                    {topCategoryName}
                  </span>
                </div>
              </div> : <p className="max-w-44 text-center text-xs leading-relaxed text-[#6C7A70]">Category totals will appear when you record spending.</p>}
            </div>

            {/* Category Breakdown Table */}
            <div className="md:col-span-7 space-y-2.5">
              {chartData.map((cat, i) => {
                const pct = totalSpent > 0 ? Math.round((cat.value / totalSpent) * 100) : 0;
                return (
                  <div key={i} className="flex items-center justify-between text-xs font-sans">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-[#141C16] font-medium truncate">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-6 tabular-nums font-semibold">
                      <span className="text-[#141C16]">{formatInr(cat.value)}</span>
                      <span className="text-[#6C7A70] w-8 text-right font-normal">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Smart Insight Pitch Black Card (#121A15) — 4 cols */}
        <div className="lg:col-span-4 rounded-[26px] bg-[#121A15] p-6 text-white shadow-[0_12px_32px_-8px_rgba(18,26,21,0.35)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#22C55E]" />
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-white">Spending snapshot</span>
            </div>

            <div className="space-y-2">
              <h3 className="font-sans text-lg font-bold text-white leading-snug">
                {totalSpent > 0 ? `You’ve recorded ${formatInr(totalSpent)} in spending this month.` : "Your spending overview will appear here."}
              </h3>
              <p className="font-sans text-xs text-white/70 leading-relaxed">
                {chartData.length > 0 ? `${topCategoryName} is your highest recorded category. Review your transactions and categories in Money.` : "Add or review transactions to see a category breakdown based on your activity."}
              </p>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              onClick={() => navigate("/money")}
              className="w-full rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] py-3.5 font-sans text-xs font-bold text-[#121A15] transition-all text-center shadow-md shadow-[#22C55E]/20"
            >
              Review Money
            </button>
          </div>
        </div>
      </div>

      {/* ── ROW 3: AI Recommendations + Quick Actions ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* AI Recommendations (White Card with 3 Grey Tiles) — 8 cols */}
        <div className="lg:col-span-8 rounded-[26px] bg-white border border-[#DCE4DF] p-6 shadow-[0_4px_20px_-4px_rgba(20,28,22,0.04)] text-[#141C16] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#22C55E]" />
            <span className="font-sans text-xs font-bold text-[#141C16]">Next steps</span>
            </div>
            <Link to="/learn" className="text-xs font-semibold text-[#6C7A70] hover:text-[#141C16]">
              View All
            </Link>
          </div>

          {/* 3 Interactive Recommendation Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div
              onClick={() => navigate("/money")}
              className="rounded-2xl border border-[#DCE4DF] bg-[#EFF3F0] p-4 hover:border-[#22C55E]/60 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#DCE4DF] text-[#121A15]">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-sans text-xs font-bold text-[#141C16]">Review your Money plan</h4>
                <p className="font-sans text-[11px] text-[#6C7A70]">See income, allocations, and spending for this month.</p>
              </div>
            </div>

            <div
              onClick={() => navigate("/money")}
              className="rounded-2xl border border-[#DCE4DF] bg-[#EFF3F0] p-4 hover:border-[#22C55E]/60 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#DCE4DF] text-[#121A15]">
                <Utensils className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-sans text-xs font-bold text-[#141C16]">{chartData.length ? `Review ${topCategoryName}` : "Review transactions"}</h4>
                <p className="font-sans text-[11px] text-[#6C7A70]">{chartData.length ? "See the activity behind this category." : "Categorize activity to build your spending view."}</p>
              </div>
            </div>

            <div
              onClick={() => navigate("/goals")}
              className="rounded-2xl border border-[#DCE4DF] bg-[#EFF3F0] p-4 hover:border-[#22C55E]/60 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#DCE4DF] text-[#121A15]">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-sans text-xs font-bold text-[#141C16]">Set a savings goal</h4>
                <p className="font-sans text-[11px] text-[#6C7A70]">Create a goal to track progress over time.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions (White Card with 4 Grey Tiles) — 4 cols */}
        <div className="lg:col-span-4 rounded-[26px] bg-white border border-[#DCE4DF] p-6 shadow-[0_4px_20px_-4px_rgba(20,28,22,0.04)] text-[#141C16] flex flex-col justify-between space-y-4">
          <span className="font-sans text-xs font-bold text-[#141C16]">Quick Actions</span>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Money plan", icon: Send, to: "/money" },
              { label: "Accounts", icon: Plus, to: "/accounts" },
              { label: "Income", icon: ArrowDownLeft, to: "/money" },
              { label: "Goals", icon: Calendar, to: "/goals" },
            ].map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={() => navigate(action.to)}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#EFF3F0] border border-[#DCE4DF] hover:bg-white hover:border-[#22C55E]/50 transition-all text-center gap-1.5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[#22C55E]">
                  <action.icon className="h-3.5 w-3.5" />
                </div>
                <span className="font-sans text-[10px] font-semibold text-[#141C16] leading-tight truncate w-full">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 4: Recent Transactions (White Card with 3 Rows) ── */}
      <div className="rounded-[26px] bg-white border border-[#DCE4DF] p-6 shadow-[0_4px_20px_-4px_rgba(20,28,22,0.04)] text-[#141C16] space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs font-bold text-[#141C16]">Recent Transactions</span>
          <Link to="/money" className="text-xs font-semibold text-[#6C7A70] hover:text-[#141C16]">
            View All
          </Link>
        </div>

        {transactionsError ? <p className="rounded-2xl bg-rose-50 px-4 py-6 text-center text-sm text-rose-700">Recent transactions couldn’t load. Try again shortly.</p> : recentTransactions.length ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentTransactions.map((tx) => {
              const incoming = tx.transaction_type === "CREDIT";
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#EFF3F0] border border-[#DCE4DF]">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ${incoming ? "text-[#16A34A]" : "text-[#6C7A70]"}`}>
                      {incoming ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-sans text-xs font-bold text-[#141C16]">{tx.merchant_name || tx.narration || "Bank transaction"}</p>
                      <p className="font-sans text-[11px] text-[#6C7A70]">{new Date(tx.transaction_timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 font-sans text-xs font-bold tabular-nums ${incoming ? "text-[#16A34A]" : "text-[#EF4444]"}`}>{incoming ? "+" : "−"}{formatInr(tx.amount)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl bg-[#EFF3F0] px-4 py-6 text-center text-sm text-[#6C7A70]">No transactions recorded yet. Connect an account or add activity to see it here.</p>
        )}
      </div>
    </div>
  );
}
