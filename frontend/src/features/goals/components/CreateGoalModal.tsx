import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getConnections } from "../../../api/banking";
import { getApiErrorMessage } from "../../../api/client";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { formatCurrency } from "../../money/utils/format";
import type { CreateGoalPayload, Goal, GoalType } from "../../../types/goals";
import { PaceStatusBadge } from "./PaceStatusBadge";

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateGoalPayload) => Promise<Goal>;
}

type Step = "basics" | "amounts" | "timeframe" | "preview";

function estimatePreview(payload: {
  target: string;
  current: string;
  planned: string;
  months: string;
}) {
  const target = Number(payload.target) || 0;
  const current = Number(payload.current) || 0;
  const planned = Number(payload.planned) || 0;
  const months = Number(payload.months) || 0;
  const remaining = Math.max(0, target - current);
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const required = months > 0 ? remaining / months : null;
  let status: "AHEAD" | "ON_TRACK" | "BEHIND" = "BEHIND";
  if (required !== null && planned > 0) {
    if (planned > required * 1.05) status = "AHEAD";
    else if (planned >= required * 0.95) status = "ON_TRACK";
  }
  const etaMonths = planned > 0 ? Math.ceil(remaining / planned) : null;
  const etaDate =
    etaMonths !== null
      ? new Date(new Date().setMonth(new Date().getMonth() + etaMonths))
      : null;
  const deadline =
    months > 0 ? new Date(new Date().setMonth(new Date().getMonth() + months)) : null;

  return { progress, required, status, etaMonths, etaDate, deadline, remaining };
}

export function CreateGoalModal({ isOpen, onClose, onSubmit }: CreateGoalModalProps) {
  const [step, setStep] = useState<Step>("basics");
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("general");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [plannedMonthly, setPlannedMonthly] = useState("");
  const [monthsUntil, setMonthsUntil] = useState("12");
  const [description, setDescription] = useState("");
  const [keepWhere, setKeepWhere] = useState<"manual" | "connected">("manual");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: connections } = useQuery({
    queryKey: ["connections"],
    queryFn: getConnections,
    enabled: isOpen,
  });

  const activeAccounts = useMemo(() => {
    const activeConns = connections?.filter(c => c.status === "ACTIVE" || c.status === "NEEDS_ATTENTION") || [];
    return activeConns.flatMap(c => c.accounts.filter(a => a.status === "ACTIVE"));
  }, [connections]);

  const preview = useMemo(
    () =>
      estimatePreview({
        target: targetAmount,
        current: currentAmount,
        planned: plannedMonthly,
        months: monthsUntil,
      }),
    [targetAmount, currentAmount, plannedMonthly, monthsUntil],
  );

  if (!isOpen) return null;

  function reset() {
    setStep("basics");
    setName("");
    setGoalType("general");
    setTargetAmount("");
    setCurrentAmount("0");
    setPlannedMonthly("");
    setMonthsUntil("12");
    setDescription("");
    setKeepWhere("manual");
    setLinkedAccountId("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        goal_type: goalType,
        target_amount: targetAmount,
        current_amount: currentAmount || "0",
        planned_monthly_contribution: plannedMonthly,
        months_until_deadline: Number(monthsUntil),
        description: description.trim() || undefined,
        linked_account_id: keepWhere === "connected" && linkedAccountId ? linkedAccountId : null,
      });
      handleClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create goal"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900">Create goal</h2>
        <p className="mt-1 text-sm text-slate-500">
          Step {step === "basics" ? 1 : step === "amounts" ? 2 : step === "timeframe" ? 3 : 4} of 4
        </p>

        {step === "basics" ? (
          <div className="mt-5 space-y-4">
            <Input label="Goal name" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Goal type</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="general">General goal</option>
                <option value="emergency_fund">Emergency Fund</option>
                <option value="savings">Savings Fund</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Where will you keep this money?</label>
              <select
                value={keepWhere}
                onChange={(e) => {
                  const val = e.target.value as "manual" | "connected";
                  setKeepWhere(val);
                  if (val === "manual") {
                    setLinkedAccountId("");
                  } else if (activeAccounts.length > 0) {
                    setLinkedAccountId(activeAccounts[0].id);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="manual">Manual tracking</option>
                <option value="connected">Connected account</option>
              </select>
            </div>
            {keepWhere === "connected" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Select connected account</label>
                {activeAccounts.length > 0 ? (
                  <select
                    value={linkedAccountId}
                    onChange={(e) => setLinkedAccountId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.institution_name} ••••{a.masked_account_number} ({a.purpose || "Other"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-600 mt-1">
                    No active connected accounts found.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}

        {step === "amounts" ? (
          <div className="mt-5 space-y-4">
            <Input
              label="Target amount (₹)"
              type="number"
              min="1"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
            <Input
              label="Current amount (₹)"
              type="number"
              min="0"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
            />
            <Input
              label="Planned monthly contribution (₹)"
              type="number"
              min="0"
              value={plannedMonthly}
              onChange={(e) => setPlannedMonthly(e.target.value)}
            />
          </div>
        ) : null}

        {step === "timeframe" ? (
          <div className="mt-5 space-y-4">
            <Input
              label="How many months do you have?"
              type="number"
              min="1"
              value={monthsUntil}
              onChange={(e) => setMonthsUntil(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : null}

        {step === "preview" ? (
          <div className="mt-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Target</span>
              <span className="font-semibold tabular-nums">{formatCurrency(targetAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Monthly contribution</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(plannedMonthly)}/mo
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Deadline</span>
              <span className="font-semibold">
                {preview.deadline?.toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Estimated completion</span>
              <span className="font-semibold">
                {preview.etaDate
                  ? preview.etaDate.toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })
                  : "No contribution plan set"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-600">Status</span>
              <PaceStatusBadge status={preview.status} />
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (step === "basics") handleClose();
              else if (step === "amounts") setStep("basics");
              else if (step === "timeframe") setStep("amounts");
              else setStep("timeframe");
            }}
          >
            {step === "basics" ? "Cancel" : "Back"}
          </Button>
          {step === "preview" ? (
            <Button type="button" isLoading={isSubmitting} onClick={handleCreate}>
              Create goal
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                if (step === "basics") setStep("amounts");
                else if (step === "amounts") setStep("timeframe");
                else setStep("preview");
              }}
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
