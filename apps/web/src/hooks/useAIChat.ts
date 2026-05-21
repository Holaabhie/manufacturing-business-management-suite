"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

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

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: `**Welcome to AI Assistant** ✨

I'm your intelligent business advisor, powered by Google Gemini. Here's how I can help:

• **📊 Analytics** — Revenue insights, growth trends, profit margins
• **📦 Inventory** — Stock levels, restocking alerts, usage patterns
• **👥 Clients** — Customer profiles, payment history, top accounts
• **💰 Payments** — Outstanding amounts, collection rates, cash flow
• **📋 Orders** — Status tracking, delivery schedules, bottlenecks
• **🏭 Production** — Efficiency metrics, capacity planning

Ask me anything about your business and I'll provide data-backed insights.`,
  timestamp: new Date().toISOString(),
};

// ─── Hook ────────────────────────────────────────────────────
export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
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
        if (parsed.length > 0) {
          const restored = parsed.map((m) => ({
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
        .filter((m) => !m.isLoading)
        .map(({ id, role, content, timestamp, isError, errorMessage }) => ({
          id, role, content, timestamp, isError, errorMessage,
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
          .filter((m) => m.id !== "welcome" && !m.isLoading && !m.isError)
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

        const data = await res.json();

        if (!res.ok || !data.success) {
          const errMsg = data.error || "Failed to get response";
          if (errMsg.toLowerCase().includes("not configured") || errMsg.toLowerCase().includes("api key")) {
            setAiNotConfigured(true);
            setMessages((prev) => prev.filter((m) => m.id !== loadingId));
            setIsLoading(false);
            return;
          }
          throw new Error(errMsg);
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
        const errorMsg = error instanceof Error ? error.message : "Something went wrong";
        toast.error(errorMsg);
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== loadingId);
          return [
            ...filtered,
            {
              id: (Date.now() + 2).toString(),
              role: "assistant" as const,
              content: `⚠️ **Error:** ${errorMsg}`,
              displayedContent: `⚠️ **Error:** ${errorMsg}`,
              timestamp: new Date().toISOString(),
              isError: true,
              errorMessage: errorMsg,
            },
          ];
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, businessContext, startTypingAnimation]
  );

  // ─── Retry ───────────────────────────────────────────────
  const retryLastMessage = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    setMessages((prev) => {
      const lastErr = [...prev].reverse().find((m) => m.isError);
      return lastErr ? prev.filter((m) => m.id !== lastErr.id && m.id !== lastUserMsg.id) : prev;
    });
    setTimeout(() => sendMessage(lastUserMsg.content), 100);
  }, [messages, sendMessage]);

  // ─── Clear ───────────────────────────────────────────────
  const clearChat = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    const fresh: Message = {
      ...WELCOME_MESSAGE,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      displayedContent: WELCOME_MESSAGE.content,
    };
    setMessages([fresh]);
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
