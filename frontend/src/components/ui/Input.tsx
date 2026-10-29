import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  readOnlyAppearance?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className = "", readOnlyAppearance = false, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-sm font-medium text-ink-700">{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-500 focus:border-accent focus:ring-2 focus:ring-accent/20 ${
          readOnlyAppearance
            ? "cursor-default border-transparent bg-transparent px-0 focus:ring-0"
            : "border-ink-300 bg-white"
        } ${error ? "border-red-400" : ""} ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
});
