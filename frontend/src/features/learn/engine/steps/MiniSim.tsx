import { useState } from "react";
import { motion } from "framer-motion";
import type { MiniSimStep } from "../stepTypes";
import { GuideCharacter } from "../GuideCharacter";
import { computeMiniSim } from "../lessonEngine";
import { ArrowRight } from "lucide-react";

interface MiniSimProps {
  step: MiniSimStep;
  isLastStep?: boolean;
  onComplete: (value: number) => void;
}

export function MiniSim({ step, isLastStep = false, onComplete }: MiniSimProps) {
  const [val, setVal] = useState(step.inputDefault);
  const [hasInteracted, setHasInteracted] = useState(false);

  const outputs = computeMiniSim(step.simType, val);

  const pct = ((val - step.inputMin) / (step.inputMax - step.inputMin)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex min-h-[28rem] flex-col gap-6"
    >
      <div className="flex items-start gap-4">
        <GuideCharacter state={hasInteracted ? "celebrate" : "thinking"} size="sm" />
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-accent font-sans">
            Interactive Simulator
          </span>
          <h2 className="text-xl font-bold font-display text-ink-950">{step.title}</h2>
          <p className="text-sm text-ink-700 font-sans leading-relaxed">{step.description}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm font-sans font-medium">
            <span className="text-ink-700">{step.inputLabel}</span>
            <span className="font-bold text-accent text-base tabular-nums">
              {step.inputUnit === "₹" ? `₹${val.toLocaleString("en-IN")}` : `${val}${step.inputUnit}`}
            </span>
          </div>

          <div className="relative">
            <input
              type="range"
              min={step.inputMin}
              max={step.inputMax}
              step={step.inputStep}
              value={val}
              aria-label={step.inputLabel}
              onChange={(e) => {
                setVal(Number(e.target.value));
                setHasInteracted(true);
              }}
              className="w-full h-2 appearance-none rounded-full outline-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #0F766E ${pct}%, #E2E8F0 ${pct}%)`,
              }}
            />
          </div>

          <div className="flex justify-between text-xs text-ink-500 font-sans">
            <span>{step.inputUnit === "₹" ? `₹${step.inputMin.toLocaleString("en-IN")}` : `${step.inputMin}${step.inputUnit}`}</span>
            <span>{step.inputUnit === "₹" ? `₹${step.inputMax.toLocaleString("en-IN")}` : `${step.inputMax}${step.inputUnit}`}</span>
          </div>
        </div>

        {/* Dynamic Computed Outputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          {outputs.map((item, idx) => (
            <div
              key={idx}
              className={`rounded-xl p-3.5 border transition-all ${
                item.highlight
                  ? "bg-teal-50/70 border-teal-200 text-teal-950 shadow-xs"
                  : "bg-slate-50/70 border-slate-200 text-ink-950"
              }`}
            >
              <div className="text-xs text-ink-500 font-sans">{item.label}</div>
              <div className="text-lg font-bold font-sans mt-0.5 tabular-nums text-accent">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lesson-action-rail">
        <p className="mr-auto hidden text-xs font-medium text-slate-500 sm:block">Adjust the input to explore the result.</p>
        <button type="button" onClick={() => onComplete(val)} className="lesson-primary-action w-full sm:w-auto"><span>{isLastStep ? "Finish lesson" : "Continue"}</span><ArrowRight className="h-4 w-4" /></button>
      </div>
    </motion.div>
  );
}
