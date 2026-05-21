/**
 * Template Renderer
 * ─────────────────────────────────────────────────────────
 * Renders notification templates by interpolating variables
 * and selecting per-channel content when available.
 */

import type { NotificationChannel } from "./types";

/**
 * Interpolate {{variable}} placeholders with payload values.
 * Supports camelCase ↔ snake_case automatic conversion.
 */
export function interpolateTemplate(
  template: string,
  payload: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    // Try exact key
    if (payload[key] !== undefined) return String(payload[key]);

    // Convert camelCase to snake_case for lookup
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (payload[snakeKey] !== undefined) return String(payload[snakeKey]);

    // Convert snake_case to camelCase for lookup
    const camelKey = key.replace(/_([a-z])/g, (_: string, c: string) =>
      c.toUpperCase(),
    );
    if (payload[camelKey] !== undefined) return String(payload[camelKey]);

    return `{{${key}}}`;
  });
}

/**
 * Select the best content for a given channel from a template document.
 * Falls back to the generic `template` field if per-channel content
 * is not available.
 */
export function selectChannelContent(
  templateDoc: {
    template?: string;
    whatsappContent?: string;
    telegramContent?: string;
    emailSubject?: string;
    emailBody?: string;
    smsContent?: string;
  },
  channel: NotificationChannel,
): { message: string; subject?: string; htmlBody?: string } {
  switch (channel) {
    case "whatsapp":
      return {
        message: templateDoc.whatsappContent || templateDoc.template || "",
      };

    case "telegram":
      return {
        message: templateDoc.telegramContent || templateDoc.template || "",
      };

    case "email":
      return {
        message: templateDoc.emailBody || templateDoc.template || "",
        subject: templateDoc.emailSubject || undefined,
        htmlBody: templateDoc.emailBody || undefined,
      };

    case "sms":
      return {
        message: templateDoc.smsContent || templateDoc.template || "",
      };

    default:
      return { message: templateDoc.template || "" };
  }
}

/**
 * Render a template for a specific channel with payload interpolation.
 */
export function renderForChannel(
  templateDoc: {
    template?: string;
    whatsappContent?: string;
    telegramContent?: string;
    emailSubject?: string;
    emailBody?: string;
    smsContent?: string;
  },
  channel: NotificationChannel,
  payload: Record<string, unknown>,
): { renderedMessage: string; renderedSubject?: string; renderedHtmlBody?: string } {
  const content = selectChannelContent(templateDoc, channel);

  return {
    renderedMessage: interpolateTemplate(content.message, payload),
    renderedSubject: content.subject
      ? interpolateTemplate(content.subject, payload)
      : undefined,
    renderedHtmlBody: content.htmlBody
      ? interpolateTemplate(content.htmlBody, payload)
      : undefined,
  };
}
