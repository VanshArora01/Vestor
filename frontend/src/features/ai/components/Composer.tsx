import { useRef, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function Composer({
  value,
  onChange,
  onSend,
  isSending,
  placeholder = "Ask Vestor AI anything about your accounts, net worth, budgets, or plan...",
  autoFocus = false,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isSending) {
        onSend();
      }
    }
  };

  const canSend = Boolean(value.trim()) && !isSending;

  return (
    <div className="relative rounded-2xl bg-white border border-[#DCE4DF] shadow-xs focus-within:border-[#141C16] focus-within:ring-1 focus-within:ring-[#141C16] transition-all">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSending}
        className="w-full resize-none border-0 bg-transparent px-4 pt-3.5 pb-11 text-sm text-[#141C16] placeholder:text-[#8B909A] focus:outline-none focus:ring-0 leading-relaxed max-h-40 disabled:opacity-50"
      />

      <div className="absolute left-3.5 bottom-2.5 flex items-center gap-2 text-[11px] text-[#8B909A]">
        <span>Press <kbd className="font-mono text-[10px] bg-[#EFF3F0] px-1.5 py-0.5 rounded text-[#141C16] font-medium">↵</kbd> to send</span>
      </div>

      <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (canSend) onSend();
          }}
          disabled={!canSend}
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
            canSend
              ? "bg-[#121A15] text-[#22C55E] hover:bg-[#1A241E] shadow-xs active:brightness-95"
              : "bg-[#EFF3F0] text-[#8B909A]/40 cursor-not-allowed"
          }`}
          title="Send message (Enter)"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#22C55E]" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
