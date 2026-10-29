import { type ReactNode, useEffect, useId } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Sheet({ isOpen, onClose, title, description, children }: SheetProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink-950/40 backdrop-blur-xs transition-opacity"
          />

          {/* Panel */}
          <motion.div
            initial={reduceMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduceMotion ? undefined : { x: "100%" }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", damping: 25, stiffness: 220 }}
            className="relative z-10 flex h-full w-full max-w-2xl flex-col rounded-l-[20px] border-l border-[#DCE4DF] bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
          >
            <div className="flex items-center justify-between border-b border-[#DCE4DF] p-5">
              <div>
                <h3 id={titleId} className="text-lg font-semibold text-[#141C16]">{title}</h3>
                {description && <p id={descriptionId} className="mt-0.5 text-xs text-[#52615A]">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sheet"
                className="rounded-xl p-2 text-[#52615A] transition-colors hover:bg-[#EFF3F0] hover:text-[#141C16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
