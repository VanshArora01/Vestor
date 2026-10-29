import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../api/client";
import { AddInvestmentDialog } from "../../features/invest/components/AddInvestmentDialog";
import { AllocationChart } from "../../features/invest/components/AllocationChart";
import { EmptyPortfolio } from "../../features/invest/components/EmptyPortfolio";
import { HoldingDetailDrawer } from "../../features/invest/components/HoldingDetailDrawer";
import { HoldingsList } from "../../features/invest/components/HoldingsList";
import { InvestHeader } from "../../features/invest/components/InvestHeader";
import { InvestPageSkeleton } from "../../features/invest/components/InvestPageSkeleton";
import { InvestmentHistory } from "../../features/invest/components/InvestmentHistory";
import { InvestmentPlanSection } from "../../features/invest/components/InvestmentPlanSection";
import { PerformanceChart } from "../../features/invest/components/PerformanceChart";
import { PortfolioHero } from "../../features/invest/components/PortfolioHero";
import {
  downloadInvestCsv,
  useInvestDashboard,
} from "../../features/invest/hooks/useInvest";
import { addMonths } from "../../features/invest/utils/format";
import { useRegisterPageContext } from "../../context/PageContext";
import { RefreshCcw } from "lucide-react";

export function InvestPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lastPriceUpdatedAt, setLastPriceUpdatedAt] = useState<string | null>(null);
  const [section, setSection] = useState<"overview" | "history">("overview");

  const {
    summary,
    holdings,
    plan,
    planError,
    planLoading,
    history,
    historyError,
    historyLoading,
    isLoading,
    error,
    refetch,
    createInvestment,
    refreshPrices,
    isRefreshing,
  } = useInvestDashboard(year, month);

  useRegisterPageContext({
    page: "invest",
    route_title: "Investment Portfolio",
    selected_item_id: selectedHoldingId || undefined,
    metadata: {
      totalInvested: Number(summary?.total_invested || 0),
      currentValue: summary?.current_value ? Number(summary.current_value) : 0,
      absoluteGain: summary?.absolute_gain_loss ? Number(summary.absolute_gain_loss) : 0,
      returnPct: summary?.return_pct ? Number(summary.return_pct) : 0,
      totalHoldings: summary?.total_holdings || 0,
      valuationComplete: Boolean(summary?.valuation_complete),
    },
    suggestedPrompts: [
      "What is my total portfolio gain and return percentage?",
      "Explain my asset allocation breakdown across asset classes",
      "Are all my investment valuations fresh or stale?",
      "Why is portfolio current value null when valuations are incomplete?",
    ],
  });

  useEffect(() => {
    const previous = document.title;
    document.title = "Portfolio · Vestor AI";
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  function shiftMonth(delta: number) {
    const d = addMonths(new Date(year, month - 1, 1), delta);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  if (isLoading) {
    return <InvestPageSkeleton />;
  }

  if (error || !summary || !holdings) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50/50 p-8 text-center space-y-3">
        <h2 className="font-sans text-base font-bold text-rose-800">Unable to load Portfolio</h2>
        <p className="font-sans text-xs text-rose-600">
          {error
            ? getApiErrorMessage(error, "Failed to fetch portfolio data.")
            : "An unexpected error occurred."}
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#121A15] text-[#22C55E] px-4 py-2 font-sans text-xs font-bold transition hover:bg-[#1E2922]"
          onClick={() => refetch()}
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const isEmpty = summary.total_holdings === 0 && summary.total_transactions === 0;

  return (
    <div className="space-y-6 pb-12">
      <InvestHeader
        onAdd={() => setAddOpen(true)}
        onRefresh={() => {
          void refreshPrices().then((result) => {
            if (result.last_updated_at) setLastPriceUpdatedAt(result.last_updated_at);
            setToast(result.failed > 0
              ? `Updated ${result.updated} prices. Could not refresh ${result.failed_assets.slice(0, 3).map((asset) => asset.name).join(", ") || `${result.failed} assets`}; last valid prices were kept.`
              : result.updated > 0
                ? `Updated ${result.updated} market prices.`
                : "No market prices were available to refresh.");
          }).catch((refreshError: unknown) => {
            setToast(getApiErrorMessage(refreshError, "Price refresh failed. Existing valuations were kept."));
          });
        }}
        refreshDisabled={isRefreshing}
        onExport={() => {
          void downloadInvestCsv().catch(() =>
            setToast("Export failed. Try again from History."),
          );
        }}
        exportDisabled={summary.total_transactions === 0}
      />

      {isEmpty ? (
        <EmptyPortfolio onAdd={() => setAddOpen(true)} />
      ) : (
        <>
          {/* Navigation Tab Pills */}
          <div className="flex items-center gap-2">
            {(
              [
                ["overview", "Overview & Allocations"],
                ["history", "Transaction History"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`rounded-2xl px-4 py-2 font-sans text-xs font-semibold transition-all ${
                  section === key
                    ? "bg-[#121A15] text-white shadow-sm"
                    : "bg-white border border-[#DCE4DF] text-[#6C7A70] hover:text-[#141C16]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {section === "overview" ? (
            <div className="space-y-6">
              <PortfolioHero
                summary={summary}
                holdings={holdings.items}
                lastUpdatedAt={lastPriceUpdatedAt}
              />

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <div className="lg:col-span-3 rounded-[28px] bg-white border border-[#DCE4DF] p-6 shadow-sm">
                  <PerformanceChart />
                </div>
                <div className="lg:col-span-2 rounded-[28px] bg-white border border-[#DCE4DF] p-6 shadow-sm">
                  <AllocationChart
                    holdings={holdings.items}
                    centerValue={summary.current_value ?? summary.total_invested}
                  />
                </div>
              </div>

              {planLoading ? (
                <div className="h-40 animate-pulse rounded-[28px] bg-white border border-[#DCE4DF]" />
              ) : planError || !plan ? (
                <div className="rounded-[28px] bg-white border border-[#DCE4DF] p-6">
                  <h3 className="font-sans text-sm font-bold text-[#141C16]">Monthly Allocation Plan</h3>
                  <p className="mt-1 font-sans text-xs text-[#6C7A70]">Investment plan couldn&apos;t be loaded.</p>
                  <button
                    type="button"
                    className="mt-2 font-sans text-xs font-bold text-[#22C55E]"
                    onClick={() => refetch()}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <InvestmentPlanSection
                  plan={plan}
                  year={year}
                  month={month}
                  onPrev={() => shiftMonth(-1)}
                  onNext={() => shiftMonth(1)}
                  onAdd={() => setAddOpen(true)}
                />
              )}

              <div className="rounded-[28px] bg-white border border-[#DCE4DF] p-6 shadow-sm">
                <HoldingsList holdings={holdings.items} onSelect={setSelectedHoldingId} />
              </div>
            </div>
          ) : historyLoading ? (
            <div className="h-48 animate-pulse rounded-[28px] bg-white border border-[#DCE4DF]" />
          ) : historyError || !history ? (
            <div className="rounded-[28px] bg-white border border-[#DCE4DF] p-8 text-center text-xs text-[#6C7A70]">
              <p>History couldn&apos;t be loaded.</p>
              <button
                type="button"
                className="mt-2 font-sans font-bold text-[#22C55E]"
                onClick={() => refetch()}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="rounded-[28px] bg-white border border-[#DCE4DF] p-6 shadow-sm">
              <InvestmentHistory items={history.items} total={history.total} />
            </div>
          )}
        </>
      )}

      <AddInvestmentDialog
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={createInvestment}
        onSuccessMessage={setToast}
      />

      <HoldingDetailDrawer
        holdingId={selectedHoldingId}
        onClose={() => setSelectedHoldingId(null)}
      />

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#121A15] border border-white/20 px-5 py-2.5 text-center font-sans text-xs font-semibold text-white shadow-xl"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
