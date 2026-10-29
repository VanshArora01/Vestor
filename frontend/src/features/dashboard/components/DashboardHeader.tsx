import { useAuth } from "../../../context/AuthContext";
import { Link } from "react-router-dom";
import { Target, Link2 } from "lucide-react";
import { connectBank } from "../../../api/banking";
import { useState } from "react";
import { Spinner } from "../../../components/ui/Spinner";

export function DashboardHeader() {
  const { user } = useAuth();
  const today = new Date();
  const [connecting, setConnecting] = useState(false);

  const formattedDate = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hour = today.getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17) {
    greeting = "Good evening";
  }

  const handleConnectBank = async () => {
    const mobileNumber = window.prompt(
      "Enter your 10-digit mobile number for bank connection:",
      "9999999999"
    );
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

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between border-b border-border pb-5">
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text">
          {greeting}, {user?.name?.split(" ")[0] || "Friend"}
        </h1>
        <p className="font-sans text-xs text-muted">{formattedDate}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleConnectBank}
          disabled={connecting}
          className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-2 px-3 py-1.5 font-sans text-xs font-medium text-text hover:border-border-strong transition-colors disabled:opacity-60"
        >
          {connecting ? <Spinner label="Connecting..." /> : <Link2 className="h-3.5 w-3.5 text-accent" />}
          <span>Connect Bank</span>
        </button>

        <Link
          to="/goals"
          className="inline-flex items-center gap-1.5 rounded-control bg-accent px-3 py-1.5 font-sans text-xs font-semibold text-accent-text hover:brightness-105 transition-all"
        >
          <Target className="h-3.5 w-3.5" />
          <span>New Goal</span>
        </Link>
      </div>
    </div>
  );
}
