import { formatInr } from "../../features/invest/utils/format";

interface MoneyAmountProps {
  value: number | string | null | undefined;
  className?: string;
  fractionClassName?: string;
}

export function MoneyAmount({ value, className = "", fractionClassName = "text-[#52615A]" }: MoneyAmountProps) {
  if (value === null || value === undefined || value === "") return <span className={`tabular-nums ${className}`}>—</span>;
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (!Number.isFinite(amount)) return <span className={`tabular-nums ${className}`}>—</span>;
  const roundedAmount = Math.sign(safeAmount) * Math.round(Math.abs(safeAmount) * 100) / 100;
  const [whole, fraction] = Math.abs(roundedAmount).toFixed(2).split(".");
  const label = formatInr(roundedAmount, { decimals: fraction === "00" ? 0 : 2 });

  if (fraction === "00") return <span className={`tabular-nums ${className}`}>{formatInr(roundedAmount)}</span>;

  return (
    <span className={`tabular-nums ${className}`} aria-label={label}>
      {formatInr(Math.sign(roundedAmount) * Number(whole))}
      <span className={`ml-0.5 text-[0.68em] font-normal ${fractionClassName}`}>.{fraction}</span>
    </span>
  );
}
