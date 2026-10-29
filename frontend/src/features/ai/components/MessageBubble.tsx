import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import type { AdvisorMessage } from "../../../api/advisor";
import { MarkdownContent } from "./MarkdownContent";

interface MessageBubbleProps {
  message: AdvisorMessage;
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  get_financial_overview: "Verified connected cash",
  get_monthly_summary: "Money plan metrics",
  get_spending_breakdown: "Spending breakdown",
  get_transactions: "Bank transactions",
  get_savings_goals: "Goal ledgers",
  get_account_details: "Account details",
  get_portfolio_summary: "Portfolio valuations",
  get_financial_education: "Financial principles",
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 group">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-[#121A15] px-4 py-3 text-white shadow-2xs">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          <div className="mt-1 text-right text-[10px] text-[#8B909A] tabular-nums font-mono">{formattedTime}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-5 group">
      {/* Sleek brand icon badge */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#121A15] text-[#22C55E] mt-0.5 shadow-2xs">
        <Sparkles className="h-3.5 w-3.5" />
      </div>

      <div className="flex-1 max-w-[95%] sm:max-w-[88%] space-y-2">
        {/* Anti-slop tool badges: neutral hairline outline, no colored pill backgrounds */}
        {message.tools_used && message.tools_used.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-0.5">
            {message.tools_used.map((tool, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE4DF] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#141C16]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                {TOOL_DISPLAY_NAMES[tool] || tool}
              </span>
            ))}
          </div>
        )}

        {/* Message Card */}
        <div className="rounded-2xl rounded-tl-sm bg-white border border-[#DCE4DF] p-4 sm:p-5 shadow-xs transition-colors">
          <MarkdownContent content={message.content} />

          {/* Footer toolbar: clean hairline divider */}
          <div className="mt-3 pt-2.5 border-t border-[#DCE4DF]/40 flex items-center justify-between text-[11px] text-[#8B909A]">
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-mono text-[10px]">{formattedTime}</span>
              {message.provider && (
                <span className="capitalize text-[10px] bg-[#EFF3F0] rounded px-1.5 py-0.5 text-[#141C16] font-medium border border-[#DCE4DF]">
                  {message.provider}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 hover:text-[#141C16] transition px-2 py-0.5 rounded hover:bg-[#EFF3F0]"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-[#22C55E]" />
                  <span className="text-[#22C55E] font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
