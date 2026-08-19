/**
 * Deep-link builders for notification dispatch channels.
 * ─────────────────────────────────────────────────────────
 * Phone formatting reuses the same pattern as
 * CompletionModals.tsx (strip non-digits, 91-prefix handling).
 */

/**
 * Build a WhatsApp `wa.me` deep link.
 * Reuses the exact phone-cleaning + 91-prefix logic from CompletionModals.tsx:288-299.
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const msg = encodeURIComponent(message);
  const phoneClean = phone.replace(/\D/g, "");
  return phoneClean
    ? `https://wa.me/${phoneClean.startsWith("91") ? phoneClean : "91" + phoneClean}?text=${msg}`
    : `https://wa.me/?text=${msg}`;
}

/**
 * Build a mailto: deep link.
 */
export function buildEmailLink(
  email: string,
  subject: string,
  body: string,
): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Build an SMS deep link.
 * Reuses the same phone-cleaning regex as WhatsApp (strip non-digits).
 */
export function buildSmsLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  return `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
}
