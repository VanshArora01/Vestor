export function suggestPlanSplit(availableToPlan: number) {
  const safeAvailable = Number.isFinite(availableToPlan) ? Math.max(0, availableToPlan) : 0;
  const availablePaise = Math.round(safeAvailable * 100);
  const needsPaise = Math.round(availablePaise * 0.5);
  const wantsPaise = Math.round(availablePaise * 0.3);
  const savingsPaise = availablePaise - needsPaise - wantsPaise;

  return {
    needs: needsPaise / 100,
    wants: wantsPaise / 100,
    savings: savingsPaise / 100,
  };
}
