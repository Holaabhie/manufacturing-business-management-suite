"use client";

import { useState, useRef, useCallback } from "react";
import type {
  Message,
  ChatResponse,
  ChatErrorResponse,
  MessageStatus,
} from "@/lib/ai/types";
import { isChatError } from "@/lib/ai/types";

// ─── UUID Generator (crypto with fallback) ───────────────────
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Non-crypto fallback for environments without randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Constants ───────────────────────────────────────────────
const CLIENT_TIMEOUT_MS = 30_000;
const SESSION_ID = generateId();

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "नमस्ते! आपके business का कोई भी सवाल पूछें — orders, inventory, payments, production सब कुछ।",
  timestamp: new Date().toISOString(),
  status: "sent",
};

// ─── Error copy ──────────────────────────────────────────────
function getErrorCopy(reason: "abort" | "timeout" | "network"): string {
  switch (reason) {
    case "abort":
      return "Request cancelled — आपने request रोक दी।";
    case "timeout":
      return "Request timed out — server ने 30 seconds में reply नहीं दिया।";
    case "network":
      return "Network error — कृपया अपना internet connection check करें।";
  }
}

// ─── Return type ─────────────────────────────────────────────
interface UseAIChatReturn {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  sendMessage: (overrideText?: string) => Promise<void>;
  retryLast: () => void;
  clearMessages: () => void;
  stop: () => void;
}

// ─── Hook ────────────────────────────────────────────────────
export function useAIChat(): UseAIChatReturn {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ────────────────────────────────────────────────
  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessageStatus = useCallback(
    (id: string, status: MessageStatus, errorMessage?: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, status, errorMessage } : m
        )
      );
    },
    []
  );

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    abortRef.current = null;
    setLoading(false);
  }, []);

  // ── Stop in-flight request ─────────────────────────────────
  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    cleanup();
  }, [cleanup]);

  // ── Send Message ───────────────────────────────────────────
  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || loading) return;

      // Clear input immediately
      if (!overrideText) setInput("");

      // Optimistic user message
      const userMsgId = generateId();
      const userMsg: Message = {
        id: userMsgId,
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
        status: "sending",
      };
      addMessage(userMsg);
      setLoading(true);

      // AbortController + timeout
      const controller = new AbortController();
      abortRef.current = controller;

      timeoutRef.current = setTimeout(() => {
        controller.abort();
      }, CLIENT_TIMEOUT_MS);

      try {
        const res = await fetch("/api/ai-assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId: SESSION_ID }),
          signal: controller.signal,
        });

        const data: ChatResponse | ChatErrorResponse = await res.json();

        // Mark user msg as sent
        updateMessageStatus(userMsgId, "sent");

        if (!res.ok || isChatError(data)) {
          const errData = data as ChatErrorResponse;
          const errText = errData.error || "कुछ गलत हो गया।";
          const assistantErr: Message = {
            id: generateId(),
            role: "assistant",
            content: errText,
            timestamp: new Date().toISOString(),
            status: "error",
            errorMessage: errText,
          };
          addMessage(assistantErr);
        } else {
          const assistantMsg: Message = {
            id: generateId(),
            role: "assistant",
            content: (data as ChatResponse).reply,
            timestamp: new Date().toISOString(),
            status: "sent",
          };
          addMessage(assistantMsg);
        }
      } catch (err: unknown) {
        // Determine error type
        let reason: "abort" | "timeout" | "network" = "network";

        if (err instanceof DOMException && err.name === "AbortError") {
          // Was it user-triggered or timeout-triggered?
          reason = abortRef.current === null ? "abort" : "timeout";
        }

        updateMessageStatus(userMsgId, "error");

        const errCopy = getErrorCopy(reason);
        const assistantErr: Message = {
          id: generateId(),
          role: "assistant",
          content: errCopy,
          timestamp: new Date().toISOString(),
          status: "error",
          errorMessage: errCopy,
        };
        addMessage(assistantErr);
      } finally {
        cleanup();
      }
    },
    [input, loading, addMessage, updateMessageStatus, cleanup]
  );

  // ── Retry Last ─────────────────────────────────────────────
  const retryLast = useCallback(() => {
    // Find last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;

    // Remove trailing error messages
    setMessages((prev) => {
      const lastUserIdx = prev.lastIndexOf(lastUserMsg);
      // Remove the user message and any assistant error messages after it
      return prev.filter((m, idx) => {
        if (idx < lastUserIdx) return true;
        if (idx === lastUserIdx) return false; // remove original user msg, re-send below
        // Remove assistant error messages after the user message
        if (m.role === "assistant" && m.status === "error") return false;
        return true;
      });
    });

    // Re-send the same text
    // Use setTimeout to allow state update to flush
    setTimeout(() => {
      void sendMessage(lastUserMsg.content);
    }, 0);
  }, [messages, sendMessage]);

  // ── Clear Messages ─────────────────────────────────────────
  const clearMessages = useCallback(() => {
    stop();
    setMessages([
      {
        ...WELCOME_MESSAGE,
        id: generateId(),
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [stop]);

  return {
    messages,
    input,
    setInput,
    loading,
    sendMessage,
    retryLast,
    clearMessages,
    stop,
  };
}
