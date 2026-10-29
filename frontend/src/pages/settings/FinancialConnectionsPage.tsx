import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, AlertCircle, CheckCircle, Building2 } from "lucide-react";
import { clsx } from "clsx";

import { 
  getConnections, 
  disconnectConnection, 
  updateAccountPurpose, 
  connectBank,
  type FinancialConnection,
  type ConnectedAccount
} from "../../api/banking";
import { Spinner } from "../../components/ui/Spinner";

export function FinancialConnectionsPage() {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{account: ConnectedAccount, connection: FinancialConnection} | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  const { data: connections, isLoading, error } = useQuery({
    queryKey: ["connections"],
    queryFn: getConnections,
  });

  const handleConnectBank = async () => {
    const mobileNumber = window.prompt("Enter your 10-digit mobile number for bank connection:", "9999999999");
    if (!mobileNumber) return;
    if (mobileNumber.length !== 10 || isNaN(Number(mobileNumber))) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    setConnecting(true);
    try {
      const redirectUrl = window.location.origin + "/banking/connect/callback";
      const response = await connectBank(mobileNumber, redirectUrl);
      if (response.consent_url) {
        localStorage.setItem("pending_consent_id", response.consent_id);
        window.location.href = response.consent_url;
      }
    } catch (err) {
      console.error("Failed to connect bank", err);
      alert("Failed to initiate bank connection.");
      setConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Loading connections..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading connections</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Please try again later.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasConnections = connections && connections.length > 0;

  return (
    <div className="max-w-4xl relative">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900">Financial Connections</h2>
        <p className="mt-1 text-sm text-slate-500">
          Securely connect accounts and control how Vestor uses them.
        </p>
      </div>

      {!hasConnections ? (
        <div className="text-center rounded-xl border border-slate-200 bg-white px-6 py-12">
          <Building2 className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No bank accounts connected</h3>
          <p className="mt-2 text-sm text-slate-500">
            Connect your bank accounts to let Vestor keep your financial picture up to date.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={handleConnectBank}
              disabled={connecting}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {connecting ? <Spinner label="" /> : <Link2 className="h-4 w-4" />}
              Connect Bank
            </button>
            <button className="text-sm font-semibold leading-6 text-slate-900 transition hover:text-slate-600">
              Continue manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-900">Connected Accounts</h3>
            <button
              onClick={handleConnectBank}
              disabled={connecting}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {connecting ? <Spinner label="" /> : <Link2 className="h-3.5 w-3.5" />}
              Connect another account
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {connections.map((connection) => (
              connection.accounts.map((account) => (
                <AccountCard 
                  key={account.id} 
                  connection={connection} 
                  account={account} 
                  onManage={(acc, conn) => setSelectedAccount({account: acc, connection: conn})}
                />
              ))
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-4">
            Connections are read-only. Vestor does not move money or place trades.
          </p>
        </div>
      )}

      {selectedAccount && (
        <ManageAccountModal
          account={selectedAccount.account}
          connection={selectedAccount.connection}
          onClose={() => setSelectedAccount(null)}
          queryClient={queryClient}
          setToast={setToast}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[60] max-w-sm -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm text-white shadow-lg animate-in fade-in duration-200"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function ManageAccountModal({ account, connection, onClose, queryClient, setToast }: { account: ConnectedAccount, connection: FinancialConnection, onClose: () => void, queryClient: any, setToast: (msg: string | null) => void }) {
  const [purpose, setPurpose] = useState(account.purpose || "");

  const updateMutation = useMutation({
    mutationFn: (newPurpose: string) => updateAccountPurpose(account.id, newPurpose),
    onMutate: async (newPurpose: string) => {
      await queryClient.cancelQueries({ queryKey: ["connections"] });
      await queryClient.cancelQueries({ queryKey: ["aggregated-balances"] });
      await queryClient.cancelQueries({ queryKey: ["goals"] });

      const prevConnections = queryClient.getQueryData(["connections"]);

      if (prevConnections) {
        queryClient.setQueryData(["connections"], (old: any) => {
          if (!old) return old;
          return old.map((conn: any) => ({
            ...conn,
            accounts: conn.accounts.map((acc: any) =>
              acc.id === account.id ? { ...acc, purpose: newPurpose } : acc
            ),
          }));
        });
      }

      return { prevConnections };
    },
    onError: (_err, _newPurpose, context) => {
      if (context) {
        queryClient.setQueryData(["connections"], context.prevConnections);
      }
      setToast("Couldn't update account purpose.");
      setTimeout(() => setToast(null), 3000);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["aggregated-balances"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setToast("Purpose updated successfully!");
      setTimeout(() => setToast(null), 2000);
      onClose();
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectConnection(connection.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Manage Connection</h3>
          <p className="text-sm text-slate-500 mt-1">{account.institution_name} ••••{account.masked_account_number}</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Account Purpose</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>Select purpose</option>
              <option value="Main / Spending">Main / Spending</option>
              <option value="Savings">Savings</option>
              <option value="Emergency Fund">Emergency Fund</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Data access</h4>
            <p className="text-sm text-slate-700 mb-1">Account summary & Transactions</p>
            <p className="text-xs text-slate-500">
              {connection.consent_expires_at ? `Active until ${new Date(connection.consent_expires_at).toLocaleDateString()}` : "Active"}
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button 
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="text-sm font-semibold text-red-600 hover:text-red-500 disabled:opacity-50 transition"
          >
            Disconnect
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 rounded-md transition"
            >
              Cancel
            </button>
            <button 
              onClick={() => updateMutation.mutate(purpose)}
              disabled={updateMutation.isPending || purpose === account.purpose}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md disabled:opacity-50 transition"
            >
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountCard({ connection, account, onManage }: { connection: FinancialConnection, account: ConnectedAccount, onManage: (acc: ConnectedAccount, conn: FinancialConnection) => void }) {
  const isConnected = account.status === "ACTIVE" && connection.status === "ACTIVE";
  
  return (
    <div className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-slate-900">{account.institution_name}</h4>
          <p className="mt-1 text-sm text-slate-500">
            {account.account_type} ••••{account.masked_account_number}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Purpose</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{account.purpose || "Unassigned"}</p>
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          <span className={clsx("text-sm font-medium", isConnected ? "text-emerald-700" : "text-amber-700")}>
            {isConnected ? "Connected" : (account.status === "DISCONNECTED" ? "Disconnected" : "Needs attention")}
          </span>
        </div>
        
        {isConnected && (
          <>
            <p className="text-xs text-slate-500">
              {connection.last_synced_at ? `Last synced ${new Date(connection.last_synced_at).toLocaleDateString()}` : "Initial data sync pending"}
            </p>
            {connection.consent_expires_at && (
              <p className="text-xs text-slate-500">
                Consent active until {new Date(connection.consent_expires_at).toLocaleDateString()}
              </p>
            )}
          </>
        )}
      </div>
      
      <div className="mt-4">
        <button 
          onClick={() => onManage(account, connection)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition"
        >
          Manage
        </button>
      </div>
    </div>
  );
}
