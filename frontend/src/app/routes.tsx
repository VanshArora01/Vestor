import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import { AcademyPage } from "../pages/academy/AcademyPage";
import { AdvisorPage } from "../pages/advisor/AdvisorPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { GoalsPage } from "../pages/goals/GoalsPage";
import { MarketPage } from "../pages/market/MarketPage";
import { MoneyPage } from "../pages/money/MoneyPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PortfolioPage } from "../pages/portfolio/PortfolioPage";
import { BankingCallbackPage } from "../pages/banking/BankingCallbackPage";
import { SettingsLayout } from "../pages/settings/SettingsLayout";
import { AccountsPage } from "../pages/banking/AccountsPage";
import { AccountDetailPage } from "../pages/banking/AccountDetailPage";
import { PaperTradingPage } from "../pages/invest/PaperTradingPage";
import { LandingPage } from "../pages/landing/LandingPage";

function PublicOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <Spinner label="Checking session…" />;
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/money" element={<MoneyPage />} />
          <Route path="/finance" element={<Navigate to="/money" replace />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/learn" element={<AcademyPage />} />
          <Route path="/academy" element={<Navigate to="/learn" replace />} />
          <Route path="/invest" element={<PortfolioPage />} />
          <Route path="/portfolio" element={<Navigate to="/invest" replace />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/paper-trading" element={<PaperTradingPage />} />
          <Route path="/ai" element={<AdvisorPage />} />
          <Route path="/advisor" element={<Navigate to="/ai" replace />} />
          <Route path="/banking/connect/callback" element={<BankingCallbackPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/accounts/:accountId" element={<AccountDetailPage />} />
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="/accounts" replace />} />
            <Route path="connections" element={<Navigate to="/accounts" replace />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
