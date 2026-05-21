/**
 * Channel Adapter Registry
 * ─────────────────────────────────────────────────────────
 * Central registry for all notification channel adapters.
 * Returns the real adapter if credentials are configured,
 * otherwise falls back to the MockAdapter.
 */

import type { ChannelAdapter, NotificationChannel } from "../types";
import { WhatsAppAdapter } from "./whatsapp-adapter";
import { TelegramAdapter } from "./telegram-adapter";
import { EmailAdapter } from "./email-adapter";
import { SmsAdapter } from "./sms-adapter";
import { MockAdapter } from "./mock-adapter";

// ── Singleton adapter instances ──
const adapters: Record<NotificationChannel, ChannelAdapter> = {
  whatsapp: new WhatsAppAdapter(),
  telegram: new TelegramAdapter(),
  email: new EmailAdapter(),
  sms: new SmsAdapter(),
};

/**
 * Get the adapter for a specific channel.
 * Returns the real adapter if configured, else mock.
 */
export function getAdapter(channel: NotificationChannel): ChannelAdapter {
  const adapter = adapters[channel];
  if (!adapter) {
    console.warn(`[NOTIFICATION] Unknown channel: ${channel} — using mock`);
    return new MockAdapter(channel);
  }
  return adapter;
}

/**
 * Check which channels have real (non-mock) credentials configured.
 */
export function getChannelStatus(): Array<{
  channel: NotificationChannel;
  configured: boolean;
  provider: string;
}> {
  return (Object.entries(adapters) as [NotificationChannel, ChannelAdapter][]).map(
    ([channel, adapter]) => ({
      channel,
      configured: adapter.isConfigured(),
      provider: adapter.isConfigured() ? adapter.providerName : "mock",
    })
  );
}
