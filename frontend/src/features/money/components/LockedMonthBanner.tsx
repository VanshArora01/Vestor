import { UnlockMonthDialog } from "./UnlockMonthDialog";
import { formatMonthLabel } from "../utils/format";

interface LockedMonthBannerProps {
  year: number;
  month: number;
  onUnlock: () => Promise<unknown>;
}

export function LockedMonthBanner({ year, month, onUnlock }: LockedMonthBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
      <span>Viewing {formatMonthLabel(year, month)} — locked</span>
      <UnlockMonthDialog year={year} month={month} onUnlock={onUnlock} />
    </div>
  );
}
