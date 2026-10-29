import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getAccountDetails, 
  updateAccountPurpose, 
  disconnectConnection,
  syncAccount,
  updateTransactionClassification
} from "../../api/banking";
import { formatInr } from "../../features/invest/utils/format";
import { Spinner } from "../../components/ui/Spinner";
import { 
  ArrowLeft, AlertCircle, RefreshCcw, Trash2, CheckCircle2
} from "lucide-react";
import { useRegisterPageContext } from "../../context/PageContext";

export function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: account, isLoading, error, refetch } = useQuery({
    queryKey: ["accountDetails", accountId],
    queryFn: () => getAccountDetails(accountId!),
    enabled: !!accountId
  });

  useRegisterPageContext({
    page: "account_detail",
    route_title: account ? `${account.institution_name} (${account.purpose || "Account"})` : "Account Detail",
    selected_item_id: accountId,
    selected_item_name: account ? `${account.institution_name} ••••${account.masked_account_number}` : undefined,
    metadata: {
      institution: account?.institution_name || "",
      purpose: account?.purpose || "",
      balance: account?.balance !== null && account?.balance !== undefined ? Number(account.balance) : 0,
      balanceStatus: account?.balance_status || "",
      earmarkedForGoals: account?.earmarked_for_goals || 0,
      unallocatedBalance: account?.unallocated_balance || 0,
      transactionCount: account?.transactions?.length || 0,
    },
    suggestedPrompts: [
      "Summarise recent transactions for this account",
      "Why is my balance or sync in this status?",
      "Explain this account's earmarked for goals amount",
      "Are any transactions pending classification in this account?",
    ],
  });

  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const updatePurposeMutation = useMutation({
    mutationFn: (newPurpose: string) => updateAccountPurpose(accountId!, newPurpose),
    onMutate: async (newPurpose: string) => {
      await queryClient.cancelQueries({ queryKey: ["accountDetails", accountId] });
      await queryClient.cancelQueries({ queryKey: ["connections"] });
      await queryClient.cancelQueries({ queryKey: ["aggregated-balances"] });
      await queryClient.cancelQueries({ queryKey: ["goals"] });

      const prevAccountDetails = queryClient.getQueryData(["accountDetails", accountId]);
      const prevConnections = queryClient.getQueryData(["connections"]);

      if (prevAccountDetails) {
        queryClient.setQueryData(["accountDetails", accountId], (old: any) => {
          if (!old) return old;
          return { ...old, purpose: newPurpose };
        });
      }

      if (prevConnections) {
        queryClient.setQueryData(["connections"], (old: any) => {
          if (!old) return old;
          return old.map((conn: any) => ({
            ...conn,
            accounts: conn.accounts.map((acc: any) =>
              acc.id === accountId ? { ...acc, purpose: newPurpose } : acc
            )
          }));
        });
      }

      return { prevAccountDetails, prevConnections };
    },
    onError: (_err, _newPurpose, context) => {
      if (context) {
        queryClient.setQueryData(["accountDetails", accountId], context.prevAccountDetails);
        queryClient.setQueryData(["connections"], context.prevConnections);
      }
      setToast("Couldn't update account purpose.");
      setTimeout(() => setToast(null), 3000);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountDetails", accountId] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["aggregated-balances"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setToast("Purpose updated successfully!");
      setTimeout(() => setToast(null), 2000);
    }
  });

  const disconnectMutation = useMutation({
    // We disconnect the connection related to the account
    mutationFn: (connectionId: string) => disconnectConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      navigate("/accounts");
    }
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncAccount(accountId!);
      queryClient.invalidateQueries({ queryKey: ["accountDetails", accountId] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <Spinner label="Loading account details..." />
          <div className="w-full max-w-3xl space-y-4 mt-8">
            <div className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
            <div className="h-32 bg-slate-100 rounded-lg animate-pulse"></div>
            <div className="h-48 bg-slate-100 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">We couldn't retrieve this account right now</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            This account might be unavailable or you do not have permission to view it.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => navigate("/accounts")}
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded px-4 py-2 bg-white transition"
            >
              Back to Accounts
            </button>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-md bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-semibold transition"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isConnected = account.status === "ACTIVE";

  // Helper to format date strings nicely
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const handlePurposeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updatePurposeMutation.mutate(e.target.value);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <Link 
        to="/accounts" 
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Accounts
      </Link>

      {/* Account Info Summary Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Institution</span>
              <h1 className="font-display text-3xl font-semibold text-slate-900 mt-1">{account.institution_name}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {account.account_type} ••••{account.masked_account_number}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                {isConnected ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                <span className={`text-xs font-semibold ${isConnected ? "text-emerald-700" : "text-amber-700"}`}>
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              {account.last_synced_at && (
                <span className="text-xs text-slate-500">
                  Last synced: {formatDate(account.last_synced_at)}
                </span>
              )}
              {account.consent_expires_at && (
                <span className="text-xs text-slate-500">
                  Consent active until: {formatDate(account.consent_expires_at)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end justify-between self-stretch lg:self-auto">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Balance</span>
              <p className="font-display text-3xl font-bold text-slate-900 mt-1">
                {account.balance !== null ? formatInr(account.balance) : "Balance pending first sync"}
              </p>
            </div>
            
            <div className="flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Purpose:</span>
                <select
                  value={account.purpose || "Other"}
                  onChange={handlePurposeChange}
                  disabled={updatePurposeMutation.isPending}
                  className="rounded-md border border-slate-300 py-1 px-2.5 text-xs bg-white text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                >
                  <option value="Main / Spending">Main / Spending</option>
                  <option value="Savings">Savings</option>
                  <option value="Emergency Fund">Emergency Fund</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel Row */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-2 text-xs font-semibold transition disabled:opacity-50"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync now"}
            </button>
            {account.balance_status && account.balance_status !== "NOT_SYNCED" && (
              <span className={`text-[10px] font-medium ${
                account.balance_status === "FAILED" ? "text-red-500" :
                account.balance_status === "SYNCING" ? "text-amber-500" :
                account.balance_status === "SYNCED" ? "text-emerald-600" : "text-slate-400"
              }`}>
                {account.balance_status === "FAILED" ? "Last sync failed" :
                 account.balance_status === "SYNCING" ? "Updating..." :
                 account.balance_status === "SYNCED" && account.last_synced_at
                   ? `Updated ${new Date(account.last_synced_at).toLocaleString("en-IN", { hour: "numeric", minute: "numeric", month: "short", day: "numeric" })}`
                   : account.balance_status}
              </span>
            )}
          </div>

          <div>
            <button
              disabled={disconnectMutation.isPending}
              onClick={() => {
                if (confirm(`Are you sure you want to disconnect ${account.institution_name}? This will remove it from your Vestor workspace.`)) {
                  // We don't have a direct connection ID exposed in the schema, but we can look it up in connections query
                  // Let's assume we retrieve connections and match it, or we can just fetch and match.
                  // For now, let's query connections and disconnect the matching connection.
                  queryClient.fetchQuery<any[]>({ queryKey: ["connections"] }).then(conns => {
                    const match = conns.find(c => c.accounts.some((a: any) => a.id === account.id));
                    if (match) {
                      disconnectMutation.mutate(match.id);
                    } else {
                      alert("Could not locate connection for this account.");
                    }
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 border border-red-100 hover:bg-red-50 rounded px-3 py-2 bg-white transition disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Disconnect Connection
            </button>
          </div>
        </div>
      </section>

      {/* Recent Transactions Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold text-slate-900">Recent Transactions</h2>
          <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-700 ring-1 ring-inset ring-teal-600/10">
            Read Only
          </span>
        </div>

        {account.transactions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg text-sm text-slate-500 font-medium">
            No transactions synced yet.
          </div>
        ) : (
          <>
            {/* Desktop Transactions Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Merchant / Narration</th>
                    <th className="pb-3">Direction</th>
                    <th className="pb-3">Mode</th>
                    <th className="pb-3">Classification</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {account.transactions.map((tx) => {
                    const isCredit = tx.transaction_type === "CREDIT";
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 text-slate-500 font-medium">{formatDate(tx.transaction_timestamp)}</td>
                        <td className="py-4 font-semibold text-slate-900">
                          {tx.merchant_name ? (
                            <div>
                              <span>{tx.merchant_name}</span>
                              <span className="block text-xs font-normal text-slate-400 mt-0.5">{tx.narration}</span>
                            </div>
                          ) : (
                            tx.narration || "Bank Transaction"
                          )}
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                            isCredit ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                          }`}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="py-4 text-slate-500 font-medium text-xs">{tx.transaction_mode || "—"}</td>
                        <td className="py-4">
                          <select
                            value={tx.classification || "UNCLASSIFIED"}
                            onChange={async (e) => {
                              const newClass = e.target.value;
                              let newCat = tx.category || "Unclassified";
                              if (newClass === "INCOME") newCat = "Salary";
                              else if (newClass === "TRANSFER") newCat = "Transfer";
                              else if (newClass === "INVESTMENT") newCat = "Investment";
                              else if (newClass === "FEE") newCat = "Fee";
                              else if (newClass === "REFUND") newCat = "Refund";
                              else if (newClass === "INTEREST") newCat = "Interest";
                              else if (newClass === "EXPENSE") newCat = "Expense";
                              else newCat = "Unclassified";

                              try {
                                await updateTransactionClassification(tx.id, newClass, newCat);
                                queryClient.invalidateQueries({ queryKey: ["accountDetails", accountId] });
                              } catch (err) {
                                console.error("Failed to update classification", err);
                                setToast("Failed to update classification.");
                                setTimeout(() => setToast(null), 3000);
                              }
                            }}
                            className="rounded border border-slate-200 py-0.5 px-1.5 text-xs bg-white text-slate-800 focus:border-teal-500 focus:outline-none font-medium"
                          >
                            <option value="INCOME">INCOME</option>
                            <option value="EXPENSE">EXPENSE</option>
                            <option value="TRANSFER">TRANSFER</option>
                            <option value="INVESTMENT">INVESTMENT</option>
                            <option value="REFUND">REFUND</option>
                            <option value="INTEREST">INTEREST</option>
                            <option value="FEE">FEE</option>
                            <option value="UNCLASSIFIED">UNCLASSIFIED</option>
                          </select>
                        </td>
                        <td className="py-4">
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                            {tx.category || "Unclassified"}
                          </span>
                        </td>
                        <td className={`py-4 text-right font-semibold tabular-nums ${isCredit ? "text-emerald-600" : "text-slate-800"}`}>
                          {isCredit ? "+" : "-"}{formatInr(tx.amount)}
                        </td>
                        <td className="py-4 text-right text-slate-500 font-medium tabular-nums">
                          {tx.balance_after_transaction !== null ? formatInr(tx.balance_after_transaction) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden space-y-4">
              {account.transactions.map((tx) => {
                const isCredit = tx.transaction_type === "CREDIT";
                return (
                  <div key={tx.id} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">{formatDate(tx.transaction_timestamp)}</span>
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isCredit ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        {tx.merchant_name ? `${tx.merchant_name} (${tx.narration})` : (tx.narration || "Bank Transaction")}
                      </span>
                      <span className={`text-sm font-semibold tabular-nums ${isCredit ? "text-emerald-600" : "text-slate-800"}`}>
                        {isCredit ? "+" : "-"}{formatInr(tx.amount)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">Class:</span>
                        <select
                          value={tx.classification || "UNCLASSIFIED"}
                          onChange={async (e) => {
                            const newClass = e.target.value;
                            let newCat = tx.category || "Unclassified";
                            if (newClass === "INCOME") newCat = "Salary";
                            else if (newClass === "TRANSFER") newCat = "Transfer";
                            else if (newClass === "INVESTMENT") newCat = "Investment";
                            else if (newClass === "FEE") newCat = "Fee";
                            else if (newClass === "REFUND") newCat = "Refund";
                            else if (newClass === "INTEREST") newCat = "Interest";
                            else if (newClass === "EXPENSE") newCat = "Expense";
                            else newCat = "Unclassified";

                            try {
                              await updateTransactionClassification(tx.id, newClass, newCat);
                              queryClient.invalidateQueries({ queryKey: ["accountDetails", accountId] });
                            } catch (err) {
                              console.error("Failed to update classification", err);
                              setToast("Failed to update classification.");
                              setTimeout(() => setToast(null), 3000);
                            }
                          }}
                          className="rounded border border-slate-200 py-0.5 px-1.5 text-[11px] bg-white text-slate-800 focus:border-teal-500 focus:outline-none font-medium"
                        >
                          <option value="INCOME">INCOME</option>
                          <option value="EXPENSE">EXPENSE</option>
                          <option value="TRANSFER">TRANSFER</option>
                          <option value="INVESTMENT">INVESTMENT</option>
                          <option value="REFUND">REFUND</option>
                          <option value="INTEREST">INTEREST</option>
                          <option value="FEE">FEE</option>
                          <option value="UNCLASSIFIED">UNCLASSIFIED</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>Cat: {tx.category || "Unclassified"}</span>
                        {tx.balance_after_transaction !== null && <span>• Bal: {formatInr(tx.balance_after_transaction)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {toast && (
              <div
                className="fixed bottom-6 left-1/2 z-[60] max-w-sm -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm text-white shadow-lg animate-in fade-in duration-200"
                role="status"
              >
                {toast}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
