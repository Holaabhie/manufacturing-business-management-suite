/**
 * WhatsApp Channel Adapter — Twilio
 * ─────────────────────────────────────────────────────────
 * Sends WhatsApp messages via Twilio's WhatsApp Business API.
 * Falls back to mock when credentials are placeholder values.
 */

import type { ChannelAdapter, ChannelSendParams, ChannelDispatchResult } from "../types";
import { MockAdapter } from "./mock-adapter";

const PLACEHOLDER_VALUES = [
  "your_twilio_auth_token_here",
  "your_twilio_phone_number_here",
  "",
  undefined,
];

function isPlaceholder(val: string | undefined): boolean {
  return PLACEHOLDER_VALUES.includes(val) || !val || val.startsWith("your_");
}

export class WhatsAppAdapter implements ChannelAdapter {
  channel = "whatsapp" as const;
  providerName = "twilio-whatsapp";

  private accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  private authToken = process.env.TWILIO_AUTH_TOKEN || "";
  private fromNumber = process.env.TWILIO_PHONE_NUMBER || "";
  private mockFallback = new MockAdapter("whatsapp");

  isConfigured(): boolean {
    return (
      !isPlaceholder(this.accountSid) &&
      !isPlaceholder(this.authToken) &&
      !isPlaceholder(this.fromNumber)
    );
  }

  async send(params: ChannelSendParams): Promise<ChannelDispatchResult> {
    if (!this.isConfigured()) {
      console.log("[NOTIFICATION:WHATSAPP] Credentials not configured — using mock");
      return this.mockFallback.send(params);
    }

    try {
      const toNumber = params.recipientContact.startsWith("+")
        ? params.recipientContact
        : `+${params.recipientContact}`;

      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");

      const body = new URLSearchParams({
        From: `whatsapp:${this.fromNumber}`,
        To: `whatsapp:${toNumber}`,
        Body: params.message,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        const isTransient = response.status >= 500 || response.status === 429;
        return {
          success: false,
          recipientContact: toNumber,
          provider: this.providerName,
          errorCode: String(data.code || response.status),
          error: data.message || `Twilio error: ${response.status}`,
          retryable: isTransient,
        };
      }

      return {
        success: true,
        recipientContact: toNumber,
        provider: this.providerName,
        providerMessageId: data.sid,
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
