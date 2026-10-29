import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { PageContextPayload } from "../api/advisor";

export interface ActivePageContext extends PageContextPayload {
  suggestedPrompts: string[];
}

const DEFAULT_ROUTE_CONTEXTS: Record<string, { page: string; title: string; prompts: string[] }> = {
  "/dashboard": {
    page: "dashboard",
    title: "Financial Dashboard",
    prompts: [
      "Summarise my overall financial health",
      "How is my emergency fund tracking?",
      "What is my total connected cash?",
    ],
  },
  "/money": {
    page: "money",
    title: "Money Plan",
    prompts: [
      "Explain my Available to Plan amount",
      "Am I spending more than planned this month?",
      "Why is my plan different from my bank balance?",
    ],
  },
  "/accounts": {
    page: "accounts",
    title: "Connected Accounts",
    prompts: [
      "Are all my connected accounts synced?",
      "How much cash is earmarked for goals?",
      "Explain consent vs sync status",
    ],
  },
  "/goals": {
    page: "goals",
    title: "Savings Goals",
    prompts: [
      "How much more do I need to reach my targets?",
      "Are goal allocations real bank transfers?",
      "Explain virtual earmarks vs account balances",
    ],
  },
  "/invest": {
    page: "invest",
    title: "Investment Portfolio",
    prompts: [
      "What is my total portfolio gain or return?",
      "Explain my asset allocation breakdown",
      "Are my investment valuations up to date?",
    ],
  },
  "/learn": {
    page: "learn",
    title: "Financial Literacy",
    prompts: [
      "Explain the 50-30-20 budgeting rule",
      "How does inflation impact my savings in India?",
      "What is the difference between index funds and active funds?",
    ],
  },
  "/market": {
    page: "market",
    title: "Market",
    prompts: [
      "Explain asset allocation between equity and debt",
      "How does compound interest work over 10 years?",
      "What are the benefits of low-cost index investing?",
    ],
  },
};

interface PageContextType {
  context: ActivePageContext;
  setCustomContext: (custom: Partial<ActivePageContext> | null) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageContextProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [customContext, setCustomContext] = useState<Partial<ActivePageContext> | null>(null);

  // Clear custom context on route changes
  useEffect(() => {
    setCustomContext(null);
  }, [location.pathname]);

  const activeContext: ActivePageContext = useMemo(() => {
    const pathname = location.pathname;
    let base = DEFAULT_ROUTE_CONTEXTS[pathname];

    if (!base) {
      if (pathname.startsWith("/accounts/")) {
        base = {
          page: "account_detail",
          title: "Account Details",
          prompts: [
            "Summarise recent transactions for this account",
            "Why is this transaction unclassified?",
            "Explain this account's earmarked and unallocated balance",
          ],
        };
      } else {
        base = {
          page: "general",
          title: "Vestor Workspace",
          prompts: [
            "Give me an overview of my finances",
            "What can Vestor AI help me with?",
            "Explain the 50-30-20 rule",
          ],
        };
      }
    }

    return {
      page: customContext?.page || base.page,
      path: pathname,
      route_title: customContext?.route_title || base.title,
      selected_item_id: customContext?.selected_item_id,
      selected_item_name: customContext?.selected_item_name,
      active_month: customContext?.active_month,
      active_filter: customContext?.active_filter,
      metadata: customContext?.metadata,
      suggestedPrompts: customContext?.suggestedPrompts || base.prompts,
    };
  }, [location.pathname, customContext]);

  return (
    <PageContext.Provider value={{ context: activeContext, setCustomContext }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  const ctx = useContext(PageContext);
  if (!ctx) {
    throw new Error("usePageContext must be used within a PageContextProvider");
  }
  return ctx;
}

/**
 * Hook for pages and components to register active context (e.g. selected account, month, goal).
 * Automatically cleans up on unmount or when dependencies change.
 */
export function useRegisterPageContext(registration: Partial<ActivePageContext> | null) {
  const { setCustomContext } = usePageContext();

  useEffect(() => {
    if (registration) {
      setCustomContext(registration);
    }
    return () => {
      setCustomContext(null);
    };
  }, [
    registration?.page,
    registration?.selected_item_id,
    registration?.selected_item_name,
    registration?.active_month,
    registration?.active_filter,
    JSON.stringify(registration?.metadata || {}),
  ]);
}
