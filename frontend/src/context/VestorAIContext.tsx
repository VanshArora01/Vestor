import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  listConversations,
  getConversation,
  deleteConversation as apiDeleteConversation,
  sendMessage as apiSendMessage,
  type AdvisorMessage,
  type ConversationSummary,
  type ConversationDetail,
} from "../api/advisor";
import { usePageContext } from "./PageContext";
import { useAuth } from "./AuthContext";

interface VestorAIContextType {
  // Floating Window state
  isFloatingOpen: boolean;
  isFloatingMinimized: boolean;
  openFloating: () => void;
  closeFloating: () => void;
  minimizeFloating: () => void;
  restoreFloating: () => void;

  // Active conversation state
  activeConversationId: string | null;
  conversations: ConversationSummary[];
  messages: AdvisorMessage[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  sendError: string | null;
  draftMessage: string;
  setDraftMessage: (val: string) => void;

  // Actions
  selectConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (customText?: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const VestorAIContext = createContext<VestorAIContextType | undefined>(undefined);

export function VestorAIProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { context: pageContext } = usePageContext();

  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState(false);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  // Fetch conversations on auth
  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingConversations(true);
      const items = await listConversations();
      setConversations(items);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshConversations();
    } else {
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
      setIsFloatingOpen(false);
    }
  }, [isAuthenticated, refreshConversations]);

  // Load messages when active conversation changes
  const selectConversation = useCallback(async (convId: string) => {
    setActiveConversationId(convId);
    setSendError(null);
    try {
      setIsLoadingMessages(true);
      const detail: ConversationDetail = await getConversation(convId);
      setMessages(detail.messages || []);
    } catch (err) {
      console.error("Failed to fetch conversation detail:", err);
      setSendError("Could not load conversation history.");
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setSendError(null);
  }, []);

  const deleteConversation = useCallback(
    async (convId: string) => {
      try {
        await apiDeleteConversation(convId);
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConversationId === convId) {
          startNewConversation();
        }
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    },
    [activeConversationId, startNewConversation]
  );

  const sendMessage = useCallback(
    async (customText?: string) => {
      const text = (customText !== undefined ? customText : draftMessage).trim();
      if (!text || isSending) return;

      setSendError(null);
      setLastUserMessage(text);
      if (customText === undefined) {
        setDraftMessage("");
      }

      // Optimistic user message
      const tempUserMsg: AdvisorMessage = {
        id: `optimistic-${Date.now()}`,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setIsSending(true);

      try {
        const payload = {
          content: text,
          conversation_id: activeConversationId || undefined,
          page_context: {
            page: pageContext.page,
            path: pageContext.path,
            route_title: pageContext.route_title,
            selected_item_id: pageContext.selected_item_id,
            selected_item_name: pageContext.selected_item_name,
            active_month: pageContext.active_month,
            active_filter: pageContext.active_filter,
            metadata: pageContext.metadata,
          },
        };

        const res = await apiSendMessage(payload);

        // Update active conversation ID
        if (!activeConversationId) {
          setActiveConversationId(res.conversation_id);
          void refreshConversations();
        }

        // Replace optimistic user message with actual user message and append assistant message
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
          return [...filtered, res.user_message, res.assistant_message];
        });
      } catch (err: any) {
        console.error("Failed to send message to Vestor AI:", err);
        let errorMsg = "Vestor AI is momentarily unavailable. Please retry.";
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;

        if (status === 401) {
          errorMsg = "Authentication required. Please sign in again.";
        } else if (status === 404) {
          errorMsg = "Conversation or service endpoint not found. Please refresh or start a new chat.";
        } else if (status === 504 || err?.code === "ECONNABORTED") {
          errorMsg = "Request timed out waiting for the AI response. Please retry.";
        } else if (detail) {
          if (typeof detail === "string") {
            errorMsg = detail;
          } else if (detail.message) {
            errorMsg = detail.message;
          }
        } else if (err?.message) {
          errorMsg = err.message;
        }

        setSendError(errorMsg);
      } finally {
        setIsSending(false);
      }
    },
    [draftMessage, isSending, activeConversationId, pageContext, refreshConversations]
  );

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessage) {
      await sendMessage(lastUserMessage);
    }
  }, [lastUserMessage, sendMessage]);

  const openFloating = useCallback(() => {
    setIsFloatingOpen(true);
    setIsFloatingMinimized(false);
  }, []);

  const closeFloating = useCallback(() => {
    setIsFloatingOpen(false);
  }, []);

  const minimizeFloating = useCallback(() => {
    setIsFloatingMinimized(true);
  }, []);

  const restoreFloating = useCallback(() => {
    setIsFloatingMinimized(false);
    setIsFloatingOpen(true);
  }, []);

  return (
    <VestorAIContext.Provider
      value={{
        isFloatingOpen,
        isFloatingMinimized,
        openFloating,
        closeFloating,
        minimizeFloating,
        restoreFloating,
        activeConversationId,
        conversations,
        messages,
        isLoadingConversations,
        isLoadingMessages,
        isSending,
        sendError,
        draftMessage,
        setDraftMessage,
        selectConversation,
        startNewConversation,
        deleteConversation,
        sendMessage,
        retryLastMessage,
        refreshConversations,
      }}
    >
      {children}
    </VestorAIContext.Provider>
  );
}

export function useVestorAI() {
  const ctx = useContext(VestorAIContext);
  if (!ctx) {
    throw new Error("useVestorAI must be used within a VestorAIProvider");
  }
  return ctx;
}
