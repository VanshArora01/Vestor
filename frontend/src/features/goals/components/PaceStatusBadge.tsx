import type { PaceStatus } from "../../../types/goals";

const STATUS_LABELS: Record<PaceStatus, string> = {
  AHEAD: "Ahead",
  ON_TRACK: "On track",
  BEHIND: "Behind",
  COMPLETED: "Goal reached",
  OVERDUE: "Overdue",
};

const STATUS_STYLES: Record<PaceStatus, string> = {
  AHEAD: "bg-emerald-50 text-emerald-800 border-emerald-200",
  ON_TRACK: "bg-teal-50 text-teal-800 border-teal-200",
  BEHIND: "bg-amber-50 text-amber-800 border-amber-200",
  COMPLETED: "bg-slate-100 text-slate-700 border-slate-200",
  OVERDUE: "bg-red-50 text-red-800 border-red-200",
};

export function PaceStatusBadge({ status }: { status: PaceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
