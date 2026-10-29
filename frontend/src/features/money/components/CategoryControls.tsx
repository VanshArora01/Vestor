import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { AllocationSemanticType, MoneyCategory } from "../../../types/money";
import { getApiErrorMessage } from "../../../api/client";

const SEMANTIC_OPTIONS: Array<{ value: AllocationSemanticType; label: string }> = [
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
  { value: "goal", label: "Goal" },
  { value: "expense", label: "Expense" },
  { value: "other", label: "Other" },
];

interface CategoryRowMenuProps {
  category: MoneyCategory;
  onRename: (name: string, semanticType?: AllocationSemanticType) => Promise<void> | Promise<unknown>;
  onHide: () => Promise<void> | Promise<unknown>;
  showSemanticType?: boolean;
}

export function CategoryRowMenu({
  category,
  onRename,
  onHide,
  showSemanticType = false,
}: CategoryRowMenuProps) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(category.name);
  const [semanticType, setSemanticType] = useState<AllocationSemanticType>(
    category.semantic_type ?? "other",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setName(category.name);
    setSemanticType(category.semantic_type ?? "other");
  }, [category.name, category.semantic_type]);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setRenaming(false);
        setError(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!category.is_custom) return null;

  async function submitRename() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onRename(trimmed, showSemanticType ? semanticType : undefined);
      setRenaming(false);
      setOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not rename"));
    } finally {
      setBusy(false);
    }
  }

  async function submitHide() {
    setBusy(true);
    setError(null);
    try {
      await onHide();
      setOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not hide category"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Manage ${category.name}`}
        className="rounded-md px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        onClick={() => {
          setOpen((value) => !value);
          setRenaming(false);
          setError(null);
        }}
      >
        ···
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
        >
          {renaming ? (
            <div className="space-y-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-label="Category name"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                autoFocus
              />
              {showSemanticType ? (
                <select
                  value={semanticType}
                  onChange={(event) =>
                    setSemanticType(event.target.value as AllocationSemanticType)
                  }
                  aria-label="Category type"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-teal-700"
                >
                  {SEMANTIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
              {error ? <p className="text-xs text-red-600">{error}</p> : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-md bg-teal-800 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                  onClick={submitRename}
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  onClick={() => {
                    setRenaming(false);
                    setError(null);
                    setName(category.name);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <button
                type="button"
                role="menuitem"
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setRenaming(true)}
              >
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={submitHide}
                disabled={busy}
              >
                Hide category
              </button>
              {error ? <p className="px-2 pt-1 text-xs text-red-600">{error}</p> : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface AddCategoryFormProps {
  mode: "money_plan" | "spending";
  onCreate: (payload: {
    name: string;
    amount: string;
    semantic_type?: AllocationSemanticType;
  }) => Promise<void>;
}

export function AddCategoryForm({ mode, onCreate }: AddCategoryFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [semanticType, setSemanticType] = useState<AllocationSemanticType>("other");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        name: trimmed,
        amount,
        ...(mode === "money_plan" ? { semantic_type: semanticType } : {}),
      });
      setName("");
      setAmount("");
      setSemanticType("other");
      setOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not add category"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="mt-3 text-sm font-medium text-teal-800 hover:text-teal-900"
        onClick={() => setOpen(true)}
      >
        + Add category
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3"
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Category name"
        aria-label="New category name"
        className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
        autoFocus
      />
      {mode === "money_plan" ? (
        <select
          value={semanticType}
          onChange={(event) => setSemanticType(event.target.value as AllocationSemanticType)}
          aria-label="Category type"
          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-teal-700"
        >
          {SEMANTIC_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      <input
        type="number"
        min="0"
        step="1"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="Amount (optional)"
        aria-label="New category amount"
        className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-right text-sm tabular-nums outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
      />
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md px-3 py-1.5 text-xs text-slate-600 hover:bg-white"
          onClick={() => {
            setOpen(false);
            setError(null);
            setName("");
            setAmount("");
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
