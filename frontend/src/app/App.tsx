import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { PageContextProvider } from "../context/PageContext";
import { VestorAIProvider } from "../context/VestorAIContext";
import { AppRoutes } from "./routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PageContextProvider>
            <VestorAIProvider>
              <AppRoutes />
            </VestorAIProvider>
          </PageContextProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
