import { Component, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Spinner } from "../../components/ui/Spinner";
import { FinancialSnapshot } from "../../features/money/components/FinancialSnapshot";
import { MoneyPlanPanel } from "../../features/money/components/MoneyPlanPanel";
import { MoneyWorkspace } from "../../features/money/components/MoneyWorkspace";
import { MonthNavigator } from "../../features/money/components/MonthNavigator";
import { SpendingPanel } from "../../features/money/components/SpendingPanel";
import { TransactionHistory } from "../../features/money/components/TransactionHistory";
import { UnlockMonthDialog } from "../../features/money/components/UnlockMonthDialog";
import { useMoneyMonth } from "../../features/money/hooks/useMoneyMonth";
import { useRegisterPageContext } from "../../context/PageContext";
import { analyzeTransactionMonth, type MonthlyTransactionAnalysis } from "../../api/banking";
import type { IncomeCandidate } from "../../types/money";

function isNeedCategory(name: string) {
  return /rent|home|housing|food|grocery|transport|fuel|commute|utility|electric|water|internet|bill|health|medical|insurance|education|loan|emi/i.test(name);
}

function isWantCategory(name: string) {
  return /shopping|entertainment|dining|travel|hobby|personal/i.test(name);
}

export function MoneyPage() {
  return <MoneyPageErrorBoundary><MoneyPageContent /></MoneyPageErrorBoundary>;
}

class MoneyPageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Money page render failed", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <section role="alert" className="mx-auto max-w-[1200px] rounded-[20px] border border-[#DCE4DF] bg-white p-6 text-[#141C16]">
          <h2 className="text-lg font-semibold">Money could not load</h2>
          <p className="mt-2 text-sm text-[#52615A]">A display error interrupted this page. Reload Money to try again.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-[#121A15] px-4 py-2 text-sm font-medium text-white">Reload Money</button>
        </section>
      );
    }
    return this.props.children;
  }
}

function MoneyPageContent() {
  const now = new Date();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialYear = Number(searchParams.get("year")) || now.getFullYear();
  const initialMonth = Number(searchParams.get("month")) || now.getMonth() + 1;
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [analysis, setAnalysis] = useState<MonthlyTransactionAnalysis | null>(null);
  const [accountId, setAccountId] = useState(searchParams.get("account_id") ?? "all");
  const [analysisError, setAnalysisError] = useState("");
  const [analysisToast, setAnalysisToast] = useState("");
  const [incomeCandidates, setIncomeCandidates] = useState<IncomeCandidate[]>([]);
  const [isDemoSource, setIsDemoSource] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const restoredAnalysisKey = useRef<string | null>(null);

  const analysisKey = `${year}-${month}-${accountId}`;

  const handleAnalysisResult = useCallback((result: MonthlyTransactionAnalysis | null) => {
    setAnalysis(result);
    if (!result) return;
    restoredAnalysisKey.current = `${year}-${month}-${accountId}`;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("year", String(year));
      next.set("month", String(month));
      if (accountId === "all") next.delete("account_id");
      else next.set("account_id", accountId);
      next.set("analysis", "1");
      return next;
    });
  }, [accountId, month, setSearchParams, year]);

  const {
    monthState,
    allocationCategories,
    spendingCategories,
    reconciliation,
    isLoading,
    error,
    saveAllocation,
    saveRemainingToOthers,
    saveSpending,
    saveIncome,
    unlock,
    createCategory,
    renameCategory,
    hideCategory,
    confirmCandidate,
    saveAdjustment,
  } = useMoneyMonth(year, month);

  const analyzeTransactions = useMutation({
    mutationFn: () => analyzeTransactionMonth(year, month, accountId === "all" ? undefined : accountId),
    onMutate: () => {
      setAnalysisError("");
      setAnalysisToast("");
    },
    onSuccess: async (result) => {
      handleAnalysisResult(result);
      setAnalysisToast(`Spending updated · ${result.auto_categorized} categorized · ${result.unresolved.length} need review`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["all-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["money"] }),
        queryClient.invalidateQueries({ queryKey: ["accountDetails"] }),
      ]);
    },
    onError: () => {
      setAnalysisError("Transaction analysis failed. Check your connection and try again.");
    },
  });

  useEffect(() => {
    if (searchParams.get("analysis") !== "1" || restoredAnalysisKey.current === analysisKey) return;
    // Rebuild the derived transaction summary from persisted transactions after
    // refresh only when the user previously ran this analysis for this selection.
    restoredAnalysisKey.current = analysisKey;
    analyzeTransactions.mutate();
  }, [accountId, analysisKey, analyzeTransactions, month, searchParams, year]);

  useEffect(() => {
    if (!analysisToast) return;
    const timer = window.setTimeout(() => setAnalysisToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [analysisToast]);

  useRegisterPageContext({
    page: "money",
    route_title: "Money",
    active_month: `${year}-${String(month).padStart(2, "0")}`,
    metadata: {
      income: Number(monthState?.metrics?.income ?? 0),
      allocatedTotal: Number(monthState?.metrics?.allocated_total ?? 0),
      spentTotal: Number(monthState?.metrics?.spending_total ?? 0),
      availableToPlan: Number(monthState?.metrics?.available_to_plan ?? 0),
      unallocated: Number(monthState?.metrics?.unallocated ?? 0),
      isLocked: Boolean(monthState?.is_locked),
    },
    suggestedPrompts: [
      "Why is my Available to Plan amount different from my bank balance?",
      "Am I spending more than planned this month?",
      "Explain the difference between plan allocations and actual spending",
      "Why is unconfirmed salary not counted as confirmed income?",
    ],
  });

  function handleSelectMonth(nextYear: number, nextMonth: number) {
    setYear(nextYear);
    setMonth(nextMonth);
    setAnalysis(null);
    setIncomeCandidates([]);
    restoredAnalysisKey.current = `${nextYear}-${nextMonth}-${accountId}`;
    setAnalysisError("");
    setAnalysisToast("");
    setSelectedCategory(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("year", String(nextYear));
      next.set("month", String(nextMonth));
      next.delete("analysis");
      if (accountId === "all") next.delete("account_id");
      else next.set("account_id", accountId);
      return next;
    });
  }

  function handleAccountChange(nextAccountId: string, isSimulated: boolean) {
    setAccountId(nextAccountId);
    setAnalysis(null);
    setIncomeCandidates([]);
    setIsDemoSource(isSimulated);
    setAnalysisError("");
    setAnalysisToast("");
    restoredAnalysisKey.current = isSimulated ? null : `${year}-${month}-${nextAccountId}`;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextAccountId === "all") next.delete("account_id");
      else next.set("account_id", nextAccountId);
      if (isSimulated) next.set("analysis", "1");
      else next.delete("analysis");
      return next;
    });
  }

  if (isLoading) return <Spinner label="Loading money data…" />;
  if (error || !monthState) return <section className="mx-auto max-w-[1200px]"><h2 className="text-2xl font-semibold text-[#141C16]">Money</h2><p className="mt-2 text-[#B42318]">{error ?? "Unable to load money data."}</p></section>;

  const financialMetrics = analysis?.plan_preview ? {
    ...monthState.metrics,
    income: analysis.plan_preview.income,
    carryover: analysis.plan_preview.carryover,
    confirmed_income: analysis.plan_preview.confirmed_income,
    manual_income_adjustment: analysis.plan_preview.manual_income_adjustment,
    available_to_plan: analysis.plan_preview.available_to_plan,
    allocated_total: analysis.plan_preview.allocated_total,
    unallocated: analysis.plan_preview.unallocated,
    remaining_allocation: analysis.plan_preview.unallocated,
  } : monthState.metrics;
  const spent = Number(analysis?.total_recorded_ordinary_debits ?? monthState.metrics.spending_total ?? 0);
  const monthSpending = Array.isArray(monthState.spending) ? monthState.spending : [];
  const monthAllocations = Array.isArray(monthState.allocations) ? monthState.allocations : [];
  const analysisCategories = Array.isArray(analysis?.category_totals) ? analysis.category_totals : [];
  const bucketLines = analysis
    ? analysisCategories.map((item) => ({ name: item.category, amount: Number(item.amount) }))
    : monthSpending.map((item) => ({ name: item.category_name, amount: Number(item.amount ?? 0) }));
  const needs = bucketLines.filter((item) => isNeedCategory(item.name)).reduce((sum, item) => sum + item.amount, 0);
  const wants = bucketLines.filter((item) => isWantCategory(item.name) && !isNeedCategory(item.name)).reduce((sum, item) => sum + item.amount, 0);
  const other = Math.max(0, spent - needs - wants);

  async function saveManualSpending(items: Array<{ category_id: string; amount: string }>) {
    await saveSpending(items);
    setAnalysis(null);
    restoredAnalysisKey.current = analysisKey;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("analysis");
      return next;
    });
  }

  async function confirmIncomeCandidate(txId: string, isSalary: boolean) {
    await confirmCandidate(txId, isSalary);
    await analyzeTransactions.mutateAsync();
  }

  async function saveManualIncomeAdjustment(amount: string) {
    if (monthState?.is_connected) await saveAdjustment(amount);
    else await saveIncome(amount);
    if (isDemoSource) await analyzeTransactions.mutateAsync();
    else setAnalysis(null);
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      {isDemoSource ? <div className="flex items-center gap-2 rounded-xl border border-[#DCE4DF] bg-white px-4 py-2.5 text-xs font-medium text-[#26332C]" role="note"><span className="h-1.5 w-1.5 rounded-full bg-[#0F766E]" />Demo data · simulated bank feed</div> : null}

      <FinancialSnapshot
        metrics={financialMetrics}
        isLocked={monthState.is_locked}
        spent={spent}
        spendingBuckets={{ needs, wants, other }}
        monthActions={<div className="flex items-center gap-2"><MonthNavigator year={year} month={month} onSelect={handleSelectMonth} />{monthState.is_locked ? <UnlockMonthDialog year={year} month={month} onUnlock={unlock} /> : null}</div>}
        incomeCandidates={incomeCandidates}
        onConfirmCandidate={confirmIncomeCandidate}
        onSaveAdjustment={saveManualIncomeAdjustment}
      />

      <MoneyWorkspace
        planPanel={<MoneyPlanPanel
          categories={allocationCategories}
          allocations={analysis?.plan_preview ? [] : monthAllocations}
          metrics={financialMetrics}
          income={financialMetrics.income ?? monthState.income}
          isLocked={monthState.is_locked}
          suggestionIsPreview={Boolean(analysis?.plan_preview)}
          reconciliation={analysis?.plan_preview ? null : reconciliation}
          onSave={saveAllocation}
          onAddRemainingToOthers={saveRemainingToOthers}
          onCreateCategory={({ name, semantic_type }) => createCategory({ kind: "money_plan", name, semantic_type })}
          onRenameCategory={(categoryId, name, semanticType) => renameCategory(categoryId, "money_plan", name, semanticType)}
          onHideCategory={(categoryId) => hideCategory(categoryId, "money_plan")}
        />}
        spendingPanel={<SpendingPanel
          categories={spendingCategories}
          spending={monthSpending}
          metrics={monthState.metrics}
          income={financialMetrics.income ?? monthState.income}
          isLocked={monthState.is_locked || Boolean(analysis?.simulated)}
          transactionSummary={analysis}
          onAnalyzeTransactions={() => analyzeTransactions.mutate()}
          isAnalyzingTransactions={analyzeTransactions.isPending}
          analysisError={analysisError}
          activeCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          onSave={saveManualSpending}
          onCreateCategory={({ name }) => createCategory({ kind: "spending", name })}
          onRenameCategory={(categoryId, name) => renameCategory(categoryId, "spending", name)}
          onHideCategory={(categoryId) => hideCategory(categoryId, "spending")}
        />}
      />

      <TransactionHistory
        year={year}
        month={month}
        categories={spendingCategories}
        accountId={accountId}
        onAccountChange={handleAccountChange}
        onIncomeCandidatesChange={setIncomeCandidates}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onDemoSourceChange={setIsDemoSource}
        onAnalysis={handleAnalysisResult}
      />
      <AnimatePresence>
        {analysisToast ? <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 8 }} className="fixed bottom-5 right-5 z-40 max-w-sm rounded-xl border border-[#DCE4DF] bg-white px-4 py-3 text-xs font-medium text-[#26332C] shadow-lg" role="status">{analysisToast}</motion.div> : null}
      </AnimatePresence>
    </div>
  );
}
