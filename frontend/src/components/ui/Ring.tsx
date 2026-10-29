export interface RingProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

export function Ring({
  value,
  size = 64,
  strokeWidth = 6,
  color = "#0F766E",
  className = "",
}: RingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute font-sans text-xs font-bold text-ink-900 tabular-nums">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
