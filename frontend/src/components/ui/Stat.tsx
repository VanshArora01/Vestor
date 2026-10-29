import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

export interface StatProps {
  label: string;
  value: string | ReactNode;
  delta?: {
    value: string;
    trend: "up" | "down" | "neutral";
    label?: string;
  };
  onShowMath?: () => void;
  className?: string;
}

export function Stat({ label, value, delta, onShowMath, className = "" }: StatProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-sans text-[13px] text-muted">
          {label}
        </span>
        {onShowMath && (
          <button
            type="button"
            onClick={onShowMath}
            className="group flex items-center gap-1 font-sans text-xs text-muted hover:text-accent transition-colors"
            title="Show the math"
          >
            <HelpCircle className="h-3.5 w-3.5 text-muted group-hover:text-accent" />
            <span className="underline decoration-border underline-offset-4">Show math</span>
          </button>
        )}
      </div>

      <div className="flex items-baseline gap-3 flex-wrap">
        <div className="font-sans text-3xl sm:text-4xl font-bold tracking-tight text-text tabular-nums">
          {value}
        </div>
        {delta && delta.value && delta.value !== "+0.0%" && delta.value !== "0.0%" && (
          <span
            className={`font-sans text-xs font-semibold tabular-nums ${
              delta.trend === "up"
                ? "text-positive"
                : delta.trend === "down"
                ? "text-negative"
                : "text-muted"
            }`}
          >
            {delta.trend === "up" ? "+" : delta.trend === "down" ? "-" : ""}{delta.value}
            {delta.label && <span className="ml-1 text-[11px] font-normal text-muted">{delta.label}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
