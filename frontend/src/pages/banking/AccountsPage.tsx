import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  getConnections,
  disconnectConnection,
  connectBank,
  syncAccount,
  getAggregatedBalances,
  type ConnectedAccount,
} from "../../api/banking";
import { formatInr } from "../../features/invest/utils/format";
import { Spinner } from "../../components/ui/Spinner";
import {
  RefreshCcw,
  X,
  Building2,
  AlertCircle,
  PlayCircle,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import SyncErrorBoundary from "../../components/banking/SyncErrorBoundary";
import { useRegisterPageContext } from "../../context/PageContext";

export function AccountsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mobileNumber, setMobileNumber] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const { data: connections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ["connections"],
    queryFn: getConnections,
  });

  const { data: aggregatedBalances } = useQuery({
    queryKey: ["aggregated-balances"],
    queryFn: getAggregatedBalances,
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: string) => syncAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["aggregated-balances"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => disconnectConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["aggregated-balances"] });
    },
  });

  const handleSyncAccount = (accountId: string) => {
    syncMutation.mutate(accountId);
  };

  const handleConnectBank = async (phone: string = mobileNumber) => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const redirectUrl = window.location.origin + "/banking/connect/callback";
      const response = await connectBank(phone, redirectUrl);
      localStorage.setItem("pendingConsentId", response.consent_id);
      window.location.href = response.consent_url;
    } catch (err: any) {
      setConnectError(
        err?.response?.data?.detail?.message ||
          err.message ||
          "Failed to connect to bank."
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = (connectionId: string) => {
    if (
      confirm(
        "Are you sure you want to disconnect this bank connection? Historical transactions stay safe, but live syncing stops."
      )
    ) {
      disconnectMutation.mutate(connectionId);
    }
  };

  const activeConnections =
    connections?.filter((c) => c.status === "ACTIVE") || [];
  const pendingConnections =
    connections?.filter((c) => c.status === "PENDING") || [];
  const historyConnections =
    connections?.filter((c) =>
      ["DISCONNECTED", "REVOKED", "EXPIRED", "REJECTED", "FAILED"].includes(
        c.status
      )
    ) || [];

  const totalConnectedCash = aggregatedBalances?.actual_connected_cash ?? 0;
  const hasActiveConnections = activeConnections.length > 0;
  const totalAccountsCount = activeConnections.reduce(
    (acc, c) => acc + (c.accounts?.length || 0),
    0
  );

  useRegisterPageContext({
    page: "accounts",
    route_title: "Connected Accounts",
    metadata: {
      activeConnectionsCount: activeConnections.length,
      pendingConnectionsCount: pendingConnections.length,
      totalConnectedCash: Number(totalConnectedCash || 0),
    },
    suggestedPrompts: [
      "Are all my connected accounts synced?",
      "How much cash is earmarked for goals across my accounts?",
      "Explain the difference between consent status and account sync status",
      "Is my total connected cash complete?",
    ],
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-[#141C16]">
            Connected Accounts
          </h1>
          <p className="font-sans text-xs text-[#6C7A70] mt-0.5">
            Manage your verified financial institutions, live balances, and Setu AA consent
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-white border border-[#DCE4DF] px-3.5 py-1.5 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
            <span className="font-sans text-xs font-semibold text-[#141C16]">
              RBI AA Compliant
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 1: FinAI Hero & Status Cards ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Total Connected Cash (Obsidian Black Hero) */}
        <div className="lg:col-span-2 rounded-[28px] bg-[#121A15] p-6 lg:p-7 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[190px]">
          <div className="absolute right-0 top-0 w-80 h-80 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#22C55E]/15 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[#95A59B]">
                  Total Connected Cash
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/20 px-2 py-0.5 text-[10px] font-bold text-[#22C55E]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  Live Aggregated
                </span>
              </div>
              <div className="mt-2.5 font-sans text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight tabular-nums text-white">
                {hasActiveConnections ? formatInr(totalConnectedCash) : "₹0.00"}
              </div>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-[#22C55E] border border-white/10">
              <Building2 className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs text-[#95A59B] relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{totalAccountsCount}</span> active {totalAccountsCount === 1 ? "account" : "accounts"} synced
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#22C55E]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Real-time Reserve Calculation</span>
            </div>
          </div>
        </div>

        {/* Quick Connect / Sync Stats Card */}
        <div className="rounded-[28px] bg-white border border-[#DCE4DF] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#6C7A70]">
                Link New Institution
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#22C55E]">
                <Plus className="h-4 w-4" />
              </div>
            </div>

            <p className="mt-2 font-sans text-xs text-[#6C7A70]">
              Connect via Account Aggregator to instantly stream verified bank balances & transactions.
            </p>

            {connectError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="line-clamp-2">{connectError}</span>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="relative">
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="10-digit mobile number"
                maxLength={10}
                className="w-full rounded-2xl border border-[#DCE4DF] bg-[#EFF3F0] py-2.5 pl-3.5 pr-3 font-sans text-xs text-[#141C16] placeholder:text-[#6C7A70] outline-none focus:border-[#22C55E] transition-colors"
              />
            </div>
            <button
              onClick={() => handleConnectBank()}
              disabled={isConnecting || !mobileNumber || mobileNumber.length !== 10}
              className="w-full rounded-2xl bg-[#121A15] hover:bg-[#1E2922] text-[#22C55E] font-sans text-xs font-bold py-2.5 px-4 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isConnecting ? (
                <>
                  <Spinner label="" />
                  <span>Connecting Setu AA...</span>
                </>
              ) : (
                <>
                  <span>Connect Bank Account</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Connections Section ──────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-base font-bold text-[#141C16]">
            Active Accounts & Balances
          </h2>
          <span className="font-sans text-xs font-semibold text-[#6C7A70]">
            {activeConnections.length} Institution{activeConnections.length === 1 ? "" : "s"}
          </span>
        </div>

        {isLoadingConnections && (
          <div className="rounded-[28px] bg-white border border-[#DCE4DF] p-12 text-center shadow-sm">
            <Spinner label="Loading connected institutions..." />
          </div>
        )}

        {!isLoadingConnections && activeConnections.length === 0 && (
          <div className="rounded-[28px] bg-white border border-dashed border-[#DCE4DF] p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF3F0] text-[#6C7A70] mb-3">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="font-sans text-sm font-bold text-[#141C16]">
              No active bank accounts linked
            </h3>
            <p className="mt-1 font-sans text-xs text-[#6C7A70] max-w-sm mx-auto">
              Link your salary or savings account using your mobile number above to activate intelligent ledger balances.
            </p>
          </div>
        )}

        {activeConnections.map((connection) => (
          <div
            key={connection.id}
            className="rounded-[28px] bg-white border border-[#DCE4DF] shadow-sm overflow-hidden"
          >
            {/* Institution Header Strip */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#EFF3F0]/60 border-b border-[#DCE4DF]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#121A15] text-[#22C55E] font-bold text-xs shadow-sm">
                  {connection.provider.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#141C16]">
                      {connection.provider.replace("_AA", "").replace("_", " ")}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#16A34A]">
                      <CheckCircle2 className="h-3 w-3" />
                      Active Consent
                    </span>
                  </div>
                  <span className="font-sans text-[11px] text-[#6C7A70]">
                    Consent Ref: {connection.consent_status || "Approved"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDisconnect(connection.id)}
                disabled={disconnectMutation.isPending}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-full px-3 py-1 transition disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </button>
            </div>

            {/* Individual Accounts Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {connection.accounts.map((account: ConnectedAccount) => (
                <SyncErrorBoundary
                  key={account.id}
                  onRetry={() => handleSyncAccount(account.id)}
                >
                  <div className="rounded-[24px] bg-[#EFF3F0]/40 border border-[#DCE4DF] p-5 hover:border-[#22C55E]/40 hover:bg-white transition-all shadow-[0_2px_8px_rgba(20,28,22,0.02)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#6C7A70]">
                            {account.account_type || "Savings"}
                          </span>
                          <h4 className="font-sans text-sm font-bold text-[#141C16]">
                            {account.purpose || account.institution_name}
                          </h4>
                          <p className="font-mono text-xs text-[#6C7A70] mt-0.5">
                            •••• {account.masked_account_number || "••••"}
                          </p>
                        </div>

                        <button
                          onClick={() => handleSyncAccount(account.id)}
                          disabled={
                            syncMutation.isPending &&
                            syncMutation.variables === account.id
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-[#DCE4DF] text-[#6C7A70] hover:text-[#141C16] hover:border-[#22C55E] transition-all disabled:opacity-50 shadow-sm"
                          title="Sync Balance Now"
                        >
                          <RefreshCcw
                            className={`h-3.5 w-3.5 ${
                              syncMutation.isPending &&
                              syncMutation.variables === account.id
                                ? "animate-spin text-[#22C55E]"
                                : ""
                            }`}
                          />
                        </button>
                      </div>

                      <div className="mt-5 space-y-1.5">
                        <span className="font-sans text-[11px] font-semibold text-[#6C7A70]">
                          Available Balance
                        </span>
                        <div className="font-sans text-2xl font-bold tracking-tight tabular-nums text-[#141C16]">
                          {account.balance !== null
                            ? formatInr(account.balance)
                            : "Pending sync"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-[#DCE4DF] flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-[#6C7A70]">
                        <Clock className="h-3 w-3" />
                        <span>
                          {account.last_synced_at
                            ? new Date(account.last_synced_at).toLocaleTimeString("en-IN", {
                                hour: "numeric",
                                minute: "numeric",
                              })
                            : "Never"}
                        </span>
                      </div>

                      <button
                        onClick={() => navigate(`/accounts/${account.id}`)}
                        className="flex items-center gap-1 font-semibold text-[#141C16] hover:text-[#22C55E] transition-colors"
                      >
                        <span>Ledger</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </SyncErrorBoundary>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Pending & Inactive History ──────────────────────────────── */}
      {pendingConnections.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-sans text-sm font-bold text-[#141C16]">
            Pending Consent Approvals
          </h3>
          {pendingConnections.map((conn) => (
            <div
              key={conn.id}
              className="rounded-[24px] bg-white border border-[#DCE4DF] p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-sans text-xs font-bold text-[#141C16]">
                    {conn.provider.replace("_AA", "")}
                  </h4>
                  <p className="font-sans text-[11px] text-[#6C7A70]">
                    Awaiting bank verification via Setu AA
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold px-3 py-1">
                Pending Approval
              </span>
            </div>
          ))}
        </div>
      )}

      {historyConnections.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-sans text-sm font-bold text-[#6C7A70]">
            Connection History
          </h3>
          <div className="rounded-[24px] bg-white border border-[#DCE4DF] divide-y divide-[#DCE4DF] overflow-hidden">
            {historyConnections.map((conn) => (
              <div
                key={conn.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EFF3F0] text-[#6C7A70] text-xs font-bold">
                    {conn.provider.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-sans text-xs font-bold text-[#141C16]">
                      {conn.provider.replace("_AA", "")}
                    </h5>
                    <span className="font-sans text-[10px] text-[#6C7A70]">
                      Status: {conn.status}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const phone = window.prompt(
                      "Enter your 10-digit mobile number to reconnect:"
                    );
                    if (phone && phone.length === 10) {
                      handleConnectBank(phone);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-[#EFF3F0] hover:bg-[#DCE4DF] px-3 py-1 font-sans text-xs font-semibold text-[#141C16] transition-colors"
                >
                  <PlayCircle className="h-3.5 w-3.5 text-[#22C55E]" />
                  <span>Reconnect</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
