export interface GaugeProps {
  current: number; // e.g. months covered
  target?: number; // e.g. 6 months
  className?: string;
}

export function Gauge({ current, target = 6, className = "" }: GaugeProps) {
  const segments = Array.from({ length: target }, (_, i) => i + 1);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 w-full">
        {segments.map((seg) => {
          const isFilled = current >= seg;
          const isPartial = current > seg - 1 && current < seg;

          return (
            <div
              key={seg}
              className="relative flex-1 h-2 rounded-full overflow-hidden bg-surface-2"
              title={`Month ${seg} of ${target}`}
            >
              {isFilled && (
                <div className="h-full w-full bg-accent transition-all duration-300" />
              )}
              {isPartial && (
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${(current - (seg - 1)) * 100}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] font-sans text-muted">
        <span>0</span>
        <span className="font-semibold text-text tabular-nums">{current} of {target} months</span>
        <span>{target}m target</span>
      </div>
    </div>
  );
}
