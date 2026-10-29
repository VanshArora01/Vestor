import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "surface" | "dark" | "flat";
  interactive?: boolean;
}

export function Card({
  children,
  variant = "surface",
  interactive = false,
  className = "",
  ...props
}: CardProps) {
  const styles = {
    surface: "bg-white border border-[#DCE4DF] shadow-[0_4px_20px_-4px_rgba(20,28,22,0.04)] text-[#141C16]",
    dark: "bg-[#121A15] border border-white/5 text-white shadow-[0_12px_32px_-8px_rgba(18,26,21,0.35)]",
    flat: "bg-[#EFF3F0] border border-[#DCE4DF] text-[#141C16]",
  };

  return (
    <div
      className={`rounded-[26px] p-6 transition-all duration-200 ${styles[variant]} ${
        interactive ? "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function HeroCard(props: CardProps) {
  return <Card variant="dark" {...props} />;
}
