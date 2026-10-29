import { formatPercent } from "../utils/format";
import { MoneyAmount } from "../../../components/ui/MoneyAmount";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: { name?: string; value?: number; percent?: number };
  }>;
  percentOfLabel?: string;
}

export function ChartTooltip({
  active,
  payload,
  percentOfLabel = "total",
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = item.payload?.name ?? item.name ?? "";
  const value = item.payload?.value ?? item.value ?? 0;
  const percent = item.payload?.percent;

  return (
    <div className="rounded-xl border border-[#DCE4DF] bg-white px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold text-[#141C16]">{name}</p>
      <p className="mt-0.5 text-sm tabular-nums text-[#26332C]"><MoneyAmount value={value} /></p>
      {percent != null ? (
        <p className="text-xs tabular-nums text-[#52615A]">
          {formatPercent(String(percent))} of {percentOfLabel}
        </p>
      ) : null}
    </div>
  );
}
