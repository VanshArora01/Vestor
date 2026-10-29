import { apiClient } from "./client";

export interface PageContextPayload {
  page: string;
  path?: string;
  route_title?: string;
  selected_item_id?: string;
  selected_item_name?: string;
  active_month?: string;
  active_filter?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface AdvisorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools_used?: string[] | null;
  provider?: string | null;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: AdvisorMessage[];
}

export interface SendMessageRequest {
  content: string;
  conversation_id?: string | null;
  page_context?: PageContextPayload | null;
}

export interface SendMessageResponse {
  conversation_id: string;
  user_message: AdvisorMessage;
  assistant_message: AdvisorMessage;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const response = await apiClient.get<{ items: ConversationSummary[] }>("/advisor/conversations");
  return response.data.items;
}

export async function createConversation(): Promise<ConversationSummary> {
  const response = await apiClient.post<ConversationSummary>("/advisor/conversations");
  return response.data;
}

export async function getConversation(conversationId: string): Promise<ConversationDetail> {
  const response = await apiClient.get<ConversationDetail>(`/advisor/conversations/${conversationId}`);
  return response.data;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiClient.delete(`/advisor/conversations/${conversationId}`);
}

export async function listMessages(conversationId: string, limit = 50): Promise<AdvisorMessage[]> {
  const response = await apiClient.get<{ items: AdvisorMessage[] }>(
    `/advisor/conversations/${conversationId}/messages`,
    { params: { limit } }
  );
  return response.data.items;
}

export async function sendMessage(payload: SendMessageRequest): Promise<SendMessageResponse> {
  const response = await apiClient.post<SendMessageResponse>("/advisor/messages", payload);
  return response.data;
}
