"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

// ─── Types ───────────────────────────────────────────────────
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  displayedContent?: string;
  timestamp: string;
  isLoading?: boolean;
  isTyping?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

interface BusinessContext {
  stats: Record<string, unknown>;
  orders: unknown[];
  payments: unknown[];
  inventory: unknown[];
  clients: unknown[];
}

// ─── Constants ───────────────────────────────────────────────
const CHAT_STORAGE_KEY = "ind_manager_chat_history_v2";
const TYPING_SPEED_MS = 16;

// ─── Hook ────────────────────────────────────────────────────
export function useAIChat() {
  const t = useTranslations("assistant");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null);
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [aiNotConfigured, setAiNotConfigured] = useState(false);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load Chat History ───────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out any legacy or duplicated welcome messages
          const cleaned = parsed.filter(
            (m) =>
              m &&
              m.id !== "welcome" &&
              !m.content?.includes("Welcome to AI Assistant") &&
              !m.content?.includes("intelligent business advisor")
          );
          const restored = cleaned.map((m) => ({
            ...m,
            isLoading: false,
            isTyping: false,
            displayedContent: m.content,
          }));
          setMessages(restored);
        }
      }
    } catch {
      // Corrupted storage, start fresh
    }
    setHistoryLoaded(true);
  }, []);

  // ─── Save Chat History ───────────────────────────────────
  useEffect(() => {
    if (!historyLoaded) return;
    try {
      const toSave = messages
        .filter(
          (m) =>
            !m.isLoading &&
            m.id !== "welcome" &&
            !m.content?.includes("Welcome to AI Assistant")
        )
        .map(({ id, role, content, timestamp, isError, errorMessage }) => ({
          id,
          role,
          content,
          timestamp,
          isError,
          errorMessage,
        }));
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Storage full
    }
  }, [messages, historyLoaded]);

  // ─── Fetch Business Context ──────────────────────────────
  useEffect(() => {
    async function fetchContext() {
      try {
        const [statsRes, ordersRes, clientsRes, inventoryRes, paymentsRes] =
          await Promise.all([
            fetch("/api/dashboard/stats").then((r) => r.ok ? r.json() : {}).catch(() => ({})),
            fetch("/api/orders").then((r) => r.ok ? r.json() : []).catch(() => []),
            fetch("/api/clients").then((r) => r.ok ? r.json() : []).catch(() => []),
            fetch("/api/inventory").then((r) => r.ok ? r.json() : []).catch(() => []),
            fetch("/api/payments").then((r) => r.ok ? r.json() : []).catch(() => []),
          ]);
        setBusinessContext({
          stats: statsRes,
          orders: Array.isArray(ordersRes) ? ordersRes : ordersRes?.orders || [],
          payments: Array.isArray(paymentsRes) ? paymentsRes : paymentsRes?.payments || [],
          inventory: Array.isArray(inventoryRes) ? inventoryRes : inventoryRes?.items || [],
          clients: Array.isArray(clientsRes) ? clientsRes : clientsRes?.clients || [],
        });
        setIsContextLoaded(true);
      } catch {
        setIsContextLoaded(true); // proceed without context
      }
    }
    fetchContext();
  }, []);

  // ─── Typing Animation ────────────────────────────────────
  const startTypingAnimation = useCallback(
    (messageId: string, fullContent: string) => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      let charIndex = 0;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isTyping: true, displayedContent: "" } : m
        )
      );
      typingIntervalRef.current = setInterval(() => {
        charIndex++;
        if (charIndex >= fullContent.length) {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, isTyping: false, displayedContent: fullContent } : m
            )
          );
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, displayedContent: fullContent.slice(0, charIndex) } : m
          )
        );
      }, TYPING_SPEED_MS);
    },
    []
  );

  // ─── Cleanup ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  // ─── Send Message ────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: content.trim(),
        displayedContent: content.trim(),
        timestamp: new Date().toISOString(),
      };

      const loadingId = (Date.now() + 1).toString();
      const loadingMessage: Message = {
        id: loadingId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setIsLoading(true);

      try {
        const history = messages
          .filter((m) => !m.isLoading && !m.isError)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content.trim(),
            history: history.slice(-20),
            context: businessContext || {},
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          const errCode = data?.error?.code || "";
          const errText =
            typeof data?.error === "string"
              ? data.error
              : data?.error?.message || "";

          if (
            errCode === "AI_NOT_CONFIGURED" ||
            errCode === "INVALID_API_KEY" ||
            errText.toLowerCase().includes("not configured") ||
            errText.toLowerCase().includes("api key")
          ) {
            setAiNotConfigured(true);
            setMessages((prev) => prev.filter((m) => m.id !== loadingId));
            setIsLoading(false);
            return;
          }

          let friendlyMsg = t("genericError");
          if (
            res.status === 429 ||
            res.status === 503 ||
            errCode === "RATE_LIMIT" ||
            errCode === "SERVICE_UNAVAILABLE"
          ) {
            friendlyMsg = t("aiBusy");
          }

          throw new Error(friendlyMsg);
        }

        const responseId = (Date.now() + 2).toString();
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== loadingId);
          return [
            ...filtered,
            {
              id: responseId,
              role: "assistant" as const,
              content: data.response,
              displayedContent: "",
              timestamp: new Date().toISOString(),
              isTyping: true,
            },
          ];
        });
        startTypingAnimation(responseId, data.response);
      } catch (error: unknown) {
        const friendlyError =
          error instanceof Error && error.message
            ? error.message
            : t("genericError");

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== loadingId);
          return [
            ...filtered,
            {
              id: (Date.now() + 2).toString(),
              role: "assistant" as const,
              content: friendlyError,
              displayedContent: friendlyError,
              timestamp: new Date().toISOString(),
              isError: true,
              errorMessage: friendlyError,
            },
          ];
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, businessContext, startTypingAnimation, t]
  );

  // ─── Retry ───────────────────────────────────────────────
  const retryLastMessage = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    setMessages((prev) => {
      const lastErr = [...prev].reverse().find((m) => m.isError);
      return prev.filter((m) => m.id !== lastErr?.id && m.id !== lastUserMsg.id);
    });
    setTimeout(() => sendMessage(lastUserMsg.content), 50);
  }, [messages, sendMessage]);

  // ─── Clear ───────────────────────────────────────────────
  const clearChat = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    toast.success("Chat history cleared");
  }, []);

  return {
    messages,
    isLoading,
    isContextLoaded,
    aiNotConfigured,
    sendMessage,
    retryLastMessage,
    clearChat,
  };
}
