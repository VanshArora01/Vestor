import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCcw,
  MessageSquare,
  Menu,
  X,
  CreditCard,
  PieChart,
  Target,
  ShieldCheck,
  TrendingUp,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { useVestorAI } from "../../context/VestorAIContext";
import { usePageContext } from "../../context/PageContext";
import { MessageBubble } from "../../features/ai/components/MessageBubble";
import { Composer } from "../../features/ai/components/Composer";
import { SuggestedPrompts } from "../../features/ai/components/SuggestedPrompts";

export function AdvisorPage() {
  const {
    activeConversationId,
    conversations,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    sendError,
    draftMessage,
    setDraftMessage,
    sendMessage,
    retryLastMessage,
    selectConversation,
    startNewConversation,
    deleteConversation,
    closeFloating,
  } = useVestorAI();

  const { context: pageContext } = usePageContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    closeFloating();
    document.title = "Vestor AI · Financial Intelligence";
  }, [closeFloating]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  const starterPrompts = [
    {
      icon: CreditCard,
      title: "What is my total verified connected cash?",
      description: "Aggregates confirmed balances across your linked bank accounts",
    },
    {
      icon: PieChart,
      title: "Compare my spending with my plan",
      description: "Reconciles actual bank outflows against your planned budget",
    },
    {
      icon: Target,
      title: "Explain my available-to-plan amount",
      description: "Shows carryover plus confirmed income for this month",
    },
    {
      icon: ShieldCheck,
      title: "How are my savings goals progressing?",
      description: "Checks goal ledgers, deadlines, and virtual earmarks",
    },
    {
      icon: TrendingUp,
      title: "Summarise my investment portfolio",
      description: "Total invested capital, asset allocation, and valuations",
    },
    {
      icon: HelpCircle,
      title: "Explain the 50-30-20 budgeting framework",
      description: "Educational guidance on Needs, Wants, and Savings allocation",
    },
  ];

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar (Quiet, Clean, Hairline Divider) ────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#EFF3F0]/60 border-r border-[#DCE4DF] flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        }`}
      >
        {/* New Chat action */}
        <div className="p-4 border-b border-[#DCE4DF] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              startNewConversation();
              setIsMobileSidebarOpen(false);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#121A15] hover:bg-[#1E2922] px-3.5 py-2.5 font-sans text-xs font-semibold text-white shadow-2xs transition-all active:brightness-95"
          >
            <Plus className="h-4 w-4 text-[#22C55E]" />
            <span>New Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1.5 text-[#8B909A] hover:text-[#141C16] rounded-lg hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-medium text-[#8B909A]">
            <span>History</span>
            <span className="tabular-nums font-mono text-[10px]">{conversations.length}</span>
          </div>

          {isLoadingConversations && conversations.length === 0 ? (
            <div className="space-y-2 p-1 pt-1">
              <div className="h-9 animate-pulse rounded-xl bg-white/70" />
              <div className="h-9 animate-pulse rounded-xl bg-white/70" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#8B909A]">
              <p>No chat history yet.</p>
              <p className="mt-1 text-[11px] text-[#8B909A]/80">Ask a question to begin.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const dateStr = new Date(conv.updated_at || conv.created_at).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#121A15] text-white shadow-2xs font-medium"
                      : "text-[#141C16] hover:bg-white/80"
                  }`}
                  onClick={() => {
                    void selectConversation(conv.id);
                    setIsMobileSidebarOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                    <MessageSquare
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isActive ? "text-[#22C55E]" : "text-[#8B909A]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{conv.title || "Conversation"}</p>
                      <span className={`text-[10px] tabular-nums font-mono ${isActive ? "text-[#8B909A]" : "text-[#8B909A]"}`}>
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this conversation?")) {
                        void deleteConversation(conv.id);
                      }
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-1 transition rounded ${
                      isActive ? "text-rose-300 hover:text-white" : "text-[#8B909A] hover:text-rose-600"
                    }`}
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Quiet Grounding Indicator */}
        <div className="p-3.5 border-t border-[#DCE4DF] bg-white text-[11px] text-[#8B909A]">
          <div className="flex items-center gap-2 font-medium text-[#141C16]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
            <span className="truncate">Grounded Tools Active</span>
          </div>
          <p className="mt-0.5 text-[10px] text-[#8B909A]">
            Context: {pageContext.route_title || "Overview"}
          </p>
        </div>
      </aside>

      {/* ── Main Chat Area ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Sleek Single Header (Replaces the clunky double header) */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between px-6 border-b border-[#DCE4DF] bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden -ml-1 p-1.5 text-[#141C16] rounded-xl hover:bg-[#EFF3F0]"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#121A15] text-[#22C55E]">
              <Sparkles className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <h2 className="font-sans text-sm font-semibold text-[#141C16] truncate">
                {activeConv?.title || "Vestor AI"}
              </h2>
              <p className="font-sans text-[11px] text-[#8B909A] truncate">
                Grounded Financial Copilot
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#8B909A] hidden sm:inline">
              Model: <span className="font-medium text-[#141C16]">Gemini 2.5 Flash</span>
            </span>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="mx-auto max-w-3xl h-full flex flex-col justify-between">
            {isLoadingMessages ? (
              <div className="flex h-full items-center justify-center py-20">
                <div className="space-y-2 text-center">
                  <Sparkles className="mx-auto h-5 w-5 animate-spin text-[#22C55E]" />
                  <p className="font-sans text-xs text-[#8B909A]">Loading conversation…</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col justify-center items-center py-8">
                <div className="text-center max-w-md mx-auto mb-8">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#121A15] text-[#22C55E] mb-3 shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-2xl font-normal text-[#141C16] tracking-tight">
                    How can I assist with your money?
                  </h3>
                  <p className="mt-1.5 text-xs text-[#8B909A] leading-relaxed">
                    Directly queries your bank balances, spending ledger, goal progress, and investment portfolio.
                  </p>
                </div>

                {/* Sleek prompt cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
                  {starterPrompts.map((prompt, idx) => {
                    const Icon = prompt.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => void sendMessage(prompt.title)}
                        className="group flex items-start gap-3 rounded-xl border border-[#DCE4DF] bg-white p-3.5 text-left transition-all hover:border-[#141C16] hover:bg-[#EFF3F0]/30 active:brightness-95"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EFF3F0] text-[#141C16] group-hover:bg-[#121A15] group-hover:text-[#22C55E] transition-colors mt-0.5">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-sans text-xs font-semibold text-[#141C16] group-hover:text-[#141C16] transition-colors leading-snug">
                            {prompt.title}
                          </p>
                          <p className="text-[11px] text-[#8B909A] mt-0.5 line-clamp-1">
                            {prompt.description}
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-[#8B909A] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}

                {isSending && (
                  <div className="flex gap-3 mb-4 items-center">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#121A15] text-[#22C55E]">
                      <Sparkles className="h-3.5 w-3.5 animate-spin" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-white border border-[#DCE4DF] px-4 py-3 text-xs text-[#141C16] flex items-center gap-2.5 shadow-2xs">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-ping" />
                      <span>Checking verified ledgers and running financial tools…</span>
                    </div>
                  </div>
                )}

                {sendError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span className="truncate">{sendError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void retryLastMessage()}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1 font-sans text-xs font-semibold text-rose-900 hover:bg-rose-200 transition shrink-0"
                    >
                      <RefreshCcw className="h-3 w-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Quick follow-up suggestions (clean hairline pills) */}
        {messages.length > 0 && (
          <div className="px-6 py-2 border-t border-[#DCE4DF]/40 bg-white">
            <div className="mx-auto max-w-3xl">
              <SuggestedPrompts
                prompts={pageContext.suggestedPrompts}
                onSelectPrompt={(prompt) => void sendMessage(prompt)}
                layout="horizontal"
              />
            </div>
          </div>
        )}

        {/* Input Composer Footer */}
        <footer className="p-4 sm:p-6 bg-white border-t border-[#DCE4DF]">
          <div className="mx-auto max-w-3xl">
            <Composer
              value={draftMessage}
              onChange={setDraftMessage}
              onSend={() => void sendMessage()}
              isSending={isSending}
              autoFocus={true}
            />
          </div>
        </footer>
      </main>
    </div>
  );
}
