/**
 * Email Channel Adapter — Nodemailer SMTP
 * ─────────────────────────────────────────────────────────
 * Sends email via SMTP using Nodemailer.
 * Falls back to mock when SMTP credentials are missing.
 */

import type { ChannelAdapter, ChannelSendParams, ChannelDispatchResult } from "../types";
import { MockAdapter } from "./mock-adapter";

// Lazy-load nodemailer to avoid bundling issues
let nodemailer: typeof import("nodemailer") | null = null;

async function getNodemailer() {
  if (!nodemailer) {
    try {
      nodemailer = await import(/* webpackIgnore: true */ "nodemailer");
    } catch {
      console.warn("[NOTIFICATION:EMAIL] nodemailer not installed — using mock");
      return null;
    }
  }
  return nodemailer;
}

export class EmailAdapter implements ChannelAdapter {
  channel = "email" as const;
  providerName = "nodemailer-smtp";

  private host = process.env.SMTP_HOST || "";
  private port = parseInt(process.env.SMTP_PORT || "587", 10);
  private user = process.env.SMTP_USER || "";
  private pass = process.env.SMTP_PASS || "";
  private from = process.env.SMTP_FROM || "IND Manager <noreply@indmanager.com>";
  private mockFallback = new MockAdapter("email");

  isConfigured(): boolean {
    return (
      !!this.host &&
      !this.host.startsWith("your_") &&
      !!this.user &&
      !this.user.startsWith("your_") &&
      !!this.pass &&
      !this.pass.startsWith("your_")
    );
  }

  async send(params: ChannelSendParams): Promise<ChannelDispatchResult> {
    if (!this.isConfigured()) {
      console.log("[NOTIFICATION:EMAIL] SMTP credentials not configured — using mock");
      return this.mockFallback.send(params);
    }

    const nm = await getNodemailer();
    if (!nm) {
      return this.mockFallback.send(params);
    }

    try {
      const transporter = nm.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        auth: { user: this.user, pass: this.pass },
        tls: { rejectUnauthorized: false },
      });

      const htmlBody = params.htmlBody || this.wrapInHtmlTemplate(params.message, params.subject);

      const info = await transporter.sendMail({
        from: this.from,
        to: params.recipientContact,
        subject: params.subject || `Notification: ${params.eventType.replace(/_/g, " ")}`,
        text: params.message,
        html: htmlBody,
      });

      return {
        success: true,
        recipientContact: params.recipientContact,
        provider: this.providerName,
        providerMessageId: info.messageId || "",
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // SMTP transient errors
      const isTransient =
        errMsg.includes("ETIMEDOUT") ||
        errMsg.includes("ECONNRESET") ||
        errMsg.includes("421") ||
        errMsg.includes("450");

      return {
        success: false,
        recipientContact: params.recipientContact,
        provider: this.providerName,
        errorCode: "SMTP_ERROR",
        error: errMsg,
        retryable: isTransient,
      };
    }
  }

  /** Wrap plain text in a simple responsive HTML email template */
  private wrapInHtmlTemplate(text: string, subject?: string): string {
    const lines = text.split("\n").map((l) => `<p style="margin:0 0 8px 0;line-height:1.6">${l}</p>`).join("");
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;margin:0;padding:32px 16px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e5ea">
<h2 style="margin:0 0 16px;color:#1d1d1f;font-size:18px">${subject || "Notification"}</h2>
${lines}
<hr style="border:none;border-top:1px solid #e5e5ea;margin:24px 0">
<p style="font-size:11px;color:#8e8e93;margin:0">Sent by IND Manager · Notification Engine</p>
</div></body></html>`;
  }
}
