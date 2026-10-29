import { Sparkles } from "lucide-react";

interface SuggestedPromptsProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
  layout?: "horizontal" | "wrap";
}

export function SuggestedPrompts({
  prompts,
  onSelectPrompt,
  layout = "wrap",
}: SuggestedPromptsProps) {
  if (!prompts || prompts.length === 0) return null;

  return (
    <div
      className={
        layout === "horizontal"
          ? "flex gap-2 overflow-x-auto pb-1 scrollbar-none"
          : "flex flex-wrap gap-2"
      }
    >
      {prompts.map((prompt, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelectPrompt(prompt)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE4DF] bg-white px-3 py-1.5 text-xs text-[#141C16] shadow-2xs transition hover:border-[#22C55E] hover:bg-[#EFF3F0]/60 hover:text-[#141C16] active:brightness-95 text-left shrink-0 font-medium"
        >
          <Sparkles className="h-3 w-3 text-[#22C55E] shrink-0" />
          <span>{prompt}</span>
        </button>
      ))}
    </div>
  );
}
