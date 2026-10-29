import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200/90 bg-white/60 p-8 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50/80 text-accent mb-3">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="font-sans text-base font-bold text-ink-950">{title}</h3>
      <p className="mt-1 font-sans text-xs text-ink-500 max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
