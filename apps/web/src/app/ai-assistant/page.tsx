"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { WebhookStatus } from "@/lib/ai/types";
import { useAIChat } from "@/hooks/useAIChatWebhook";
import { TopBar } from "@/components/ai-assistant/TopBar";
import { SuggestionChips } from "@/components/ai-assistant/SuggestionChips";
import { CommandBar } from "@/components/ai-assistant/CommandBar";
import { ChatMessage } from "@/components/ai-assistant/ChatMessage";
import { TypingIndicator } from "@/components/ai-assistant/TypingIndicator";
import { WebhookModal } from "@/components/ai-assistant/WebhookModal";
import { AlertIcon } from "@/components/ai-assistant/icons";

export default function AIAssistantPage() {
  const {
    messages,
    input,
    setInput,
    loading,
    sendMessage,
    retryLast,
    clearMessages,
    stop,
  } = useAIChat();

  // ── Webhook Status ─────────────────────────────────────────
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus>({
    configured: false,
    url: null,
  });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/ai-assistant/status");
        if (res.ok) {
          const data: WebhookStatus = await res.json();
          setWebhookStatus(data);
        }
      } catch {
        // Silently fail — page still works, just shows "not configured"
      }
    }
    fetchStatus();
  }, []);

  // ── Auto-scroll ────────────────────────────────────────────
  const chatAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // ── Handlers ───────────────────────────────────────────────
  const handleSend = useCallback(() => {
    void sendMessage();
  }, [sendMessage]);

  const handleQuickAction = useCallback(
    (prompt: string) => {
      void sendMessage(prompt);
    },
    [sendMessage]
  );

  return (
    <div
      id="ai-assistant-shell"
      className="ai-workspace flex flex-col h-[100dvh] w-full min-w-0 overflow-x-clip overflow-hidden relative"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "var(--ai-bg-primary)",
      }}
    >
      {/* ═══════ TopBar ═══════ */}
      <TopBar
        onClear={clearMessages}
        onOpenSettings={() => setShowModal(true)}
        webhookConfigured={webhookStatus.configured}
      />

      {/* Webhook not configured banner */}
      {!webhookStatus.configured && (
        <div
          id="webhook-banner"
          className="flex items-center gap-3 mx-4 sm:mx-5 mt-3 px-4 py-3 rounded-xl border border-amber-300/30 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10"
        >
          <AlertIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-[12px] text-amber-700 dark:text-amber-300">
            <span className="font-semibold">Webhook not configured</span> —{" "}
            set{" "}
            <code className="text-[11px] font-mono bg-amber-100 dark:bg-amber-500/20 px-1 py-0.5 rounded">
              AI_WEBHOOK_URL
            </code>{" "}
            in .env.local and restart the server.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="ml-auto text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex-shrink-0"
          >
            Details →
          </button>
        </div>
      )}

      {/* ═══════ Chat Area (flex-1 with internal scroll) ═══════ */}
      <div
        id="ai-chat-area"
        ref={chatAreaRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-5"
      >
        <div className="max-w-[900px] mx-auto space-y-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onRetry={
                msg.status === "error" && msg.role === "assistant"
                  ? retryLast
                  : undefined
              }
            />
          ))}

          {/* Typing indicator while loading */}
          {loading && <TypingIndicator />}
        </div>
      </div>

      {/* ═══════ Suggestion Chips ═══════ */}
      <SuggestionChips
        onAction={handleQuickAction}
        disabled={loading}
        messageCount={messages.length}
      />

      {/* ═══════ Command Bar ═══════ */}
      <CommandBar
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={stop}
        loading={loading}
      />

      {/* ═══════ Webhook Settings Modal ═══════ */}
      {showModal && (
        <WebhookModal
          status={webhookStatus}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
