interface SliderControlProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  prefix?: string;
  presets?: { label: string; value: number }[];
  helperText?: string;
  id?: string;
}

export function SliderControl({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  prefix = "",
  presets,
  helperText,
  id,
}: SliderControlProps) {
  const sliderId = id || `slider-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={sliderId} className="font-sans text-xs font-semibold text-ink-900">
          {label}
        </label>
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 font-sans text-xs font-bold text-ink-950">
          {prefix}
          {value.toLocaleString("en-IN")}
          {unit}
        </span>
      </div>

      <div className="relative flex items-center py-1">
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, #0F766E 0%, #0F766E ${percentage}%, #E2E8F0 ${percentage}%, #E2E8F0 100%)`,
          }}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-ink-500 font-medium">
        <span>
          {prefix}
          {min}
          {unit}
        </span>
        {presets && presets.length > 0 && (
          <div className="flex items-center gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.value)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                  value === preset.value
                    ? "bg-accent text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
        <span>
          {prefix}
          {max}
          {unit}
        </span>
      </div>

      {helperText && <p className="text-[11px] text-ink-500">{helperText}</p>}
    </div>
  );
}
