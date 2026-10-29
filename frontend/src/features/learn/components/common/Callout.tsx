import type { ReactNode } from "react";
import { Lightbulb, AlertTriangle, Compass, ShieldCheck } from "lucide-react";

export type CalloutType = "concept" | "misconception" | "indian-context" | "regulatory" | "tip";

interface CalloutProps {
  type: CalloutType;
  title: string;
  text?: string;
  children?: ReactNode;
}

const CONFIG: Record<
  CalloutType,
  {
    icon: typeof Lightbulb;
    badge: string;
    containerClass: string;
    iconClass: string;
    badgeClass: string;
  }
> = {
  concept: {
    icon: Lightbulb,
    badge: "Core Concept",
    containerClass: "bg-teal-50/50 border-teal-200/70 text-slate-900",
    iconClass: "text-accent",
    badgeClass: "bg-teal-100/70 text-teal-800",
  },
  misconception: {
    icon: AlertTriangle,
    badge: "Common Myth",
    containerClass: "bg-amber-50/50 border-amber-200/70 text-slate-900",
    iconClass: "text-amber-600",
    badgeClass: "bg-amber-100/70 text-amber-800",
  },
  "indian-context": {
    icon: Compass,
    badge: "Indian Reality",
    containerClass: "bg-sky-50/50 border-sky-200/70 text-slate-900",
    iconClass: "text-sky-600",
    badgeClass: "bg-sky-100/70 text-sky-800",
  },
  regulatory: {
    icon: ShieldCheck,
    badge: "Regulatory Note",
    containerClass: "bg-slate-50 border-slate-200 text-slate-800",
    iconClass: "text-slate-600",
    badgeClass: "bg-slate-200/80 text-slate-700",
  },
  tip: {
    icon: Lightbulb,
    badge: "Pro Tip",
    containerClass: "bg-emerald-50/50 border-emerald-200/70 text-slate-900",
    iconClass: "text-emerald-600",
    badgeClass: "bg-emerald-100/70 text-emerald-800",
  },
};

export function Callout({ type, title, text, children }: CalloutProps) {
  const conf = CONFIG[type] || CONFIG.concept;
  const Icon = conf.icon;

  return (
    <aside
      className={`my-4 rounded-xl border p-4.5 transition-colors ${conf.containerClass}`}
      role="note"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs">
          <Icon className={`h-4 w-4 ${conf.iconClass}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${conf.badgeClass}`}
            >
              {conf.badge}
            </span>
            <h4 className="font-sans text-sm font-semibold text-ink-950">{title}</h4>
          </div>
          {text && <p className="text-xs leading-relaxed text-ink-700">{text}</p>}
          {children}
        </div>
      </div>
    </aside>
  );
}
