interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  quickIncrements?: number[];
  helperText?: string;
  id?: string;
}

export function CurrencyInput({
  label,
  value,
  onChange,
  min = 0,
  max = 10000000,
  step = 1000,
  quickIncrements = [5000, 10000],
  helperText,
  id,
}: CurrencyInputProps) {
  const inputId = id || `currency-input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const parsed = raw === "" ? 0 : Number.parseInt(raw, 10);
    const clamped = Math.min(max, Math.max(min, parsed));
    onChange(clamped);
  };

  const handleAdd = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="font-sans text-xs font-semibold text-ink-900">
          {label}
        </label>
        {quickIncrements.length > 0 && (
          <div className="flex items-center gap-1.5">
            {quickIncrements.map((inc) => (
              <button
                key={inc}
                type="button"
                onClick={() => handleAdd(inc)}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-ink-700 hover:border-slate-300 hover:bg-slate-50 transition active:brightness-95"
              >
                +₹{(inc / 1000).toLocaleString("en-IN")}k
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative rounded-xl border border-slate-200 bg-white shadow-xs focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <span className="font-sans text-sm font-semibold text-ink-500">₹</span>
        </div>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={value === 0 ? "" : value.toLocaleString("en-IN")}
          placeholder="0"
          onChange={handleChange}
          step={step}
          className="w-full rounded-xl bg-transparent py-2.5 pl-8 pr-4 text-sm font-semibold text-ink-950 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {helperText && <p className="text-[11px] text-ink-500">{helperText}</p>}
    </div>
  );
}
