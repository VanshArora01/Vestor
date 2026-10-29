import type { GoalInsight } from "../utils/buildStaticGoalInsight";

interface GoalInsightCardProps {
  insight: GoalInsight;
}

function InsightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 text-teal-700"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 3.5l1.1 2.8 2.9.3-2.2 2 0.7 2.8L10 9.9 7.5 11.4l.7-2.8-2.2-2 2.9-.3L10 3.5z"
      />
      <path strokeLinecap="round" d="M15.5 14.5h.01M4.5 15h.01M16 7.5h.01" />
    </svg>
  );
}

export function GoalInsightCard({ insight }: GoalInsightCardProps) {
  return (
    <section
      aria-labelledby="vestor-insights-heading"
      className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-teal-200 bg-white">
            <InsightIcon />
          </span>
          <div>
            <h2
              id="vestor-insights-heading"
              className="text-sm font-semibold tracking-wide text-slate-900"
            >
              Vestor Insights
            </h2>
            <p className="text-xs text-slate-500">Today&apos;s insight</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md border border-teal-200 bg-white px-2 py-0.5 text-xs font-medium text-teal-800">
          Updated today
        </span>
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900">{insight.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{insight.message}</p>
      <p className="mt-3 text-xs text-slate-500">
        Based on your current goals and contributions · Today&apos;s insight
      </p>
    </section>
  );
}
