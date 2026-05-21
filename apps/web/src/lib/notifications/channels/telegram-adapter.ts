/**
 * Telegram Channel Adapter — Bot API
 * ─────────────────────────────────────────────────────────
 * Sends messages via the Telegram Bot API.
 * Falls back to mock when bot token is not configured.
 */

import type { ChannelAdapter, ChannelSendParams, ChannelDispatchResult } from "../types";
import { MockAdapter } from "./mock-adapter";

export class TelegramAdapter implements ChannelAdapter {
  channel = "telegram" as const;
  providerName = "telegram-bot-api";

  private botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  private defaultChatId = process.env.TELEGRAM_CHAT_ID || "";
  private mockFallback = new MockAdapter("telegram");

  isConfigured(): boolean {
    return (
      !!this.botToken &&
      !this.botToken.startsWith("your_") &&
      this.botToken.length > 10
    );
  }

  async send(params: ChannelSendParams): Promise<ChannelDispatchResult> {
    if (!this.isConfigured()) {
      console.log("[NOTIFICATION:TELEGRAM] Bot token not configured — using mock");
      return this.mockFallback.send(params);
    }

    try {
      // Use recipient contact as chat_id, or fall back to default
      const chatId = params.recipientContact || this.defaultChatId;

      if (!chatId) {
        return {
          success: false,
          recipientContact: "",
          provider: this.providerName,
          errorCode: "NO_CHAT_ID",
          error: "No Telegram chat_id provided and no default configured",
          retryable: false,
        };
      }

      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: params.message,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        const isTransient =
          data.error_code === 429 || // Rate limited
          data.error_code >= 500;    // Server error
        return {
          success: false,
          recipientContact: chatId,
          provider: this.providerName,
          errorCode: String(data.error_code || "UNKNOWN"),
          error: data.description || "Telegram API error",
          retryable: isTransient,
        };
      }

      return {
        success: true,
        recipientContact: chatId,
        provider: this.providerName,
        providerMessageId: String(data.result?.message_id || ""),
      };
    } catch (err) {
      return {
        success: false,
        recipientContact: params.recipientContact,
        provider: this.providerName,
        errorCode: "NETWORK_ERROR",
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
      };
    }
  }
}
