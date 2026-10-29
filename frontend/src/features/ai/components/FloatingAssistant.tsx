import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  X,
  Minus,
  Maximize2,
  Plus,
  AlertCircle,
  RefreshCcw,
  Compass,
} from "lucide-react";
import { useVestorAI } from "../../../context/VestorAIContext";
import { usePageContext } from "../../../context/PageContext";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { SuggestedPrompts } from "./SuggestedPrompts";

export function FloatingAssistant() {
  const navigate = useNavigate();
  const {
    isFloatingOpen,
    isFloatingMinimized,
    openFloating,
    closeFloating,
    minimizeFloating,
    restoreFloating,
    messages,
    isSending,
    sendError,
    draftMessage,
    setDraftMessage,
    sendMessage,
    retryLastMessage,
    startNewConversation,
  } = useVestorAI();

  const { context: pageContext } = usePageContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isFloatingOpen && !isFloatingMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending, isFloatingOpen, isFloatingMinimized]);

  const handleExpandToWorkspace = () => {
    closeFloating();
    navigate("/ai");
  };

  // If closed completely, render the fixed launcher button
  if (!isFloatingOpen && !isFloatingMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <button
          type="button"
          onClick={openFloating}
          className="group relative flex h-11 items-center gap-2 rounded-full bg-ink-950 px-3.5 py-2 text-white shadow-lg ring-1 ring-white/10 transition-all  hover:bg-slate-900 hover:shadow-xl active:brightness-95"
          title="Open Vestor AI Assistant"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-xs ring-2 ring-accent/30 group-hover:rotate-12 transition-transform">
            <Sparkles className="h-3 w-3" />
          </div>
          <div className="flex items-center gap-1.5 text-left">
            <span className="font-display text-xs font-semibold tracking-tight">Vestor AI</span>
            {pageContext.route_title && (
              <span className="hidden sm:inline-block rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-slate-300 font-sans max-w-[120px] truncate">
                {pageContext.route_title}
              </span>
            )}
          </div>
        </button>
      </div>
    );
  }

  // If minimized, render a sleek compact pill
  if (isFloatingMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-md ring-1 ring-black/5">
          <button
            type="button"
            onClick={restoreFloating}
            className="flex items-center gap-2 text-xs font-medium text-ink-900 hover:text-accent transition"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
              <Sparkles className="h-2.5 w-2.5" />
            </div>
            <span className="font-display text-[11px] font-semibold">Vestor AI</span>
            {messages.length > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] text-slate-600 font-mono">
                {messages.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={closeFloating}
            className="p-0.5 rounded-full text-slate-400 hover:text-slate-600 transition"
            title="Close"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  // Floating Window (Refined, Compact, Elegant)
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col w-[350px] max-w-[calc(100vw-1.5rem)] h-[480px] max-h-[calc(100dvh-5rem)] rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-xs ring-2 ring-accent/20">
            <Sparkles className="h-3 w-3" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-display text-xs font-semibold text-ink-950">Vestor AI</h2>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            {pageContext.route_title && (
              <div className="flex items-center gap-1 text-[10px] text-ink-500 truncate">
                <Compass className="h-2.5 w-2.5 shrink-0 text-accent" />
                <span className="truncate">{pageContext.route_title}</span>
                {pageContext.active_month && <span className="shrink-0">• {pageContext.active_month}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={startNewConversation}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            title="New conversation"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExpandToWorkspace}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            title="Full workspace (/ai)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={minimizeFloating}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            title="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={closeFloating}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center items-center text-center px-2 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent mb-2">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-display text-sm font-semibold text-ink-950">
              Personal Finance Copilot
            </h3>
            <p className="mt-0.5 text-[11px] text-ink-500 max-w-[260px] leading-relaxed">
              Viewing {pageContext.route_title || "Vestor"}. Verified tools ensure answers reflect your real finances.
            </p>

            <div className="mt-4 w-full space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left">
                Suggested questions:
              </p>
              <SuggestedPrompts
                prompts={pageContext.suggestedPrompts}
                onSelectPrompt={(prompt) => void sendMessage(prompt)}
                layout="wrap"
              />
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Thinking / Tool Execution State */}
            {isSending && (
              <div className="flex gap-2.5 mb-3 items-center">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-xs ring-1 ring-accent/20">
                  <Sparkles className="h-2.5 w-2.5 animate-spin" />
                </div>
                <div className="rounded-xl rounded-tl-sm bg-slate-100/90 border border-slate-200/80 px-3 py-1.5 text-[11px] text-slate-600 flex items-center gap-1.5 shadow-xs">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
                  <span>Checking verified records & formulating answer…</span>
                </div>
              </div>
            )}

            {/* Send Error Notice */}
            {sendError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                  <span className="truncate">{sendError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void retryLastMessage()}
                  className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-900 hover:bg-red-200 transition shrink-0"
                >
                  <RefreshCcw className="h-2.5 w-2.5" />
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Suggested chips above composer if conversation is underway */}
      {messages.length > 0 && (
        <div className="px-3 py-1 border-t border-slate-100 bg-slate-50/40">
          <SuggestedPrompts
            prompts={pageContext.suggestedPrompts.slice(0, 3)}
            onSelectPrompt={(prompt) => void sendMessage(prompt)}
            layout="horizontal"
          />
        </div>
      )}

      {/* Footer Composer */}
      <div className="border-t border-slate-100 bg-white p-2.5">
        <Composer
          value={draftMessage}
          onChange={setDraftMessage}
          onSend={() => void sendMessage()}
          isSending={isSending}
          autoFocus={false}
        />
        <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 px-0.5">
          <span>Enter ↵ to send • Shift+Enter for newline</span>
          <span>Verified read-only tools</span>
        </div>
      </div>
    </div>
  );
}
