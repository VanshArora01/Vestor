import { Check, X } from "lucide-react";

export interface InlineConfirmProps {
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
}

export function InlineConfirm({
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Reject",
  disabled = false,
}: InlineConfirmProps) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={onConfirm}
        className="inline-flex items-center gap-1 rounded-xl bg-[#22C55E] px-3 py-2 font-sans text-xs font-semibold text-[#121A15] transition-all hover:bg-[#4ADE80] active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
        title={confirmLabel}
      >
        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
        <span>{confirmLabel}</span>
      </button>

      {onCancel && (
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/5 px-2.5 py-2 font-sans text-xs font-medium text-white/85 transition-all hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
          title={cancelLabel}
        >
          <X className="h-3.5 w-3.5 stroke-[2]" />
          <span>{cancelLabel}</span>
        </button>
      )}
    </div>
  );
}
