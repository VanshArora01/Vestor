import { Button } from "../../../components/ui/Button";

export function GoalsEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
      <h2 className="font-display text-2xl font-semibold text-slate-900">
        Give your money a destination.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        Create your first goal and track your progress toward something that matters to you.
      </p>
      <Button type="button" className="mt-6" onClick={onCreate}>
        Create your first goal
      </Button>
    </div>
  );
}
