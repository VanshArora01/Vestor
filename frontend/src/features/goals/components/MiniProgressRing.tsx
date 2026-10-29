interface MiniProgressRingProps {
  percentage: number;
  size?: number;
}

export function MiniProgressRing({ percentage, size = 44 }: MiniProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E2E8F0"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#0F766E"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-slate-800"
        style={{ fontSize: 9, fontWeight: 600 }}
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}
