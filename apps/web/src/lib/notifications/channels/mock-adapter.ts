/**
 * Mock Channel Adapter
 * ─────────────────────────────────────────────────────────
 * Fallback adapter that logs notifications to console.
 * Used when real provider credentials are not configured.
 */

import type { ChannelAdapter, ChannelSendParams, ChannelDispatchResult, NotificationChannel } from "../types";

export class MockAdapter implements ChannelAdapter {
  channel: NotificationChannel;
  providerName = "mock";

  constructor(channel: NotificationChannel) {
    this.channel = channel;
  }

  isConfigured(): boolean {
    return true; // Mock is always available
  }

  async send(params: ChannelSendParams): Promise<ChannelDispatchResult> {
    // Simulate network delay (50-150ms)
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
}
