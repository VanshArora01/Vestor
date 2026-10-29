import { Button } from "../../../components/ui/Button";

interface EmptyPortfolioProps {
  onAdd: () => void;
}

export function EmptyPortfolio({ onAdd }: EmptyPortfolioProps) {
  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
        Portfolio
      </p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
        Build your portfolio
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500 sm:text-base">
        Add your first investment and Vestor will start tracking your portfolio, performance, and
        monthly plan progress.
      </p>
      <Button type="button" className="mt-8" onClick={onAdd}>
        + Add Investment
      </Button>
    </section>
  );
}
