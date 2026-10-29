import { useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  Building2,
  Target,
  PieChart,
  GraduationCap,
  Sparkles,
  PlusCircle,
  Search,
} from "lucide-react";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  function runCommand(command: () => void) {
    onOpenChange(false);
    command();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <Command
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-card bg-surface border border-border shadow-2xl"
        loop
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted" />
          <Command.Input
            placeholder="Type a command, page, or question..."
            className="w-full bg-transparent text-sm text-text placeholder:text-muted outline-none font-sans"
            autoFocus
          />
          <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-sans text-muted">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-72 overflow-y-auto p-2 font-sans text-xs">
          <Command.Empty className="py-6 text-center text-muted">
            No matching results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="px-2 py-1 text-[11px] font-semibold text-muted">
            <Command.Item
              onSelect={() => runCommand(() => navigate("/dashboard"))}
              className="flex items-center gap-2 rounded-control px-2.5 py-2 text-text hover:bg-surface-2 cursor-pointer aria-selected:bg-surface-2"
            >
              <LayoutDashboard className="h-4 w-4 text-accent" />
              <span>Dashboard</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/money"))}
              className="flex items-center gap-2 rounded-control px-2.5 py-2 text-text hover:bg-surface-2 cursor-pointer aria-selected:bg-surface-2"
            >
              <Wallet className="h-4 w-4 text-accent" />
              <span>Money Plan</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/accounts"))}
              className="flex items-center gap-2 rounded-control px-2.5 py-2 text-text hover:bg-surface-2 cursor-pointer aria-selected:bg-surface-2"
            >
              <Building2 className="h-4 w-4 text-accent" />
              <span>Accounts</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/goals"))}
              className="flex items-center gap-2 rounded-control px-2.5 py-2 text-text hover:bg-surface-2 cursor-pointer aria-selected:bg-surface-2"
            >
              <Target className="h-4 w-4 text-accent" />
              <span>Goals</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/invest"))}
              className="flex items-center gap-2 rounded-control px-2.5 py-2 text-text hover:bg-surface-2 cursor-pointer aria-selected:bg-surface-2"
            >
              <PieChart className="h-4 w-4 text-accent" />
              <span>Portfolio</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/learn"))}
              className="flex items-center gap-2 rounded-control px-2.5 py-2 text-text hover:bg-surface-2 cursor-pointer aria-selected:bg-surface-2"
            >
              <GraduationCap className="h-4 w-4 text-accent" />
              <span>Learn Academy</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Quick Actions" className="px-2 py-1 text-[11px] font-semibold text-muted border-t border-border mt-1">
            <Command.Item
              onSelect={() => runCommand(() => navigate("/goals"))}
              className="flex items-center gap-2 rounded-control px-2.5 py-2 text-text hover:bg-surface-2 cursor-pointer aria-selected:bg-surface-2"
            >
              <PlusCircle className="h-4 w-4 text-muted" />
              <span>Create new goal</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/accounts"))}
              className="flex items-center gap-2 rounded-control px-2.5 py-2 text-text hover:bg-surface-2 cursor-pointer aria-selected:bg-surface-2"
            >
              <Building2 className="h-4 w-4 text-muted" />
              <span>Connect bank account</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/ai"))}
              className="flex items-center gap-2 rounded-control px-2.5 py-2 text-text hover:bg-surface-2 cursor-pointer aria-selected:bg-surface-2"
            >
              <Sparkles className="h-4 w-4 text-accent" />
              <span>Ask Vestor AI</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
