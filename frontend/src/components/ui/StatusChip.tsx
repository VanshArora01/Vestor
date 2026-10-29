import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";

export type StatusType =
  | "SYNCED"
  | "STALE"
  | "FAILED"
  | "COMPLETE"
  | "IN_PROGRESS"
  | "NOT_STARTED"
  | "OVER_PLAN";

export interface StatusChipProps {
  status: StatusType;
  label?: string;
  icon?: boolean;
  className?: string;
}

export function StatusChip({ status, label, icon = true, className = "" }: StatusChipProps) {
  // ANTI-SLOP RULE: No tinted pill backgrounds! Neutral outlines only, semantic text colors.
  const configs: Record<StatusType, { text: string; textCol: string; iconNode: ReactNode }> = {
    SYNCED: {
      text: "Synced",
      textCol: "text-positive",
      iconNode: <CheckCircle2 className="h-3 w-3 text-positive" />,
    },
    STALE: {
      text: "Stale",
      textCol: "text-accent",
      iconNode: <Clock className="h-3 w-3 text-accent" />,
    },
    FAILED: {
      text: "Failed",
      textCol: "text-negative",
      iconNode: <AlertCircle className="h-3 w-3 text-negative" />,
    },
    COMPLETE: {
      text: "Complete",
      textCol: "text-positive font-bold",
      iconNode: <CheckCircle2 className="h-3 w-3 text-positive" />,
    },
    IN_PROGRESS: {
      text: "In Progress",
      textCol: "text-muted",
      iconNode: <Clock className="h-3 w-3 text-muted" />,
    },
    NOT_STARTED: {
      text: "Not Started",
      textCol: "text-muted",
      iconNode: <XCircle className="h-3 w-3 text-muted" />,
    },
    OVER_PLAN: {
      text: "Over Plan",
      textCol: "text-negative font-bold",
      iconNode: <AlertCircle className="h-3 w-3 text-negative" />,
    },
  };

  const current = configs[status];
  const displayText = label || current.text;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans text-xs font-medium border border-border bg-transparent ${current.textCol} ${className}`}
    >
      {icon && current.iconNode}
      <span>{displayText}</span>
    </span>
  );
}
