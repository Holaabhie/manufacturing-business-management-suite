/**
 * Auth Request Timeout & Localized Messages (en, hi, gu, mr)
 * Provides 20s AbortController wrapper for login/Google auth fetches.
 */

export const AUTH_TIMEOUT_MS = 20_000;

export const AUTH_TIMEOUT_MESSAGES: Record<string, string> = {
  en: "Connection timed out. The server took too long to respond. Please try again.",
  hi: "अनुरोध का समय समाप्त हो गया। सर्वर ने जवाब देने में बहुत अधिक समय लिया। कृपया पुनः प्रयास करें।",
  gu: "વિનંતીનો સમય સમાપ્ત થઈ ગયો છે. સર્વરે જવાબ આપવામાં વધુ સમય લીધો. કૃપા કરીને ફરી પ્રયાસ કરો.",
  mr: "विनंतीची वेळ संपली. सर्व्हरने प्रतिसाद देण्यास जास्त वेळ घेतला. कृपया पुन्हा प्रयत्न करा.",
};

/**
 * Returns the localized timeout error message based on stored or passed locale.
 */
export function getAuthTimeoutMessage(locale?: string): string {
  let lang = locale;
  if (!lang && typeof window !== "undefined") {
    try {
      lang = localStorage.getItem("ind_manager_locale") || undefined;
    } catch {
      // Ignore storage errors
    }
  }
  return AUTH_TIMEOUT_MESSAGES[lang || "en"] || AUTH_TIMEOUT_MESSAGES.en;
}

/**
 * Executes a fetch request with a strict 20-second timeout.
 * If aborted or timed out, throws an Error with the localized timeout message.
 */
export async function fetchWithAuthTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  locale?: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(getAuthTimeoutMessage(locale));
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
