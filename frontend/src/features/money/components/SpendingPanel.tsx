import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  BusFront,
  CircleDollarSign,
  HeartPulse,
  House,
  ReceiptText,
  ShoppingBag,
  Utensils,
  WalletCards,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { getApiErrorMessage } from "../../../api/client";
import { motion, useReducedMotion } from "framer-motion";
import type { MonthlyTransactionAnalysis } from "../../../api/banking";
import { Button } from "../../../components/ui/Button";
import { MoneyAmount } from "../../../components/ui/MoneyAmount";
import { AddCategoryForm, CategoryRowMenu } from "./CategoryControls";
import { DonutChart, type DonutSlice } from "./DonutChart";
import type { MoneyCategory, MonthMetrics, SpendingLine } from "../../../types/money";
import { getCategoryColor } from "../utils/categoryColors";
import { formatCurrency } from "../utils/format";

interface SpendingPanelProps {
  categories: MoneyCategory[];
  spending: SpendingLine[];
  metrics: MonthMetrics;
  income: string | null;
  isLocked: boolean;
  transactionSummary?: MonthlyTransactionAnalysis | null;
  onAnalyzeTransactions: () => void;
  isAnalyzingTransactions: boolean;
  analysisError?: string;
  activeCategory?: string | null;
  onCategorySelect?: (category: string | null) => void;
  onSave: (items: Array<{ category_id: string; amount: string }>) => Promise<unknown>;
  onCreateCategory: (payload: { name: string }) => Promise<MoneyCategory>;
  onRenameCategory: (categoryId: string, name: string) => Promise<unknown>;
  onHideCategory: (categoryId: string) => Promise<unknown>;
}

function mergeEditableCategories(categories: MoneyCategory[], spending: SpendingLine[]): MoneyCategory[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  for (const line of spending) {
    if (byId.has(line.category_id)) continue;
    byId.set(line.category_id, {
      id: line.category_id,
      name: line.category_name,
      slug: line.category_slug,
      scope: "spending",
      is_system: false,
      is_others: line.is_others,
      is_custom: line.is_custom ?? true,
      is_active: line.is_active ?? false,
      semantic_type: null,
    });
  }
  return Array.from(byId.values());
}

function categoryIcon(name: string): LucideIcon {
  const value = name.toLowerCase();
  if (/food|grocery|restaurant|dining/.test(value)) return Utensils;
  if (/rent|home|housing/.test(value)) return House;
  if (/transport|travel|fuel|commute/.test(value)) return BusFront;
  if (/health|medical|pharmacy/.test(value)) return HeartPulse;
  if (/education|book|course/.test(value)) return BookOpen;
  if (/utility|electric|water|internet|bill/.test(value)) return Zap;
  if (/saving|investment|mutual|stock|sip/.test(value)) return WalletCards;
  if (/shopping|personal/.test(value)) return ShoppingBag;
  if (/income|salary/.test(value)) return CircleDollarSign;
  if (/business|work/.test(value)) return BriefcaseBusiness;
  return ReceiptText;
}

function spendingBucket(name: string): "needs" | "wants" | "savings" {
  const value = name.toLowerCase();
  if (/saving|investment|mutual fund|stock|sip|deposit/.test(value)) return "savings";
  if (/rent|home|housing|food|grocery|transport|fuel|commute|utility|electric|water|internet|bill|health|medical|insurance|education|loan|emi/.test(value)) return "needs";
  return "wants";
}

export function SpendingPanel({
  categories,
  spending,
  metrics,
  income,
  isLocked,
  transactionSummary,
  onAnalyzeTransactions,
  isAnalyzingTransactions,
  analysisError,
  activeCategory = null,
  onCategorySelect,
  onSave,
  onCreateCategory,
  onRenameCategory,
  onHideCategory,
}: SpendingPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const editableCategories = useMemo(() => mergeEditableCategories(categories, spending), [categories, spending]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const category of editableCategories) {
      next[category.id] = spending.find((item) => item.category_id === category.id)?.amount ?? "";
    }
    setAmounts(next);
  }, [editableCategories, spending]);

  const totalSpent = transactionSummary
    ? Number(transactionSummary.total_recorded_ordinary_debits)
    : Number(metrics.spending_total ?? 0);
  const chartData = useMemo<DonutSlice[]>(() => {
    const lines = transactionSummary
      ? (Array.isArray(transactionSummary.category_totals) ? transactionSummary.category_totals : []).map((item) => ({ name: item.category, value: Number(item.amount), count: item.count }))
      : spending.map((item) => ({ name: item.category_name, value: Number(item.amount ?? 0), count: null as number | null }));
    const rows = lines.filter((item) => item.value > 0).map((item, index) => ({
      ...item,
      color: getCategoryColor(item.name.toLowerCase().replace(/\s+/g, "-"), index),
      percent: totalSpent > 0 ? item.value / totalSpent * 100 : 0,
    }));
    if (transactionSummary && Number(transactionSummary.uncategorized_debits) > 0 && !rows.some((item) => item.name.toLowerCase() === "uncategorised" || item.name.toLowerCase() === "uncategorized")) {
      rows.push({
        name: "Uncategorised",
        value: Number(transactionSummary.uncategorized_debits),
        count: transactionSummary.unresolved.filter((item) => item.direction.toUpperCase() === "DEBIT").length,
        color: "#94A3B8",
        percent: totalSpent > 0 ? Number(transactionSummary.uncategorized_debits) / totalSpent * 100 : 0,
      });
    }
    return rows.sort((a, b) => b.value - a.value);
  }, [spending, totalSpent, transactionSummary]);

  const buckets = chartData.reduce((total, item) => {
    const bucket = spendingBucket(item.name);
    total[bucket] += item.value;
    return total;
  }, { needs: 0, wants: 0, savings: 0 });
  const split = [
    { label: "Needs", value: buckets.needs, color: "#0F766E" },
    { label: "Wants", value: buckets.wants, color: "#14B8A6" },
    { label: "Savings", value: buckets.savings, color: "#334155" },
  ];
  const hasSpending = chartData.length > 0;
  const incomeNum = Number(income ?? 0);
  const localSpentTotal = Object.values(amounts).reduce((sum, value) => sum + (value ? Number(value) : 0), 0);
  const allocatedTotal = Number(metrics.allocated_total ?? 0);
  const localExceedsIncome = incomeNum > 0 && allocatedTotal + localSpentTotal > incomeNum + 0.01;
  const localExcess = Math.max(0, allocatedTotal + localSpentTotal - incomeNum);
  const localMoneyAvailable = Math.max(0, incomeNum - allocatedTotal - localSpentTotal);

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    try {
      await onSave(Object.entries(amounts).filter(([, amount]) => amount && Number(amount) > 0).map(([category_id, amount]) => ({ category_id, amount })));
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2200);
      setIsEditing(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save spending"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateCategory(payload: { name: string; amount: string }) {
    const created = await onCreateCategory({ name: payload.name });
    if (payload.amount && Number(payload.amount) > 0) setAmounts((current) => ({ ...current, [created.id]: payload.amount }));
  }

  function startEditing() {
    setIsEditing(true);
    window.setTimeout(() => firstInputRef.current?.focus(), 0);
  }

  return (
    <section className="flex h-full flex-col rounded-[20px] border border-[#DCE4DF] bg-white p-5 sm:p-6" aria-labelledby="spending-heading">
      <div className="flex min-h-12 items-start justify-between gap-3 border-b border-[#DCE4DF] pb-4">
        <div><h2 id="spending-heading" className="text-base font-semibold text-[#141C16]">Spending</h2><p className="mt-0.5 text-xs text-[#52615A]">Actual spending by category</p></div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="dark" isLoading={isAnalyzingTransactions} loadingLabel="Analysing…" className="!rounded-xl !px-3.5 !py-1.5 text-xs font-semibold" onClick={onAnalyzeTransactions}>Analyse Transactions &amp; Update Spending</Button>
          {!isLocked ? <Button type="button" variant="secondary" className="!rounded-xl !px-3.5 !py-1.5 text-xs font-semibold" onClick={() => isEditing ? setIsEditing(false) : startEditing()}>{isEditing ? "Cancel" : "Update spending"}</Button> : null}
        </div>
      </div>

      {analysisError ? <p className="mt-3 text-xs text-[#B42318]" role="alert">{analysisError}</p> : null}

      {isEditing ? (
        <div className="mt-4 flex-1">
          {editableCategories.map((category, index) => <div key={category.id} className="grid grid-cols-[minmax(0,1fr)_100px_auto] items-center gap-2 border-b border-[#EFF3F0] py-2.5">
            <label htmlFor={`spending-${category.id}`} className="truncate text-sm font-medium text-[#26332C]">{category.name}{!category.is_active ? <span className="ml-1 text-xs font-normal text-[#52615A]">(hidden)</span> : null}</label>
            <input ref={index === 0 ? firstInputRef : undefined} id={`spending-${category.id}`} type="number" min="0" step="0.01" value={amounts[category.id] ?? ""} aria-label={`${category.name} amount spent`} className="min-w-0 rounded-xl border border-[#DCE4DF] px-2.5 py-2 text-right text-sm font-medium tabular-nums text-[#141C16] outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/40" onChange={(event) => setAmounts((current) => ({ ...current, [category.id]: event.target.value }))} />
            <CategoryRowMenu category={category} onRename={(name) => onRenameCategory(category.id, name)} onHide={() => onHideCategory(category.id)} />
          </div>)}
          <AddCategoryForm mode="spending" onCreate={handleCreateCategory} />
          {localExceedsIncome ? <p className="mt-3 text-sm text-[#B42318]" role="alert">Your plan and spending exceed income by {formatCurrency(String(localExcess))}.</p> : null}
          {error ? <p className="mt-3 text-sm text-[#B42318]" role="alert">{error}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="button" isLoading={isSaving} onClick={handleSave} disabled={localExceedsIncome}>Save spending</Button>{savedNotice ? <span className="text-xs text-[#166534]">Saved</span> : null}<span className="text-xs tabular-nums text-[#52615A]">{formatCurrency(String(localMoneyAvailable))} left after spending</span></div>
        </div>
      ) : !hasSpending ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center"><p className="text-sm font-medium text-[#26332C]">No spending recorded yet</p><p className="mt-1 max-w-xs text-xs leading-5 text-[#52615A]">Review transactions or add monthly spending to see a category breakdown.</p>{!isLocked ? <Button type="button" variant="secondary" className="mt-4" onClick={startEditing}>Add spending</Button> : null}</div>
      ) : (
        <div className="mt-4 flex-1">
          <p className="mb-3 text-xs font-medium text-[#52615A]">Needs, wants and savings</p>
          <div className="flex h-2 overflow-hidden rounded-full bg-[#EFF3F0]" role="img" aria-label={`Needs ${Math.round(buckets.needs / Math.max(totalSpent, 1) * 100)} percent, wants ${Math.round(buckets.wants / Math.max(totalSpent, 1) * 100)} percent, savings ${Math.round(buckets.savings / Math.max(totalSpent, 1) * 100)} percent`}>
            {split.map((item, index) => <motion.div key={item.label} initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${Math.max(0, item.value / Math.max(totalSpent, 1) * 100)}%` }} transition={{ duration: reduceMotion ? 0 : 0.7, delay: reduceMotion ? 0 : index * 0.06, ease: [0.16, 1, 0.3, 1] }} className="h-full" style={{ backgroundColor: item.color }} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#52615A]">{split.map((item) => <span key={item.label} className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label} <MoneyAmount value={item.value} /></span>)}</div>

          <div className="mt-4 grid items-center gap-3 md:grid-cols-[176px_minmax(0,1fr)]">
            <DonutChart data={chartData} centerPrimary={<MoneyAmount value={totalSpent} className="text-lg font-semibold text-[#141C16]" />} centerSecondary="Spent" percentOfLabel="spending" ariaLabel="Spending by category" activeName={hoveredCategory ?? activeCategory} onActiveNameChange={setHoveredCategory} onSliceClick={(name) => onCategorySelect?.(activeCategory === name ? null : name)} />
            <div className="min-w-0">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2 border-b border-[#EFF3F0] pb-2 text-[10px] font-medium text-[#52615A]"><span>Category</span><span className="text-right">Amount</span><span className="text-right">Share</span><span className="text-right">Count</span></div>
              <div className="max-h-48 divide-y divide-[#EFF3F0] overflow-y-auto">
                {chartData.map((item) => {
                  const Icon = categoryIcon(item.name);
                  const isActive = activeCategory === item.name;
                  return <button type="button" key={item.name} onMouseEnter={() => setHoveredCategory(item.name)} onMouseLeave={() => setHoveredCategory(null)} onFocus={() => setHoveredCategory(item.name)} onBlur={() => setHoveredCategory(null)} onClick={() => onCategorySelect?.(isActive ? null : item.name)} aria-pressed={isActive} className={`grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 py-2 text-left text-xs transition-colors ${hoveredCategory === item.name || isActive ? "bg-[#EFF3F0]" : "hover:bg-[#F8FAF8]"}`}>
                    <span className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EFF3F0] text-[#26332C]"><Icon className="h-3.5 w-3.5" /></span><span className="truncate font-medium text-[#26332C]">{item.name}</span></span>
                    <span className="text-right font-medium tabular-nums text-[#141C16]"><MoneyAmount value={item.value} /></span>
                    <span className="text-right tabular-nums text-[#52615A]">{(item.percent ?? 0).toFixed(0)}%</span>
                    <span className="min-w-5 text-right tabular-nums text-[#52615A]">{item.count ?? "—"}</span>
                  </button>;
                })}
              </div>
              {activeCategory ? <button type="button" onClick={() => onCategorySelect?.(null)} className="mt-2 text-xs font-medium text-[#0F766E] underline underline-offset-2">Clear category filter</button> : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
