import { useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import { Button } from "../../../components/ui/Button";
import { formatMonthLabel } from "../utils/format";

interface UnlockMonthDialogProps {
  year: number;
  month: number;
  onUnlock: () => Promise<unknown>;
}

export function UnlockMonthDialog({ year, month, onUnlock }: UnlockMonthDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  async function handleUnlock() {
    setError(null);
    setIsUnlocking(true);
    try {
      await onUnlock();
      setIsOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to unlock month"));
    } finally {
      setIsUnlocking(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg px-2 py-2 text-xs font-medium text-white/85 underline-offset-2 hover:bg-white/10 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
      >
        Unlock to edit
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-dialog-title"
    >
      <div className="w-full max-w-md rounded-[20px] border border-[#DCE4DF] bg-white p-6 shadow-sm">
        <h3 id="unlock-dialog-title" className="text-lg font-semibold text-[#141C16]">
          Unlock {formatMonthLabel(year, month)}?
        </h3>
        <p className="mt-2 text-sm text-[#52615A]">
          Editing a past month may affect historical comparisons.
        </p>
        {error ? (
          <p className="mt-2 text-sm text-[#B42318]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button type="button" isLoading={isUnlocking} onClick={handleUnlock}>
            Unlock
          </Button>
        </div>
      </div>
    </div>
  );
}
