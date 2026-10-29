import { useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import { Button } from "../../../components/ui/Button";
import { MoneyAmount } from "../../../components/ui/MoneyAmount";
import { motion, useReducedMotion } from "framer-motion";
import { AddCategoryForm, CategoryRowMenu } from "./CategoryControls";
import type {
  AllocationLine,
  AllocationSemanticType,
  MoneyCategory,
  MonthMetrics,
  MoneyReconciliation,
} from "../../../types/money";
import { getCategoryColor } from "../utils/categoryColors";
import { formatCurrency, formatPercent } from "../utils/format";
import { suggestPlanSplit } from "../utils/suggestPlanSplit";

interface MoneyPlanPanelProps {
  categories: MoneyCategory[];
  allocations: AllocationLine[];
  metrics: MonthMetrics;
  income: string | null;
  isLocked: boolean;
  suggestionIsPreview?: boolean;
  reconciliation: MoneyReconciliation | null;
  onSave: (
    items: Array<{ category_id?: string; goal_id?: string; amount: string }>,
    requireComplete?: boolean,
  ) => Promise<unknown>;
  onAddRemainingToOthers: () => Promise<unknown>;
  onCreateCategory: (payload: {
    name: string;
    semantic_type: AllocationSemanticType;
  }) => Promise<MoneyCategory>;
  onRenameCategory: (
    categoryId: string,
    name: string,
    semanticType?: AllocationSemanticType,
  ) => Promise<unknown>;
  onHideCategory: (categoryId: string) => Promise<unknown>;
}

function computeLocalMetrics(amounts: Record<string, string>, income: string | null) {
  const incomeNum = Number(income ?? 0);
  const allocatedTotal = Object.values(amounts).reduce(
    (sum, value) => sum + (value ? Number(value) : 0),
    0,
  );
  const remaining = incomeNum > 0 ? incomeNum - allocatedTotal : 0;
  const allocationPct = incomeNum > 0 ? (allocatedTotal / incomeNum) * 100 : 0;
  return {
    allocatedTotal,
    allocationPct,
    remaining,
    isComplete: incomeNum > 0 && Math.abs(remaining) < 0.01,
    exceedsIncome: incomeNum > 0 && allocatedTotal > incomeNum + 0.01,
  };
}

type PlanLine =
  | {
      key: string;
      lineType: "category";
      id: string;
      name: string;
      slug: string;
      isOthers: boolean;
      isCustom: boolean;
      isActive: boolean;
      semanticType: AllocationSemanticType;
      category: MoneyCategory;
    }
  | {
      key: string;
      lineType: "goal";
      id: string;
      name: string;
      slug: string;
      plannedMonthlyContribution?: string;
    };

function lineKey(line: AllocationLine): string {
  if (line.line_type === "goal" && line.goal_id) return `goal:${line.goal_id}`;
  if (line.category_id) return `cat:${line.category_id}`;
  return `unknown:${line.category_slug ?? "line"}`;
}

function mergeEditablePlanLines(
  categories: MoneyCategory[],
  allocations: AllocationLine[],
): PlanLine[] {
  const lines: PlanLine[] = [];
  const seenGoals = new Set<string>();

  for (const category of categories) {
    if (category.slug === "goals") continue;
    lines.push({
      key: `cat:${category.id}`,
      lineType: "category",
      id: category.id,
      name: category.name,
      slug: category.slug,
      isOthers: category.is_others,
      isCustom: category.is_custom,
      isActive: category.is_active,
      semanticType: category.semantic_type ?? "other",
      category,
    });
  }

  for (const allocation of allocations) {
    if (allocation.line_type === "goal" && allocation.goal_id) {
      if (allocation.is_active === false) continue;
      if (seenGoals.has(allocation.goal_id)) continue;
      seenGoals.add(allocation.goal_id);
      lines.push({
        key: `goal:${allocation.goal_id}`,
        lineType: "goal",
        id: allocation.goal_id,
        name: allocation.goal_name ?? "Goal",
        slug: allocation.category_slug ?? `goal-${allocation.goal_id}`,
        plannedMonthlyContribution: allocation.planned_monthly_contribution ?? undefined,
      });
      continue;
    }

    if (allocation.category_id && !categories.some((c) => c.id === allocation.category_id)) {
      if (allocation.category_slug === "goals") continue;
      lines.push({
        key: `cat:${allocation.category_id}`,
        lineType: "category",
        id: allocation.category_id,
        name: allocation.category_name ?? "Category",
        slug: allocation.category_slug ?? allocation.category_id,
        isOthers: allocation.is_others,
        isCustom: allocation.is_custom ?? true,
        isActive: allocation.is_active ?? false,
        semanticType: allocation.semantic_type ?? "other",
        category: {
          id: allocation.category_id,
          name: allocation.category_name ?? "Category",
          slug: allocation.category_slug ?? allocation.category_id,
          scope: "money_plan",
          is_system: false,
          is_others: allocation.is_others,
          is_custom: allocation.is_custom ?? true,
          is_active: allocation.is_active ?? false,
          semantic_type: allocation.semantic_type ?? "other",
        },
      });
    }
  }

  return lines;
}

export function MoneyPlanPanel({
  categories,
  allocations,
  metrics,
  income,
  isLocked,
  suggestionIsPreview = false,
  reconciliation,
  onSave,
  onAddRemainingToOthers,
  onCreateCategory,
  onRenameCategory,
  onHideCategory,
}: MoneyPlanPanelProps) {
  const reduceMotion = useReducedMotion();
  const [isEditing, setIsEditing] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const editablePlanLines = useMemo(
    () => mergeEditablePlanLines(categories, allocations),
    [categories, allocations],
  );

  const categoryLines = useMemo(
    () => editablePlanLines.filter((l) => l.lineType === "category"),
    [editablePlanLines],
  );

  const goalLines = useMemo(
    () => editablePlanLines.filter((l) => l.lineType === "goal"),
    [editablePlanLines],
  );

  const goalsTotal = useMemo(() => {
    return goalLines.reduce((sum, line) => {
      const val = amounts[line.key];
      return sum + (val ? Number(val) : 0);
    }, 0);
  }, [goalLines, amounts]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const line of editablePlanLines) {
      const existing = allocations.find((item) => lineKey(item) === line.key);
      next[line.key] = existing?.amount ?? "";
    }
    setAmounts(next);
  }, [editablePlanLines, allocations]);

  const local = computeLocalMetrics(amounts, income);
  const incomeNum = Number(income ?? 0);

  const reviewRows = useMemo(
    () =>
      allocations
        .filter((item) => item.amount && Number(item.amount) > 0)
        .filter((item) => item.line_type !== "goal")
        .map((item, index) => ({
          ...item,
          displayName: item.line_type === "goal" ? item.goal_name ?? "Goal" : item.category_name ?? "Category",
          rowKey: lineKey(item),
          color: getCategoryColor(item.category_slug ?? `goal-${item.goal_id}`, index),
          value: Number(item.amount),
          percent: item.percentage
            ? Number(item.percentage)
            : incomeNum > 0
              ? (Number(item.amount) / incomeNum) * 100
              : 0,
        })),
    [allocations, incomeNum],
  );

  const allocatedTotal = Number(metrics.allocated_total ?? local.allocatedTotal);
  const allocationPct = Number(metrics.allocation_percentage ?? local.allocationPct);
  const remaining = Number(metrics.remaining_allocation ?? local.remaining);
  const availableToPlan = Number(metrics.available_to_plan ?? income ?? 0);
  const suggestion = suggestPlanSplit(availableToPlan);

  function buildItems(): Array<{ category_id?: string; goal_id?: string; amount: string }> {
    const items: Array<{ category_id?: string; goal_id?: string; amount: string }> = [];
    for (const line of editablePlanLines) {
      const amount = amounts[line.key];
      if (!amount || Number(amount) <= 0) continue;
      if (line.lineType === "goal") {
        items.push({ goal_id: line.id, amount });
      } else {
        items.push({ category_id: line.id, amount });
      }
    }
    return items;
  }

  async function handleSave(requireComplete = false) {
    setError(null);
    setIsSaving(true);
    try {
      await onSave(buildItems(), requireComplete);
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2000);
      setIsEditing(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save allocation"));
    } finally {
      setIsSaving(false);
    }
  }

  async function approveSuggestion() {
    setError(null);
    setIsSaving(true);
    try {
      const buckets = [
        { name: "Needs", semantic_type: "expense" as const, amount: suggestion.needs },
        { name: "Wants", semantic_type: "expense" as const, amount: suggestion.wants },
        { name: "Savings", semantic_type: "savings" as const, amount: suggestion.savings },
      ];
      const items: Array<{ category_id: string; amount: string }> = [];
      for (const bucket of buckets) {
        const existing = categories.find((category) => category.name.trim().toLowerCase() === bucket.name.toLowerCase());
        const category = existing ?? await onCreateCategory({ name: bucket.name, semantic_type: bucket.semantic_type });
        items.push({ category_id: category.id, amount: String(bucket.amount) });
      }
      await onSave(items, false);
      setSuggestionOpen(false);
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2200);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to approve the suggested plan"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddRemaining() {
    setError(null);
    setIsSaving(true);
    try {
      await onAddRemainingToOthers();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add remaining to Others"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateCategory(payload: {
    name: string;
    amount: string;
    semantic_type?: AllocationSemanticType;
  }) {
    try {
      const created = await onCreateCategory({
        name: payload.name,
        semantic_type: payload.semantic_type ?? "other",
      });
      if (payload.amount && Number(payload.amount) > 0) {
        setAmounts((current) => ({ ...current, [created.id]: payload.amount }));
      }
    } catch (err) {
      throw new Error(getApiErrorMessage(err, "Failed to add category"));
    }
  }

  function startEditing() {
    setIsEditing(true);
    window.setTimeout(() => firstInputRef.current?.focus(), 0);
  }

  return (
    <div className="flex h-full flex-col rounded-[20px] border border-[#DCE4DF] bg-white p-5 sm:p-6">
      <div className="flex min-h-12 items-start justify-between gap-3 border-b border-[#DCE4DF] pb-4">
        <div>
          <h2 className="font-sans text-base font-semibold text-[#141C16]">Plan vs actual</h2>
          <p className="font-sans text-xs text-[#52615A] mt-0.5">What you planned beside what has been spent</p>
        </div>
        {!isLocked && !suggestionIsPreview && income ? (
          <Button
            type="button"
            variant={isEditing ? "secondary" : "dark"}
            className="!rounded-xl !px-3.5 !py-1.5 text-xs font-semibold"
            onClick={() => (isEditing ? setIsEditing(false) : startEditing())}
          >
            {isEditing ? "Cancel" : "Edit plan"}
          </Button>
        ) : null}
      </div>

      {!income ? (
        <p className="mt-8 text-center text-sm text-[#52615A]">
          Set your monthly income above to start planning.
        </p>
      ) : allocatedTotal <= 0 && !isEditing ? (
        <div className="mt-5 flex flex-1 flex-col">
          {suggestionOpen ? (
            <div className="flex flex-1 flex-col">
              <div className="divide-y divide-[#EFF3F0]">
                {[
                  { label: "Needs", pct: 50, amount: suggestion.needs },
                  { label: "Wants", pct: 30, amount: suggestion.wants },
                  { label: "Savings", pct: 20, amount: suggestion.savings },
                ].map((item) => <div key={item.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3 text-sm">
                  <span className="font-medium text-[#26332C]">{item.label}</span>
                  <span className="text-xs text-[#52615A]">{item.pct}%</span>
                  <span className="text-right font-semibold tabular-nums text-[#141C16]"><MoneyAmount value={item.amount} /></span>
                </div>)}
              </div>
              <p className="mt-3 text-xs leading-5 text-[#52615A]">This is a draft based on Available to Plan. It will be added only after approval.</p>
              {suggestionIsPreview ? <p className="mt-2 text-xs text-[#52615A]">This is a read-only preview and will not change the live plan.</p> : isLocked ? <p className="mt-2 text-xs text-[#52615A]">This month is read-only, so the draft cannot be saved.</p> : null}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                <Button type="button" isLoading={isSaving} disabled={isLocked || suggestionIsPreview} onClick={approveSuggestion}>Approve plan</Button>
                <Button type="button" variant="secondary" onClick={() => setSuggestionOpen(false)}>Dismiss</Button>
                {savedNotice ? <span className="text-xs text-[#166534]">Plan saved</span> : null}
              </div>
              {error ? <p className="mt-3 text-xs text-[#B42318]" role="alert">{error}</p> : null}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-7 text-center">
              <p className="text-sm text-[#52615A]">No plan allocations yet.</p>
              <p className="mt-1 text-xs text-[#52615A]">Available to Plan: <MoneyAmount value={availableToPlan} /></p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button type="button" variant="secondary" disabled={availableToPlan <= 0} onClick={() => setSuggestionOpen(true)}>Suggest a plan</Button>
                {!isLocked ? <Button type="button" variant="dark" onClick={startEditing}>Edit plan</Button> : null}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {!isEditing ? (
            <>
              <p className="mt-4 flex justify-between gap-2 text-xs text-[#52615A]"><span><MoneyAmount value={allocatedTotal} /> planned · {formatPercent(String(allocationPct))} of income</span><span className="tabular-nums"><MoneyAmount value={remaining} /> remaining</span></p>

              <div className="mt-4 flex-1 overflow-x-auto">
                <div className="min-w-[520px]">
                  <div className="grid grid-cols-[minmax(130px,1.4fr)_repeat(3,minmax(64px,0.8fr))_78px] gap-2 border-b border-[#EFF3F0] pb-2 text-[10px] font-medium text-[#52615A]">
                    <span>Category</span><span className="text-right">Planned</span><span className="text-right">Actual</span><span className="text-right">Remaining</span><span className="text-right">Status</span>
                  </div>
                  <div className="divide-y divide-[#EFF3F0]">
                    {reviewRows.map((row) => {
                      const reconItem = reconciliation?.items.find((item) => item.line_type === "category" && item.category_slug === row.category_slug);
                      const planned = reconItem ? Number(reconItem.planned) : Number(row.amount);
                      const actual = reconItem?.actual === null || reconItem?.actual === undefined ? null : Number(reconItem.actual);
                      const remainingRow = reconItem?.remaining === null || reconItem?.remaining === undefined ? null : Number(reconItem.remaining);
                      const over = reconItem?.status === "OVER_PLAN" || (actual !== null && actual > planned);
                      const started = actual !== null && actual > 0;
                      const progress = planned > 0 && actual !== null ? Math.min(100, Math.max(0, actual / planned * 100)) : 0;
                      const status = over ? "Over" : started ? "On track" : "Not started";
                      return <div key={row.rowKey} className="grid grid-cols-[minmax(130px,1.4fr)_repeat(3,minmax(64px,0.8fr))_78px] items-center gap-2 py-3 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} /><span className="truncate font-medium text-[#26332C]">{row.displayName}</span></div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#EFF3F0]"><motion.div initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }} className={`h-full rounded-full ${over ? "bg-[#EF4444]" : "bg-[#22C55E]"}`} /></div>
                        </div>
                        <span className="text-right font-medium tabular-nums text-[#141C16]"><MoneyAmount value={planned} /></span>
                        <span className="text-right tabular-nums text-[#26332C]"><MoneyAmount value={actual} /></span>
                        <span className="text-right tabular-nums text-[#52615A]"><MoneyAmount value={remainingRow} /></span>
                        <span className={`text-right font-medium ${over ? "text-[#B42318]" : "text-[#52615A]"}`}>{status}</span>
                      </div>;
                    })}

                    {/* Reconciliation categories that do not have a plan allocation */}
                    {reconciliation?.items
                      .filter((item) => {
                        const matched = reviewRows.some((row) => {
                          return item.line_type === "category" && item.category_slug === row.category_slug;
                        });
                        return !matched && item.line_type !== "spending";
                      })
                      .map((item) => {
                        const over = item.status === "OVER_PLAN";
                        const progress = Number(item.planned) > 0 && item.actual !== null ? Math.min(100, Number(item.actual) / Number(item.planned) * 100) : 0;
                        const status = over ? "Over" : Number(item.actual ?? 0) > 0 ? "On track" : "Not started";
                        return <div key={item.category_slug} className="grid grid-cols-[minmax(130px,1.4fr)_repeat(3,minmax(64px,0.8fr))_78px] items-center gap-2 border-t border-[#EFF3F0] py-3 text-xs">
                          <div className="min-w-0"><span className="truncate font-medium text-[#26332C]">{item.name}</span><div className="mt-2 h-1 overflow-hidden rounded-full bg-[#EFF3F0]"><motion.div initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }} className={`h-full rounded-full ${over ? "bg-[#EF4444]" : "bg-[#22C55E]"}`} /></div></div>
                          <span className="text-right tabular-nums text-[#141C16]"><MoneyAmount value={item.planned} /></span>
                          <span className="text-right tabular-nums text-[#26332C]"><MoneyAmount value={item.actual} /></span>
                          <span className="text-right tabular-nums text-[#52615A]"><MoneyAmount value={item.remaining} /></span>
                          <span className={`text-right font-medium ${over ? "text-[#B42318]" : "text-[#52615A]"}`}>{status}</span>
                        </div>;
                      })
                    }
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 flex-1">
              <p
                className={`mb-3 text-sm tabular-nums ${
                  local.isComplete
                    ? "font-medium text-emerald-600"
                    : local.exceedsIncome
                      ? "text-red-600"
                      : "text-[#52615A]"
                }`}
              >
                {local.isComplete ? (
                  <span>✓ Allocated: 100%</span>
                ) : (
                  <>
                    Allocated: {local.allocationPct.toFixed(1)}% ·{" "}
                    {formatCurrency(String(local.remaining))}{" "}
                    {local.remaining >= 0 ? "unallocated" : "over allocated"}
                  </>
                )}
              </p>

              {/* Category inputs */}
              {categoryLines.map((line, index) => {
                const inputId = `allocation-${line.key}`;
                const amount = amounts[line.key] ?? "";
                const pct =
                  amount && incomeNum > 0
                    ? formatPercent(String((Number(amount) / incomeNum) * 100))
                    : "—";
                return (
                  <div
                    key={line.key}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-slate-100 py-2 last:border-b-0"
                  >
                    <label htmlFor={inputId} className="text-sm font-medium text-slate-800">
                      {line.name}
                      {!line.isActive ? (
                        <span className="ml-1 text-xs font-normal text-[#52615A]">(hidden)</span>
                      ) : null}
                    </label>
                    <input
                      ref={index === 0 ? firstInputRef : undefined}
                      id={inputId}
                      type="number"
                      min="0"
                      step="1"
                      value={amount}
                      aria-label={`Allocated to ${line.name}`}
                      className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                      onChange={(event) =>
                        setAmounts((current) => ({
                          ...current,
                          [line.key]: event.target.value,
                        }))
                      }
                    />
                    <span className="w-12 text-right text-xs tabular-nums text-[#52615A]">{pct}</span>
                    <CategoryRowMenu
                      category={line.category}
                      showSemanticType
                      onRename={(name, semanticType) =>
                        onRenameCategory(line.id, name, semanticType)
                      }
                      onHide={() => onHideCategory(line.id)}
                    />
                  </div>
                );
              })}

              <AddCategoryForm mode="money_plan" onCreate={handleCreateCategory} />

              {/* Goals Section */}
              {goalLines.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Goals</h3>
                  
                  {goalLines.map((line) => {
                    const inputId = `allocation-${line.key}`;
                    const amount = amounts[line.key] ?? "";
                    const pct =
                      amount && incomeNum > 0
                        ? formatPercent(String((Number(amount) / incomeNum) * 100))
                        : "—";
                    return (
                      <div
                        key={line.key}
                        className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-slate-100 py-3 last:border-b-0"
                      >
                        <div className="flex flex-col min-w-0">
                          <label htmlFor={inputId} className="text-sm font-medium text-slate-800 truncate">
                            {line.name}
                          </label>
                          {line.plannedMonthlyContribution && Number(line.plannedMonthlyContribution) > 0 ? (
                            <span className="mt-0.5 text-xs text-[#52615A]">
                              ₹{formatCurrency(line.plannedMonthlyContribution)} needed/month
                            </span>
                          ) : null}
                        </div>
                        <input
                          id={inputId}
                          type="number"
                          min="0"
                          step="1"
                          value={amount}
                          aria-label={`Allocated to goal ${line.name}`}
                          className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                          onChange={(event) =>
                            setAmounts((current) => ({
                              ...current,
                              [line.key]: event.target.value,
                            }))
                          }
                        />
                        <span className="w-12 text-right text-xs tabular-nums text-[#52615A]">{pct}</span>
                        <span className="w-8" aria-hidden="true" />
                      </div>
                    );
                  })}
                  
                  <div className="flex justify-between items-center py-3 text-sm font-semibold text-slate-900 border-t border-slate-100 mt-2">
                    <span>Total toward goals</span>
                    <span className="tabular-nums font-bold">{formatCurrency(String(goalsTotal))}</span>
                  </div>
                </div>
              )}

              {local.exceedsIncome ? (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  Allocation exceeds income.
                </p>
              ) : null}
              {error ? (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button type="button" isLoading={isSaving} onClick={() => handleSave(false)}>
                  Save plan
                </Button>
                {local.remaining > 0.01 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={isSaving}
                    onClick={handleAddRemaining}
                  >
                    Add rest to Others
                  </Button>
                ) : null}
                {!local.isComplete ? (
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={isSaving}
                    onClick={() => handleSave(true)}
                  >
                    Confirm 100%
                  </Button>
                ) : null}
                {savedNotice ? (
                  <span className="text-sm text-emerald-600">Saved</span>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
