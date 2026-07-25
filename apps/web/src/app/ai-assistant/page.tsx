"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { WebhookStatus } from "@/lib/ai/types";
import { useAIChat } from "@/hooks/useAIChatWebhook";
import { TopBar } from "@/components/ai-assistant/TopBar";
import { QuickActionsSidebar } from "@/components/ai-assistant/QuickActionsSidebar";
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
      className="flex h-[100dvh] overflow-hidden bg-[#F3F5F9] dark:bg-[#0F1117] relative"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* ═══════ Left Sidebar — Quick Actions ═══════ */}
      <QuickActionsSidebar onAction={handleQuickAction} disabled={loading} />

      {/* ═══════ Main Panel ═══════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar */}
        <TopBar
          onClear={clearMessages}
          onOpenSettings={() => setShowModal(true)}
          webhookConfigured={webhookStatus.configured}
        />

        {/* Webhook not configured banner */}
        {!webhookStatus.configured && (
          <div
            id="webhook-banner"
            className="flex items-center gap-3 mx-5 mt-4 px-4 py-3 rounded-xl border border-amber-300/30 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10"
          >
            <AlertIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-[12px] text-amber-700 dark:text-amber-300">
              <span className="font-semibold">Webhook not configured</span> —{" "}
              <code className="text-[11px] font-mono bg-amber-100 dark:bg-amber-500/20 px-1 py-0.5 rounded">
                AI_WEBHOOK_URL
              </code>{" "}
              .env.local में set करें और server restart करें।
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="ml-auto text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex-shrink-0"
            >
              Details →
            </button>
          </div>
        )}

        {/* Chat Area (must have min-h-0 for flex scroll) */}
        <div
          id="ai-chat-area"
          ref={chatAreaRef}
          className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-4"
        >
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

        {/* Command Bar */}
        <CommandBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={stop}
          loading={loading}
        />
      </div>

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
