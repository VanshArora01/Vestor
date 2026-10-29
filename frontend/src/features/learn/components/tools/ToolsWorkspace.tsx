import { useState } from "react";
import { Budget503020Calculator } from "../calculators/Budget503020Calculator";
import { SipCalculator } from "../calculators/SipCalculator";
import { EmiCalculator } from "../calculators/EmiCalculator";
import { EmergencyRunwayCalculator } from "../calculators/EmergencyRunwayCalculator";
import { InflationCalculator } from "../calculators/InflationCalculator";
import { PieChart, TrendingUp, CreditCard, ShieldCheck, Flame } from "lucide-react";

export type ToolType = "budget" | "sip" | "emi" | "runway" | "inflation";

interface ToolsWorkspaceProps {
  initialTool?: ToolType;
}

const TOOLS: { id: ToolType; label: string; icon: typeof PieChart; description: string }[] = [
  {
    id: "budget",
    label: "50/30/20 Budget",
    icon: PieChart,
    description: "Partition monthly take-home salary into Needs, Wants, and Savings.",
  },
  {
    id: "sip",
    label: "SIP Compounding",
    icon: TrendingUp,
    description: "Model long-term systematic equity mutual fund wealth accumulation.",
  },
  {
    id: "emi",
    label: "Loan EMI",
    icon: CreditCard,
    description: "Calculate home, auto, or personal loan EMIs and total interest burden.",
  },
  {
    id: "runway",
    label: "Emergency Runway",
    icon: ShieldCheck,
    description: "Determine how many months your liquid savings can sustain your lifestyle.",
  },
  {
    id: "inflation",
    label: "Inflation Hurdle",
    icon: Flame,
    description: "Visualize how purchasing power declines and future living costs rise.",
  },
];

export function ToolsWorkspace({ initialTool = "budget" }: ToolsWorkspaceProps) {
  const [activeTool, setActiveTool] = useState<ToolType>(initialTool);

  return (
    <div className="space-y-6">
      {/* Tool Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTool(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition active:brightness-95 ${
                isActive
                  ? "bg-ink-950 text-white shadow-xs"
                  : "border border-slate-200 bg-white text-ink-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-accent" : "text-ink-500"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Calculator Container */}
      <div>
        {activeTool === "budget" && <Budget503020Calculator initialIncome={35000} />}
        {activeTool === "sip" && <SipCalculator />}
        {activeTool === "emi" && <EmiCalculator />}
        {activeTool === "runway" && <EmergencyRunwayCalculator />}
        {activeTool === "inflation" && <InflationCalculator />}
      </div>
    </div>
  );
}
