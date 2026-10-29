import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getApiErrorMessage } from "../../../api/client";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { formatCurrency, formatMonthLabel } from "../../money/utils/format";
import type { GoalDetail } from "../../../types/goals";
import { PaceStatusBadge } from "./PaceStatusBadge";

interface GoalDetailPanelProps {
  goal: GoalDetail;
  onClose: () => void;
  onContribute: (amount: string) => Promise<unknown>;
  onArchive: () => Promise<unknown>;
}

export function GoalDetailPanel({
  goal,
  onClose,
  onContribute,
  onArchive,
}: GoalDetailPanelProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const chartData = goal.contributions
    .slice()
    .reverse()
    .map((item) => ({
      label: new Date(item.contributed_on).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      amount: Number(item.amount),
    }));

  async function handleContribute() {
    setError(null);
    setIsSubmitting(true);
    try {
      await onContribute(amount);
      setAmount("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add contribution"));
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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{goal.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Deadline:{" "}
              {new Date(goal.deadline).toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <PaceStatusBadge status={goal.metrics.pace_status} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Metric label="Progress" value={formatCurrency(goal.current_amount)} sub={`of ${formatCurrency(goal.target_amount)}`} />
          <Metric label="Remaining" value={formatCurrency(goal.metrics.remaining_amount)} />
          <Metric label="Your plan" value={`${formatCurrency(goal.planned_monthly_contribution)}/mo`} />
          <Metric
            label="Required"
            value={
              goal.metrics.required_monthly_contribution
                ? `${formatCurrency(goal.metrics.required_monthly_contribution)}/mo`
                : "—"
            }
          />
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-600"
            style={{ width: `${Math.min(Number(goal.metrics.progress_percentage), 100)}%` }}
          />
        </div>

        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs flex justify-between items-center text-slate-500">
          <span className="font-medium uppercase tracking-wide">Stored in</span>
          <span className="font-semibold text-slate-900">
            {goal.linked_account ? (
              <span>
                {goal.linked_account.institution_name} ••••{goal.linked_account.masked_account_number} ({goal.linked_account.account_type})
              </span>
            ) : (
              <span>Manual tracking</span>
            )}
          </span>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Add contribution</h3>
          <p className="mt-1 text-xs text-slate-500">
            Record money you&apos;ve actually put toward this goal.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1">
              <Input
                label="Amount (₹)"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button type="button" isLoading={isSubmitting} onClick={handleContribute}>
              Add contribution
            </Button>
          </div>
          {error ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {chartData.length > 0 ? (
          <div className="mt-6 h-48">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Contribution history</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) =>
                    formatCurrency(value !== undefined ? String(value) : "0")
                  }
                />
                <Bar dataKey="amount" fill="#0F766E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {goal.plan_history.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">Money Plan history</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {goal.plan_history.map((item) => (
                <li key={`${item.year}-${item.month}`} className="flex justify-between">
                  <span>{formatMonthLabel(item.year, item.month)}</span>
                  <span className="tabular-nums">{formatCurrency(item.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          {goal.status === "active" ? (
            <Button
              type="button"
              variant="ghost"
              className="!text-red-700"
              onClick={() => onArchive()}
            >
              Archive goal
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
      {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}
