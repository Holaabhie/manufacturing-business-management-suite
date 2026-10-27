/**
 * Universal UUID v4 generator with secure and non-secure fallbacks.
 *
 * Background:
 * `crypto.randomUUID` is only available in secure contexts (HTTPS or localhost).
 * When accessing via LAN IP (e.g. http://192.168.0.x:3000), `crypto.randomUUID` is undefined.
 *
 * Fallback priority:
 * 1. crypto.randomUUID() (if available in secure browser context or Node.js)
 * 2. crypto.getRandomValues() (available on HTTP in modern browsers)
 * 3. Math.random() fallback
 */
export function generateId(): string {
  // 1. Native crypto.randomUUID if in secure context or Node.js
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through on any unexpected failure
    }
  }

  // 2. crypto.getRandomValues (works in non-secure HTTP browser origins)
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // Set version 4 bits: 0100xxxx
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      // Set variant bits: 10xxxxxx
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
      // Fall through to Math.random
    }
  }

  // 3. Math.random RFC4122 v4 fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
