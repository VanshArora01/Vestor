import { Plus, Download, RefreshCcw } from "lucide-react";

interface InvestHeaderProps {
  onAdd: () => void;
  onExport: () => void;
  onRefresh: () => void;
  exportDisabled?: boolean;
  refreshDisabled?: boolean;
}

export function InvestHeader({ onAdd, onExport, onRefresh, exportDisabled, refreshDisabled }: InvestHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-[#141C16]">
          Investment Portfolio
        </h1>
        <p className="font-sans text-xs text-[#6C7A70] mt-0.5">
          Track multi-asset allocations, live market valuation status, and monthly investment plans
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshDisabled}
          className="flex items-center gap-1.5 rounded-2xl bg-white border border-[#DCE4DF] px-3.5 py-2 font-sans text-xs font-semibold text-[#141C16] hover:bg-[#EFF3F0] transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCcw className={`h-3.5 w-3.5 text-[#6C7A70] ${refreshDisabled ? "animate-spin" : ""}`} />
          <span>{refreshDisabled ? "Refreshing" : "Refresh Prices"}</span>
        </button>

        <button
          type="button"
          onClick={onExport}
          disabled={exportDisabled}
          className="flex items-center gap-1.5 rounded-2xl bg-white border border-[#DCE4DF] px-3.5 py-2 font-sans text-xs font-semibold text-[#141C16] hover:bg-[#EFF3F0] transition-colors disabled:opacity-50 shadow-sm"
        >
          <Download className="h-3.5 w-3.5 text-[#6C7A70]" />
          <span>Export CSV</span>
        </button>

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 rounded-2xl bg-[#121A15] hover:bg-[#1E2922] text-[#22C55E] px-4 py-2 font-sans text-xs font-bold transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Investment</span>
        </button>
      </div>
    </div>
  );
}
