import { useState, type ReactNode } from "react";
import { formatCurrency, formatPercent } from "../utils/format";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
  percent?: number;
  count?: number | null;
}

interface DonutChartProps {
  data: DonutSlice[];
  centerPrimary: ReactNode;
  centerSecondary: string;
  percentOfLabel?: string;
  ariaLabel: string;
  activeName?: string | null;
  onActiveNameChange?: (name: string | null) => void;
  onSliceClick?: (name: string) => void;
}

const CENTER = 88;
const OUTER_RADIUS = 77;
const INNER_RADIUS = 52;

function pointAt(radius: number, angleDegrees: number) {
  const angle = ((angleDegrees - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

function arcPath(startAngle: number, endAngle: number) {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) {
    const topOuter = pointAt(OUTER_RADIUS, 0);
    const bottomOuter = pointAt(OUTER_RADIUS, 180);
    const topInner = pointAt(INNER_RADIUS, 0);
    const bottomInner = pointAt(INNER_RADIUS, 180);
    return [
      `M ${topOuter.x} ${topOuter.y}`,
      `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 1 1 ${bottomOuter.x} ${bottomOuter.y}`,
      `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 1 1 ${topOuter.x} ${topOuter.y}`,
      `L ${topInner.x} ${topInner.y}`,
      `A ${INNER_RADIUS} ${INNER_RADIUS} 0 1 0 ${bottomInner.x} ${bottomInner.y}`,
      `A ${INNER_RADIUS} ${INNER_RADIUS} 0 1 0 ${topInner.x} ${topInner.y} Z`,
    ].join(" ");
  }

  const outerStart = pointAt(OUTER_RADIUS, startAngle);
  const outerEnd = pointAt(OUTER_RADIUS, endAngle);
  const innerEnd = pointAt(INNER_RADIUS, endAngle);
  const innerStart = pointAt(INNER_RADIUS, startAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`,
  ].join(" ");
}

export function DonutChart({
  data,
  centerPrimary,
  centerSecondary,
  percentOfLabel = "income",
  ariaLabel,
  activeName,
  onActiveNameChange,
  onSliceClick,
}: DonutChartProps) {
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const total = data.reduce((sum, slice) => sum + Math.max(0, Number(slice.value) || 0), 0);

  if (data.length === 0 || total <= 0) {
    return <div className="flex h-44 w-44 items-center justify-center text-sm text-[#52615A]">No data yet</div>;
  }

  let nextAngle = 0;
  const segments = data.flatMap((slice) => {
    const amount = Math.max(0, Number(slice.value) || 0);
    if (amount === 0) return [];
    const startAngle = nextAngle;
    nextAngle += amount / total * 360;
    return [{ slice, startAngle, endAngle: nextAngle }];
  });

  const highlightedName = activeName ?? hoveredName;

  function activate(name: string | null) {
    setHoveredName(name);
    onActiveNameChange?.(name);
  }

  return (
    <div className="relative mx-auto h-44 w-44 overflow-visible" role="group" aria-label={ariaLabel}>
      <svg viewBox="0 0 176 176" className="h-full w-full overflow-visible" aria-hidden="true">
        {segments.map(({ slice, startAngle, endAngle }) => {
          const isActive = highlightedName === slice.name;
          const isDimmed = Boolean(highlightedName && !isActive);
          return (
            <path
              key={slice.name}
              d={arcPath(startAngle, endAngle)}
              fill={slice.color}
              opacity={isDimmed ? 0.32 : 1}
              role={onSliceClick ? "button" : undefined}
              tabIndex={onSliceClick ? 0 : undefined}
              aria-label={`${slice.name}: ${formatCurrency(String(slice.value))}${slice.percent != null ? `, ${formatPercent(String(slice.percent))}` : ""}`}
              onMouseEnter={() => activate(slice.name)}
              onMouseLeave={() => activate(null)}
              onFocus={() => activate(slice.name)}
              onBlur={() => activate(null)}
              onClick={() => onSliceClick?.(slice.name)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSliceClick?.(slice.name);
                }
              }}
              className={onSliceClick ? "cursor-pointer outline-none focus-visible:opacity-75" : undefined}
              style={{ transition: "opacity 150ms ease-out" }}
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
        <p className="text-lg font-semibold tabular-nums text-[#141C16]">{centerPrimary}</p>
        <p className="text-xs font-medium text-[#52615A]">{centerSecondary}</p>
      </div>

      {highlightedName && (() => {
        const slice = data.find((item) => item.name === highlightedName);
        return slice ? (
          <div className="pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 rounded-lg border border-[#DCE4DF] bg-white px-2.5 py-1.5 text-center shadow-sm">
            <p className="text-xs font-semibold text-[#141C16]">{slice.name}</p>
            <p className="text-[11px] tabular-nums text-[#52615A]">{formatCurrency(String(slice.value))}{slice.percent != null ? ` · ${formatPercent(String(slice.percent))} of ${percentOfLabel}` : ""}</p>
          </div>
        ) : null;
      })()}

      <ul className="sr-only">
        {data.map((slice) => <li key={slice.name}>{slice.name}: {formatCurrency(String(slice.value))}{slice.percent != null ? ` (${formatPercent(String(slice.percent))})` : ""}</li>)}
      </ul>
    </div>
  );
}
