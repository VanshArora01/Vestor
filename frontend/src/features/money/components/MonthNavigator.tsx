import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthNavigatorProps {
  year: number;
  month: number;
  onSelect: (year: number, month: number) => void;
}

export function MonthNavigator({
  year,
  month,
  onSelect,
}: MonthNavigatorProps) {
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  function handlePrev() {
    const prev = new Date(year, month - 2, 1);
    onSelect(prev.getFullYear(), prev.getMonth() + 1);
  }

  function handleNext() {
    const next = new Date(year, month, 1);
    onSelect(next.getFullYear(), next.getMonth() + 1);
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 p-1">
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Previous month"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="px-2.5">
        <span className="font-sans text-sm font-semibold text-white">
          {monthNames[month - 1]} {year}
        </span>
      </div>

      <button
        type="button"
        onClick={handleNext}
        aria-label="Next month"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
