import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getConsentStatus, updateAccountPurpose, type ConnectedAccount } from "../../api/banking";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

type FlowState = "CONNECTING" | "WAITING_FOR_CONSENT" | "CONNECTED" | "SAVING_ROLES" | "SUCCESS" | "REJECTED" | "EXPIRED" | "FAILED";

export function BankingCallbackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [flowState, setFlowState] = useState<FlowState>("CONNECTING");
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [purposes, setPurposes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prefer consentId from URL query param, fall back to localStorage
    const consentId =
      searchParams.get("consentId") ??
      searchParams.get("consent_id") ??
      localStorage.getItem("pendingConsentId");

    if (!consentId) {
      setError("No pending consent connection found. Please try again.");
      setFlowState("FAILED");
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;

    const clearPending = () => localStorage.removeItem("pendingConsentId");

    const checkStatus = async () => {
      try {
        const data = await getConsentStatus(consentId);

        if (data.status === "PENDING") {
          setFlowState("WAITING_FOR_CONSENT");
        } else if (data.status === "ACTIVE") {
          clearInterval(intervalId);
          clearPending();
          const accs = data.accounts || [];
          setAccounts(accs);
          // Initialize default purposes to "Other"
          const initialPurposes: Record<string, string> = {};
          accs.forEach((acc) => {
            initialPurposes[acc.id] = acc.purpose || "Other";
          });
          setPurposes(initialPurposes);
          setFlowState("CONNECTED");
        } else if (data.status === "REJECTED") {
          clearInterval(intervalId);
          clearPending();
          setFlowState("REJECTED");
        } else if (data.status === "EXPIRED") {
          clearInterval(intervalId);
          clearPending();
          setFlowState("EXPIRED");
        } else {
          clearInterval(intervalId);
          clearPending();
          setFlowState("FAILED");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch connection status.";
        setError(msg);
        setFlowState("FAILED");
        clearInterval(intervalId);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 3000);

    return () => clearInterval(intervalId);
  }, [searchParams]);


  const handleSaveRoles = async () => {
    setFlowState("SAVING_ROLES");
    try {
      await Promise.all(
        accounts.map((account) =>
          updateAccountPurpose(account.id, purposes[account.id] || "Other")
        )
      );
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      setFlowState("SUCCESS");
    } catch (err: any) {
      setError(err.message || "Failed to save account setup.");
      setFlowState("FAILED");
    }
  };

  if (flowState === "CONNECTING") {
    return (
      <div className="mx-auto max-w-lg mt-16 px-4 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <Spinner label="Establishing secure connection..." />
          <p className="mt-4 text-sm text-slate-500 font-medium">Connecting to account aggregator...</p>
        </div>
      </div>
    );
  }

  if (flowState === "WAITING_FOR_CONSENT") {
    return (
      <div className="mx-auto max-w-lg mt-16 px-4 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <Spinner label="Awaiting your approval..." />
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Approve Connection</h2>
          <p className="mt-2 text-sm text-slate-500">
            Please approve the request in the Setu consent screen. We will automatically detect once you complete it.
          </p>
        </div>
      </div>
    );
  }

  if (flowState === "CONNECTED") {
    return (
      <div className="mx-auto max-w-xl mt-12 px-4">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="h-6 w-6 text-teal-600" />
            <h2 className="font-display text-2xl font-semibold text-slate-900">Your accounts are connected.</h2>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            {accounts.length} {accounts.length === 1 ? "account" : "accounts"} connected. Assign a purpose for each account to help Vestor organize your financial picture.
          </p>

          <div className="space-y-4 border-t border-slate-100 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Account Setup</h3>
            
            {accounts.map((account) => (
              <div key={account.id} className="flex flex-col gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{account.institution_name}</h4>
                  <p className="text-xs text-slate-500">{account.account_type} ••••{account.masked_account_number}</p>
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={purposes[account.id] || "Other"}
                    onChange={(e) => setPurposes({ ...purposes, [account.id]: e.target.value })}
                    className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs bg-white text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                  >
                    <option value="Main / Spending">Main / Spending</option>
                    <option value="Savings">Savings</option>
                    <option value="Emergency Fund">Emergency Fund</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              <span>Controlled through your consent</span>
            </div>
            <button
              onClick={handleSaveRoles}
              className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-semibold transition"
            >
              Save account setup
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (flowState === "SAVING_ROLES") {
    return (
      <div className="mx-auto max-w-lg mt-16 px-4 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <Spinner label="Saving your setup..." />
          <p className="mt-4 text-sm text-slate-500 font-medium">Configuring accounts in Vestor...</p>
        </div>
      </div>
    );
  }

  if (flowState === "SUCCESS") {
    return (
      <div className="mx-auto max-w-lg mt-16 px-4 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm py-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 mb-6">
            <CheckCircle2 className="h-6 w-6 text-teal-600" />
          </div>
          <h2 className="font-display text-3xl font-semibold text-slate-900">You're connected.</h2>
          <p className="mt-3 text-sm text-slate-500 px-4">
            {accounts.length} {accounts.length === 1 ? "account is" : "accounts are"} now part of your Vestor financial picture.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={() => navigate("/accounts")}
              className="w-full sm:w-auto px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md shadow-sm"
            >
              View Accounts
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate("/accounts?connect=true")}
              className="w-full sm:w-auto px-6 py-2 border border-slate-200 text-slate-700 font-medium rounded-md hover:bg-slate-50"
            >
              Connect another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error States: REJECTED, EXPIRED, FAILED
  const errorTitle = 
    flowState === "REJECTED" ? "Connection Rejected" :
    flowState === "EXPIRED" ? "Connection Expired" : "Connection Failed";

  const errorDesc =
    flowState === "REJECTED" ? "You rejected the bank connection request. You can try connecting again." :
    flowState === "EXPIRED" ? "Your bank connection session expired. Please attempt reconnecting." :
    error || "We couldn't connect this account right now. Please try again.";

  return (
    <div className="mx-auto max-w-lg mt-16 px-4 text-center">
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-6">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-slate-900">{errorTitle}</h2>
        <p className="mt-2 text-sm text-slate-500 px-2">{errorDesc}</p>

        <div className="mt-8 flex justify-center gap-4">
          <Button
            onClick={() => navigate("/accounts")}
            variant="secondary"
          >
            Return to Accounts
          </Button>
          <Button
            onClick={() => navigate("/accounts?connect=true")}
            className="bg-teal-600 text-white hover:bg-teal-700"
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
