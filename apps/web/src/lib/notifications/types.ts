/**
 * Notification System — Types
 * ─────────────────────────────────────────────────────────
 * Shared types for the notification dispatcher, channels,
 * queue, worker, and logging infrastructure.
 */

// ── Supported notification channels ─────────────────────
export type NotificationChannel = "whatsapp" | "telegram" | "email" | "sms";

export const ALL_CHANNELS: NotificationChannel[] = [
  "whatsapp",
  "telegram",
  "email",
  "sms",
];

// ── Delivery status lifecycle ───────────────────────────
export type DeliveryStatus =
  | "pending"
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "retrying";

// ── Event fired by application code ─────────────────────
export interface NotificationEvent {
  /** The business event type, e.g. "order_status_update" */
  eventType: string;
  /** Arbitrary payload for template interpolation */
  payload: Record<string, unknown>;
  /** userId of the data owner who triggered the event */
  triggeredBy: string;
  /** Optional: specific recipient contact (phone/email/chatId) */
  recipientContact?: string;
  /** Optional: specific channel override */
  channel?: NotificationChannel;
  /** Optional: metadata for tracking */
  metadata?: Record<string, unknown>;
}

// ── MongoDB document shape for notification_templates ───
export interface NotificationTemplateDoc {
  _id?: unknown;
  userId: string;
  name: string;
  trigger: string;
  channels: NotificationChannel[];
  /** Generic template (backward compat — used if per-channel not set) */
  template: string;
  /** Per-channel content overrides */
  whatsappContent?: string;
  telegramContent?: string;
  emailSubject?: string;
  emailBody?: string;
  smsContent?: string;
  /** Template variables for validation */
  variables?: string[];
  /** Whether this template is active */
  active: boolean;
  /** Template version for audit trail */
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── MongoDB document shape for notification_logs ────────
export interface NotificationLogDoc {
  _id?: unknown;
  userId: string;
  templateId: string;
  templateName: string;
  channel: NotificationChannel;
  eventType: string;
  payload: Record<string, unknown>;
  recipientContact: string;
  recipientName: string;
  /** The final rendered message sent */
  renderedContent: string;
  /** Raw template message (backward compat alias) */
  message: string;
  status: DeliveryStatus;
  /** Provider used (e.g. "twilio", "telegram-bot-api", "nodemailer") */
  provider?: string;
  /** Provider-returned message/SID */
  providerMessageId?: string;
  /** Number of retry attempts */
  retryCount: number;
  /** Timestamp of last dispatch attempt */
  lastAttemptAt?: Date;
  /** Machine-readable error code */
  errorCode?: string;
  /** Human-readable error description */
  error?: string;
  /** Idempotency key to prevent duplicates */
  idempotencyKey?: string;
  sentAt: Date;
  createdAt?: Date;
}

// ── MongoDB document for delivery jobs (queue) ──────────
export interface DeliveryJobDoc {
  _id?: unknown;
  /** Reference to notification_logs._id */
  logId: string;
  userId: string;
  channel: NotificationChannel;
  /** Current attempt number (starts at 1) */
  attempt: number;
  /** Max attempts before dead-letter */
  maxAttempts: number;
  status: "pending" | "processing" | "completed" | "failed" | "dead_letter";
  /** When to next attempt delivery */
  nextRetryAt: Date;
  /** Lock to prevent double-processing */
  lockedUntil: Date | null;
  /** Payload needed for dispatch */
  dispatchPayload: {
    recipientContact: string;
    renderedContent: string;
    templateId: string;
    eventType: string;
    /** Per-channel content if available */
    emailSubject?: string;
    emailBody?: string;
    metadata?: Record<string, unknown>;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ── Result from a channel dispatch attempt ──────────────
export interface ChannelDispatchResult {
  success: boolean;
  recipientContact: string;
  /** Provider name (e.g. "twilio", "telegram-bot-api") */
  provider?: string;
  /** Provider-specific message ID for tracking */
  providerMessageId?: string;
  /** Machine-readable error code */
  errorCode?: string;
  /** Human-readable error */
  error?: string;
  /** Whether the error is transient (retryable) */
  retryable?: boolean;
}

// ── Channel adapter interface ───────────────────────────
export interface ChannelAdapter {
  /** Channel this adapter handles */
  channel: NotificationChannel;
  /** Provider name for logging */
  providerName: string;
  /** Whether this adapter has valid credentials configured */
  isConfigured(): boolean;
  /** Send a notification */
  send(params: ChannelSendParams): Promise<ChannelDispatchResult>;
}

export interface ChannelSendParams {
  recipientContact: string;
  message: string;
  eventType: string;
  /** For email: subject line */
  subject?: string;
  /** For email: HTML body */
  htmlBody?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ── Mapping from app eventType → template trigger field ─
export const EVENT_TO_TRIGGER: Record<string, string> = {
  order_status_update: "order_status_change",
  invoice_generated: "invoice_created",
  payment_reminder: "payment_overdue",
  low_stock_alert: "stock_low",
  production_complete: "production_complete",
};

// ── Retry backoff schedule (in seconds) ─────────────────
export const RETRY_BACKOFF_SECONDS = [10, 30, 120, 600, 1800];
export const MAX_RETRY_ATTEMPTS = 5;
export const JITTER_FACTOR = 0.2; // ±20%
