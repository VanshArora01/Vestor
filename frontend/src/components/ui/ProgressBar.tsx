export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  className?: string;
  color?: "accent" | "emerald" | "amber" | "rose";
}

export function ProgressBar({
  value,
  max = 100,
  className = "",
  color = "accent",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const colorStyles = {
    accent: "bg-accent",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };

  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ease-out ${colorStyles[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
