import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "dark" | "ghost";
  isLoading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  isLoading = false,
  loadingLabel = "Loading…",
  children,
  className = "",
  disabled,
  "aria-label": ariaLabel,
  ...props
}: ButtonProps) {
  const base =
    "inline-grid min-h-9 items-center justify-items-center rounded-control px-4 py-2.5 font-sans text-xs font-semibold transition-colors duration-150 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary: "bg-brand text-white hover:bg-brand-hover shadow-sm",
    secondary: "bg-canvas border border-border text-main hover:bg-surface",
    dark: "bg-dark text-white hover:bg-dark-sub shadow-sm",
    ghost: "text-muted hover:text-main hover:bg-canvas",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-label={isLoading ? loadingLabel : ariaLabel}
      {...props}
    >
      <span className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap ${isLoading ? "invisible" : ""}`} aria-hidden={isLoading || undefined}>
        {children}
      </span>
      {isLoading ? (
        <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap" role="status" aria-live="polite">
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden="true" />
          {loadingLabel}
        </span>
      ) : null}
    </button>
  );
}
