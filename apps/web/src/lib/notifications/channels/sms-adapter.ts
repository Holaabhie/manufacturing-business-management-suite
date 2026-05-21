/**
 * SMS Channel Adapter — Twilio
 * ─────────────────────────────────────────────────────────
 * Sends SMS via Twilio's Programmable Messaging API.
 * Falls back to mock when credentials are placeholder values.
 */

import type { ChannelAdapter, ChannelSendParams, ChannelDispatchResult } from "../types";
import { MockAdapter } from "./mock-adapter";

const SMS_MAX_LENGTH = 1600; // Twilio concatenation limit

function isPlaceholder(val: string | undefined): boolean {
  return !val || val.startsWith("your_") || val === "";
}

export class SmsAdapter implements ChannelAdapter {
  channel = "sms" as const;
  providerName = "twilio-sms";

  private accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  private authToken = process.env.TWILIO_AUTH_TOKEN || "";
  private fromNumber = process.env.TWILIO_PHONE_NUMBER || "";
  private mockFallback = new MockAdapter("sms");

  isConfigured(): boolean {
    return (
      !isPlaceholder(this.accountSid) &&
      !isPlaceholder(this.authToken) &&
      !isPlaceholder(this.fromNumber)
    );
  }

  async send(params: ChannelSendParams): Promise<ChannelDispatchResult> {
    if (!this.isConfigured()) {
      console.log("[NOTIFICATION:SMS] Twilio credentials not configured — using mock");
      return this.mockFallback.send(params);
    }

    try {
      const toNumber = params.recipientContact.startsWith("+")
        ? params.recipientContact
        : `+${params.recipientContact}`;

      // Truncate message for SMS if too long
      const smsBody = params.message.length > SMS_MAX_LENGTH
        ? params.message.substring(0, SMS_MAX_LENGTH - 3) + "..."
        : params.message;

      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");

      const body = new URLSearchParams({
        From: this.fromNumber,
        To: toNumber,
        Body: smsBody,
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
          error: data.message || `Twilio SMS error: ${response.status}`,
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
