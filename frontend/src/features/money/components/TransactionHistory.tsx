import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  BusFront,
  CircleDollarSign,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  House,
  ReceiptText,
  Search,
  ShoppingBag,
  Utensils,
  WalletCards,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { analyzeTransactionMonth, getAllTransactions, getConnections, updateTransactionClassification } from "../../../api/banking";
import { MoneyAmount } from "../../../components/ui/MoneyAmount";
import { Sheet } from "../../../components/ui/Sheet";
import type { TransactionSchemaType } from "../../../schemas/banking";
import type { IncomeCandidate, MoneyCategory } from "../../../types/money";
import type { MonthlyTransactionAnalysis } from "../../../api/banking";
import { getCategoryColor } from "../utils/categoryColors";

interface Props {
  year: number;
  month: number;
  categories: MoneyCategory[];
  accountId: string;
  onAccountChange: (accountId: string, isSimulated: boolean) => void;
  onIncomeCandidatesChange?: (candidates: IncomeCandidate[]) => void;
  selectedCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
  onDemoSourceChange?: (isDemo: boolean) => void;
  onAnalysis?: (summary: MonthlyTransactionAnalysis | null) => void;
}

const monthLabel = (year: number, month: number) => new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
const noiseTerms = new Set(["upi", "neft", "imps", "rtgs", "nach", "pos", "atm", "dr", "cr", "pay", "to", "from", "ref", "txn"]);

function merchantName(tx: TransactionSchemaType) {
  const direct = tx.merchant_name?.trim();
  if (direct && !/^upi|neft|imps|pos|atm|bank transfer$/i.test(direct)) return direct;
  const parts = (tx.narration ?? "").split(/[\/*|,;]+/).map((part) => part.trim()).filter(Boolean);
  const candidate = [...parts].reverse().find((part) => {
    const normalized = part.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    return normalized.length >= 3 && !/^\d+$/.test(normalized) && !noiseTerms.has(normalized);
  });
  if (!candidate) return "Bank transaction";
  return candidate.replace(/\s+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function categoryName(tx: TransactionSchemaType) {
  const value = tx.category?.trim();
  if (value && !["unclassified", "uncategorised", "uncategorized"].includes(value.toLowerCase())) return value;
  if (tx.classification === "INCOME") return "Income";
  if (tx.classification === "TRANSFER") return "Transfer";
  if (tx.classification === "INVESTMENT") return "Investment";
  return "Uncategorised";
}

function suggestedCategory(tx: TransactionSchemaType, categories: MoneyCategory[]) {
  if (tx.transaction_type !== "DEBIT") return "";
  const text = `${tx.category ?? ""} ${tx.merchant_name ?? ""} ${tx.narration ?? ""}`.toLowerCase();
  return categories.find((category) => {
    if (category.is_others) return false;
    const terms = [category.name, category.slug].map((term) => term.toLowerCase().replace(/[-_]/g, " "));
    return terms.some((term) => term && (text.includes(term) || term.split(" ").some((word) => word.length > 3 && text.includes(word))));
  })?.name ?? "";
}

function transactionIcon(name: string, income: boolean): LucideIcon {
  if (income) return CircleDollarSign;
  const value = name.toLowerCase();
  if (/food|grocery|restaurant|dining/.test(value)) return Utensils;
  if (/rent|home|housing/.test(value)) return House;
  if (/transport|travel|fuel|commute/.test(value)) return BusFront;
  if (/health|medical|pharmacy/.test(value)) return HeartPulse;
  if (/education|book|course/.test(value)) return BookOpen;
  if (/utility|electric|water|internet|bill/.test(value)) return Zap;
  if (/saving|investment|mutual|stock|sip/.test(value)) return WalletCards;
  if (/shopping|personal/.test(value)) return ShoppingBag;
  return ReceiptText;
}

function dateKey(timestamp: string) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readableDate(key: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "long" }).format(new Date(`${key}T12:00:00`));
}

function normalizedPayee(tx: TransactionSchemaType) {
  return merchantName(tx).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function TransactionHistory({ year, month, categories, accountId, onAccountChange, onIncomeCandidatesChange, selectedCategory = null, onCategoryChange, onDemoSourceChange, onAnalysis }: Props) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [historyOpen, setHistoryOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoveredTransactionId, setHoveredTransactionId] = useState<string | null>(null);
  const [focusedTransactionId, setFocusedTransactionId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [rememberPayee, setRememberPayee] = useState<Record<string, boolean>>({});
  const [rememberedCategories, setRememberedCategories] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    setToast("");
    onAnalysis?.(null);
  }, [year, month, onAnalysis]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const { data: connectionsData } = useQuery({ queryKey: ["bank-connections"], queryFn: getConnections });
  const connections = Array.isArray(connectionsData) ? connectionsData : [];
  const accounts = connections.flatMap((connection) =>
    (Array.isArray(connection.accounts) ? connection.accounts : []).map((account) => ({ ...account, provider: connection.provider })),
  );
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const source = selectedAccount?.institution_name === "Vestor Simulated Bank" ? "simulated" as const : "connected" as const;
  useEffect(() => { onDemoSourceChange?.(source === "simulated"); }, [source, onDemoSourceChange]);

  const { data: transactionData, isLoading, isError } = useQuery({
    queryKey: ["all-transactions", accountId, source],
    queryFn: () => getAllTransactions(500, accountId === "all" ? undefined : accountId, source),
  });
  const transactions = Array.isArray(transactionData) ? transactionData : [];
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 1).getTime();
  const monthTransactions = useMemo(() => transactions
    .filter((tx) => {
      const timestamp = new Date(tx.transaction_timestamp).getTime();
      return timestamp >= start && timestamp < end && (accountId === "all" || tx.connected_account_id === accountId);
    })
    .sort((a, b) => new Date(b.transaction_timestamp).getTime() - new Date(a.transaction_timestamp).getTime()), [transactions, start, end, accountId]);
  const pending = monthTransactions.filter((tx) => tx.classification === "UNCLASSIFIED" || !tx.classification || (tx.transaction_type === "CREDIT" && tx.classification === "INCOME" && !["USER_CONFIRMED", "USER_CORRECTED"].includes(tx.classification_status)));
  const incomeCandidates = useMemo(() => monthTransactions
    .filter((tx) => tx.transaction_type === "CREDIT" && tx.classification === "INCOME" && !["USER_CONFIRMED", "USER_CORRECTED"].includes(tx.classification_status))
    .map((tx) => ({ id: tx.id, narration: tx.narration ?? merchantName(tx), amount: String(tx.amount), transaction_timestamp: tx.transaction_timestamp })), [monthTransactions]);

  useEffect(() => {
    onIncomeCandidatesChange?.(incomeCandidates);
  }, [incomeCandidates, onIncomeCandidatesChange]);

  const classify = useMutation({
    mutationFn: ({ tx, category }: { tx: TransactionSchemaType; category: string; remember: boolean }) => updateTransactionClassification(tx.id, tx.transaction_type === "CREDIT" ? "INCOME" : "EXPENSE", category),
    onSuccess: async (_result, variables) => {
      if (variables.remember) setRememberedCategories((current) => ({ ...current, [normalizedPayee(variables.tx)]: variables.category }));
      setEditingId(null);
      setToast("Category saved · monthly totals are updating");
      const result = await analyzeTransactionMonth(year, month, accountId === "all" ? undefined : accountId);
      onAnalysis?.(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["all-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["money"] }),
        queryClient.invalidateQueries({ queryKey: ["accountDetails"] }),
      ]);
    },
    onError: () => setToast("Could not save the category. Please try again."),
  });

  function changeAccount(value: string) {
    const nextAccount = accounts.find((account) => account.id === value);
    onAccountChange(value, nextAccount?.institution_name === "Vestor Simulated Bank");
    onAnalysis?.(null);
  }

  const categoryOptions = useMemo(() => Array.from(new Set(monthTransactions.map(categoryName))).sort((a, b) => a.localeCompare(b)), [monthTransactions]);
  const filteredTransactions = useMemo(() => monthTransactions.filter((tx) => {
    const name = categoryName(tx);
    const matchesCategory = categoryFilter === "all" || name.toLowerCase() === categoryFilter.toLowerCase();
    const matchesSelected = !selectedCategory || name.toLowerCase() === selectedCategory.toLowerCase();
    const matchesType = typeFilter === "all" || (typeFilter === "income" ? tx.transaction_type === "CREDIT" : tx.transaction_type === "DEBIT");
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${merchantName(tx)} ${tx.narration ?? ""} ${name}`.toLowerCase().includes(query);
    return matchesCategory && matchesSelected && matchesType && matchesSearch;
  }), [monthTransactions, categoryFilter, selectedCategory, typeFilter, search]);
  const latestTransactions = selectedCategory
    ? monthTransactions.filter((tx) => categoryName(tx).toLowerCase() === selectedCategory.toLowerCase()).slice(0, 8)
    : monthTransactions.slice(0, 8);
  const groupedLatest = useMemo(() => latestTransactions.reduce<Record<string, TransactionSchemaType[]>>((groups, tx) => {
    const key = dateKey(tx.transaction_timestamp);
    (groups[key] ??= []).push(tx);
    return groups;
  }, {}), [latestTransactions]);

  function renderTransaction(tx: TransactionSchemaType) {
    const income = tx.transaction_type === "CREDIT";
    const category = categoryName(tx);
    const merchant = merchantName(tx);
    const Icon = transactionIcon(category, income);
    const payeeKey = normalizedPayee(tx);
    const currentValue = selections[tx.id] ?? rememberedCategories[payeeKey] ?? categories.find((item) => item.name.toLowerCase() === category.toLowerCase())?.name ?? (category === "Uncategorised" || category === "Income" ? suggestedCategory(tx, categories) : category);
    const choices = income ? ["Salary", "Other income"] : Array.from(new Set([...categories.map((item) => item.name), ...(tx.category && tx.category !== "Unclassified" ? [tx.category] : [])]));
    const color = getCategoryColor(category.toLowerCase().replace(/\s+/g, "-"), 0);
    const needsConfirmation = tx.classification === "UNCLASSIFIED" || !tx.classification || (income && tx.classification === "INCOME" && !["USER_CONFIRMED", "USER_CORRECTED"].includes(tx.classification_status));
    const isEditing = editingId === tx.id || hoveredTransactionId === tx.id || focusedTransactionId === tx.id;

    return <motion.div key={tx.id} onMouseEnter={() => setHoveredTransactionId(tx.id)} onMouseLeave={() => setHoveredTransactionId((current) => current === tx.id ? null : current)} onFocusCapture={() => setFocusedTransactionId(tx.id)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedTransactionId((current) => current === tx.id ? null : current); }} initial={reduceMotion || sheetOpen ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="group border-b border-[#EFF3F0] px-4 py-3.5 last:border-b-0 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF3F0] text-[#26332C]"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#141C16]">{merchant}</p>
          <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#DCE4DF] px-2 py-0.5 text-[11px] text-[#52615A]"><i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />{needsConfirmation ? "Needs review" : category}</span>
        </div>
        <p className={`shrink-0 text-sm font-semibold tabular-nums ${income ? "text-[#168348]" : "text-[#141C16]"}`}><MoneyAmount value={tx.amount} /></p>
        <button type="button" onClick={() => setEditingId(isEditing ? null : tx.id)} className={`rounded-lg px-2 py-1 text-[11px] font-medium text-[#52615A] transition-opacity hover:bg-[#EFF3F0] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/40 ${income && needsConfirmation ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} aria-label={income && needsConfirmation ? `Review income from ${merchant}` : `Recategorize ${merchant}`}>{income && needsConfirmation ? "Review income" : "Recategorize"}</button>
      </div>
      {isEditing ? <div className="ml-12 mt-3 flex flex-wrap items-center gap-2">
        <select aria-label={`Choose category for ${merchant}`} value={currentValue} onChange={(event) => setSelections((old) => ({ ...old, [tx.id]: event.target.value }))} className="max-w-48 rounded-xl border border-[#DCE4DF] bg-white px-2.5 py-2 text-xs text-[#141C16] outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/40">
          <option value="">Choose category</option>{choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
        </select>
        <label className="inline-flex items-center gap-1.5 text-xs text-[#52615A]"><input type="checkbox" checked={rememberPayee[tx.id] ?? false} onChange={(event) => setRememberPayee((old) => ({ ...old, [tx.id]: event.target.checked }))} className="accent-[#0F766E]" />Remember this payee</label>
        <button type="button" onClick={() => currentValue && classify.mutate({ tx, category: currentValue, remember: rememberPayee[tx.id] ?? false })} disabled={!currentValue || classify.isPending} className="rounded-xl bg-[#121A15] px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-45">{income && needsConfirmation ? "Confirm income" : "Save category"}</button>
        <button type="button" onClick={() => setEditingId(null)} className="rounded-xl px-2.5 py-2 text-xs font-medium text-[#52615A] hover:bg-[#EFF3F0]">Cancel</button>
      </div> : null}
    </motion.div>;
  }

  return (
    <section className="overflow-hidden rounded-[20px] border border-[#DCE4DF] bg-white" aria-labelledby="transactions-heading">
      <div className="flex flex-col gap-4 border-b border-[#DCE4DF] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 id="transactions-heading" className="text-base font-semibold text-[#141C16]">Transactions</h2>
          <p className="mt-1 text-xs text-[#52615A]">{monthLabel(year, month)} · {monthTransactions.length} transactions{selectedCategory ? ` · ${selectedCategory}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Transaction account filter" value={accountId} onChange={(event) => changeAccount(event.target.value)} className="max-w-52 rounded-xl border border-[#DCE4DF] bg-white px-3 py-2.5 text-xs text-[#26332C] outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/40">
            <option value="all">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.institution_name === "Vestor Simulated Bank" ? "Demo bank" : `${account.institution_name} · •••• ${(account.masked_account_number ?? "").slice(-4) || "account"}`}</option>)}
          </select>
          <button type="button" onClick={() => setSheetOpen(true)} className="rounded-xl px-3 py-2.5 text-xs font-medium text-[#26332C] hover:bg-[#EFF3F0]">View all</button>
          <span className="px-2 py-2.5 text-xs font-medium text-[#52615A]">{pending.length > 0 ? `${pending.length} need review` : "All categorized"}</span>
          <button type="button" aria-expanded={historyOpen} aria-controls="transaction-history-content" onClick={() => setHistoryOpen((open) => !open)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium text-[#26332C] hover:bg-[#EFF3F0]">{historyOpen ? <><ChevronUp className="h-3.5 w-3.5" />Hide</> : <><ChevronDown className="h-3.5 w-3.5" />Show latest</>}</button>
        </div>
      </div>

      <div id="transaction-history-content" className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${historyOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          {isLoading ? <p className="p-8 text-center text-sm text-[#52615A]">Loading transactions…</p> : isError ? <p className="p-8 text-center text-sm text-[#B42318]">Transaction history couldn’t load. Try again in a moment.</p> : latestTransactions.length === 0 ? <div className="px-6 py-10 text-center"><p className="text-sm font-medium text-[#26332C]">No transactions for {monthLabel(year, month)}</p><p className="mt-1 text-xs text-[#52615A]">Connect and sync an account to see transaction history here.</p></div> : Object.entries(groupedLatest).map(([date, rows]) => <div key={date}>
            <h3 className="border-b border-[#EFF3F0] bg-[#F8FAF8] px-4 py-2 text-xs font-medium text-[#52615A] sm:px-5">{readableDate(date)}</h3>
            {rows.map((tx) => renderTransaction(tx))}
          </div>)}
        </div>
      </div>

      <AnimatePresence>
        {toast ? <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 8 }} className="fixed bottom-5 right-5 z-40 max-w-sm rounded-xl border border-[#DCE4DF] bg-white px-4 py-3 text-xs font-medium text-[#26332C] shadow-lg" role="status">{toast}</motion.div> : null}
      </AnimatePresence>

      <Sheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="All transactions" description={`${monthLabel(year, month)} · ${filteredTransactions.length} shown`}>
        <div className="space-y-3">
          <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52615A]" /><input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchant or narration" className="w-full rounded-xl border border-[#DCE4DF] bg-white py-2.5 pl-9 pr-3 text-sm text-[#141C16] outline-none placeholder:text-[#52615A] focus-visible:ring-2 focus-visible:ring-[#22C55E]/40" /></label>
          <div className="grid grid-cols-2 gap-2"><select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="min-w-0 rounded-xl border border-[#DCE4DF] bg-white px-2.5 py-2 text-xs text-[#26332C]"><option value="all">All categories</option>{categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="Filter by type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="min-w-0 rounded-xl border border-[#DCE4DF] bg-white px-2.5 py-2 text-xs text-[#26332C]"><option value="all">All types</option><option value="income">Income</option><option value="spending">Spending</option></select></div>
          {selectedCategory ? <button type="button" onClick={() => onCategoryChange?.(null)} className="text-xs font-medium text-[#0F766E] underline underline-offset-2">Clear {selectedCategory} filter</button> : null}
          <div className="divide-y divide-[#EFF3F0]">{filteredTransactions.map((tx) => <div key={tx.id} className="py-1">{renderTransaction(tx)}</div>)}</div>
          {!filteredTransactions.length ? <p className="py-8 text-center text-sm text-[#52615A]">No matching transactions.</p> : null}
        </div>
      </Sheet>
    </section>
  );
}
