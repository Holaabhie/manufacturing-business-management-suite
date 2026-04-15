/**
 * Webhook System — Domain Types
 * ─────────────────────────────────────────────────────────
 * Pure TypeScript types for the webhook delivery system.
 */

// ─── Entities ───────────────────────────────────────────────────

export interface WebhookEndpoint {
    id: string;
    tenantId: string;
    url: string;
    events: string[];     // event types to subscribe to
    secret: string;       // for HMAC signature verification
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface WebhookDelivery {
    id: string;
    endpointId: string;
    eventType: string;
    payload: Record<string, unknown>;
    statusCode: number | null;
    attempt: number;
    maxAttempts: number;
    deliveredAt: Date | null;
    nextRetryAt: Date | null;
    createdAt: Date;
}

// ─── DTOs ───────────────────────────────────────────────────────

export interface CreateWebhookEndpointDTO {
    url: string;
    events: string[];
    secret?: string;
}

export interface UpdateWebhookEndpointDTO {
    url?: string;
    events?: string[];
    isActive?: boolean;
}

// ─── Notification Types ─────────────────────────────────────────

export interface NotificationPayload {
    type: "email" | "sms" | "push" | "webhook";
    recipient: string;
    subject?: string;
    body: string;
    metadata?: Record<string, unknown>;
}

export interface NotificationResult {
    success: boolean;
    provider: string;
    messageId?: string;
    error?: string;
}
