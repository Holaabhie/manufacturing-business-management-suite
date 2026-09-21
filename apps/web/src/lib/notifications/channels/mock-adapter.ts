/**
 * Mock Channel Adapter
 * ─────────────────────────────────────────────────────────
 * Fallback adapter that logs notifications to console.
 *
 * Behavior:
 *  - Development (NODE_ENV=development or DEV_MOCK_NOTIFICATIONS=true):
 *      Logs the notification and returns success: true so the
 *      worker marks it as "sent". This keeps local dev ergonomic.
 *  - Production (all other cases):
 *      Returns success: false with errorCode CHANNEL_NOT_CONFIGURED
 *      and retryable: false. The worker maps this to the distinct
 *      "not_configured" log status so the dashboard can tell
 *      config issues apart from real delivery failures.
 */

import type { ChannelAdapter, ChannelSendParams, ChannelDispatchResult, NotificationChannel } from "../types";

/**
 * Returns true when mock notifications should simulate success.
 * True in development OR when explicitly opted-in via env var.
 */
function isDevMode(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.DEV_MOCK_NOTIFICATIONS === "true"
  );
}

export class MockAdapter implements ChannelAdapter {
  channel: NotificationChannel;
  providerName = "mock";

  constructor(channel: NotificationChannel) {
    this.channel = channel;
  }

  /** Mock is never "configured" — it's a fallback, not a real provider. */
  isConfigured(): boolean {
    return false;
  }

  async send(params: ChannelSendParams): Promise<ChannelDispatchResult> {
    if (isDevMode()) {
      // ── Dev mode: simulate success ──
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));

      console.log(
        `[NOTIFICATION:MOCK] channel: ${this.channel} | event: ${params.eventType} | to: ${params.recipientContact}`
      );
      console.log(`[NOTIFICATION:MOCK] message: ${params.message.substring(0, 200)}`);

      return {
        success: true,
        recipientContact: params.recipientContact,
        provider: "mock",
        providerMessageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };
    }

    // ── Production: channel not configured — return distinct failure ──
    console.warn(
      `[NOTIFICATION:MOCK] Channel "${this.channel}" not configured in production — notification NOT sent for event: ${params.eventType}`
    );

    return {
      success: false,
      recipientContact: params.recipientContact,
      provider: "mock",
      errorCode: "CHANNEL_NOT_CONFIGURED",
      error: `Channel "${this.channel}" has no configured provider. Set up credentials in environment variables.`,
      retryable: false,
    };
  }
}
