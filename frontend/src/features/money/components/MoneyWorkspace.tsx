import type { ReactNode } from "react";

interface MoneyWorkspaceProps {
  planPanel: ReactNode;
  spendingPanel: ReactNode;
}

export function MoneyWorkspace({ planPanel, spendingPanel }: MoneyWorkspaceProps) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
      <div className="min-w-0">{planPanel}</div>
      <div className="min-w-0">{spendingPanel}</div>
    </div>
  );
}
