// ---------------------------------------------------------------------------
// AI Assistant - Type Definitions
// Webhook-only architecture. Zero AI SDK imports.
// ---------------------------------------------------------------------------

// --- Chat Roles ---
export type ChatRole = "user" | "assistant";

// --- Message Status ---
export type MessageStatus = "sending" | "sent" | "error";

// --- Message ---
export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  status: MessageStatus;
  errorMessage?: string;
}

// --- Chat Request (browser -> Next.js API) ---
export interface ChatRequest {
  message: string;
  sessionId: string;
}

// --- Webhook Payload (Next.js API -> upstream webhook) ---
export interface WebhookPayload {
  message: string;
  sessionId: string;
  source: "ind-manager";
}

// --- Upstream Webhook Response (tolerant) ---
// Different webhook providers (n8n, Make, custom) return data
// in different shapes. We accept any of these common keys.
export interface UpstreamWebhookResponse {
  reply?: string;
  message?: string;
  text?: string;
  output?: string;
  response?: string;
  error?: string;
}

// --- Chat API Response (Next.js API -> browser) ---
export interface ChatResponse {
  reply: string;
}

// --- Error Codes ---
export type ChatErrorCode =
  | "WEBHOOK_NOT_CONFIGURED"
  | "INVALID_REQUEST"
  | "MESSAGE_TOO_LONG"
  | "MESSAGE_EMPTY"
  | "UPSTREAM_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_INVALID_RESPONSE"
  | "INTERNAL_ERROR";

// --- Chat Error Response ---
export interface ChatErrorResponse {
  error: string;
  code: ChatErrorCode;
}

// --- Type Guard ---
export function isChatError(
  value: ChatResponse | ChatErrorResponse
): value is ChatErrorResponse {
  return "code" in value && "error" in value;
}

// --- Webhook Status ---
export interface WebhookStatus {
  configured: boolean;
  url: string | null;
}

// --- Webhook Test Result ---
export interface WebhookTestResult {
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
}
