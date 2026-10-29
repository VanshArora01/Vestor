export interface SegmentItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface SegmentedBarProps {
  segments: SegmentItem[];
  total?: number;
  activeId?: string | null;
  onHover?: (id: string | null) => void;
  onClick?: (id: string) => void;
  className?: string;
  height?: number;
}

export function SegmentedBar({
  segments,
  total,
  activeId,
  onHover,
  onClick,
  className = "",
  height = 8,
}: SegmentedBarProps) {
  const calculatedTotal = total ?? segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);

  if (calculatedTotal <= 0) {
    return <div className={`w-full rounded-full bg-surface-2 ${className}`} style={{ height }} />;
  }

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-surface-2 flex items-center gap-[2px] ${className}`}
      style={{ height }}
    >
      {segments.map((seg) => {
        const pct = Math.max(0, (seg.value / calculatedTotal) * 100);
        if (pct <= 0) return null;

        const isHovered = activeId === seg.id;
        const isDimmed = activeId !== null && activeId !== undefined && activeId !== seg.id;

        return (
          <div
            key={seg.id}
            onMouseEnter={() => onHover?.(seg.id)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onClick?.(seg.id)}
            style={{
              width: `${pct}%`,
              height: "100%",
              backgroundColor: seg.color,
            }}
            title={`${seg.label}: ${Math.round(pct)}%`}
            className={`transition-all duration-150 cursor-pointer ${
              isHovered ? "brightness-125 scale-y-125" : isDimmed ? "opacity-40" : "opacity-90"
            }`}
          />
        );
      })}
    </div>
  );
}
