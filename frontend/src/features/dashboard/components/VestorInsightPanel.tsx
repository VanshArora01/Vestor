import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, AlertCircle, Sparkles, CheckCircle2, AlertTriangle, Heart } from "lucide-react";

export interface InsightItem {
  type: string;
  severity: "info" | "warning" | "success" | "danger" | string;
  data: Record<string, any>;
  message: string;
}

interface VestorInsightPanelProps {
  insights: InsightItem[];
}

function getInsightPriority(item: InsightItem): number {
  const sev = item.severity.toLowerCase();
  const type = item.type.toLowerCase();
  
  if (sev === "danger" || type.includes("warning") || type.includes("exceeds")) return 1;
  if (type.includes("behind") || type.includes("gap")) return 2;
  if (type.includes("spending_increase") || type.includes("anomaly")) return 3;
  if (sev === "warning") return 4;
  if (type.includes("ahead") || type.includes("success") || sev === "success") return 5;
  return 6; // default/neutral
}

export function VestorInsightPanel({ insights }: VestorInsightPanelProps) {
  // Sort and select the top 2 insights
  const prioritised = useMemo(() => {
    if (!insights || insights.length === 0) return [];
    return [...insights]
      .sort((a, b) => getInsightPriority(a) - getInsightPriority(b))
      .slice(0, 2);
  }, [insights]);

  if (prioritised.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-teal-50/10 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
            <Heart className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">You&apos;re on track</span>
            <p className="mt-1 text-xs font-semibold text-ink-950 leading-relaxed">
              Vestor noticed you are executing your money plan and allocations cleanly this month.
            </p>
          </div>
        </div>
      </div>
    );
  }

  function getSeverityConfig(item: InsightItem) {
    const sev = item.severity.toLowerCase();
    const type = item.type.toLowerCase();

    if (sev === "danger" || type.includes("exceeds")) {
      return {
        icon: AlertCircle,
        bg: "bg-red-50/40 border-red-100",
        iconColor: "text-red-700",
        textColor: "text-red-950",
        badgeBg: "bg-red-100/70 text-red-800",
      };
    }
    if (sev === "warning" || type.includes("behind") || type.includes("gap") || type.includes("spending_increase")) {
      return {
        icon: AlertTriangle,
        bg: "bg-amber-50/40 border-amber-100",
        iconColor: "text-amber-700",
        textColor: "text-amber-950",
        badgeBg: "bg-amber-100 text-amber-800",
      };
    }
    if (sev === "success" || type.includes("ahead")) {
      return {
        icon: CheckCircle2,
        bg: "bg-teal-50/40 border-teal-100",
        iconColor: "text-teal-700",
        textColor: "text-teal-950",
        badgeBg: "bg-teal-100 text-teal-800",
      };
    }
    return {
      icon: Sparkles,
      bg: "bg-slate-50/40 border-slate-100",
      iconColor: "text-ink-500",
      textColor: "text-ink-950",
      badgeBg: "bg-slate-200/50 text-ink-700",
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-ink-500">
          Vestor Insights
        </h3>
        <span className="text-[9px] font-semibold text-ink-400">Notice Board</span>
      </div>

      <div className="space-y-3">
        {prioritised.map((insight, index) => {
          const config = getSeverityConfig(insight);
          const Icon = config.icon;
          
          let linkPath = "/money";
          let actionLabel = "Adjust plan";
          if (insight.type.toLowerCase().includes("goal")) {
            linkPath = "/goals";
            actionLabel = "View goals";
          } else if (insight.type.toLowerCase().includes("invest") || insight.type.toLowerCase().includes("portfolio")) {
            linkPath = "/invest";
            actionLabel = "Portfolio details";
          }

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.15 }}
              className={`flex flex-col gap-4 rounded-xl border p-4 shadow-sm transition hover:shadow ${config.bg}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${config.iconColor}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${config.badgeBg}`}>
                    {insight.type.replace(/_/g, " ")}
                  </span>
                  <p className={`mt-1.5 text-xs font-semibold leading-relaxed ${config.textColor}`}>
                    {insight.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100/50 pt-3 text-[10px]">
                <span className="text-ink-400">Analysis signal</span>
                <Link
                  to={linkPath}
                  className="inline-flex items-center gap-1 font-semibold text-accent hover:text-teal-800"
                >
                  <span>{actionLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
