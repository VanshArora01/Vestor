export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-300 border-t-accent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
