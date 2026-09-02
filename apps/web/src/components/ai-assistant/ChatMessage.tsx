"use client";

import type { Message } from "@/lib/ai/types";
import { RefreshIcon, OrdersIcon, InventoryIcon, PaymentsIcon } from "./icons";
import type { ReactNode } from "react";

interface ChatMessageProps {
  message: Message;
  onRetry?: () => void;
}

// ── Category colors (reused from ActivityDetailContent.tsx) ──
const WELCOME_CAPABILITIES = [
  {
    icon: OrdersIcon,
    title: "Order tracking",
    subtitle: "Check pending orders, status updates",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.10)",
  },
  {
    icon: InventoryIcon,
    title: "Stock alerts",
    subtitle: "Low inventory warnings, reorder points",
    color: "#FF9F0A",
    bg: "rgba(255,159,10,0.10)",
  },
  {
    icon: PaymentsIcon,
    title: "Payment status",
    subtitle: "Outstanding dues, collection summary",
    color: "#30D158",
    bg: "rgba(48,209,88,0.10)",
  },
];

// ── Lightweight markdown renderer (safe — uses React elements) ──
function renderMarkdown(text: string): ReactNode[] {
  // HTML-escape first to prevent XSS from webhook responses
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escaped.split("\n");
  const result: ReactNode[] = [];
  let bulletBuffer: ReactNode[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      result.push(
        <ul
          key={`ul-${result.length}`}
          className="list-disc list-inside space-y-1 my-1.5"
          style={{ color: "var(--ai-text-primary)" }}
        >
          {bulletBuffer}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    // Bold: **text** → <strong>text</strong>
    const parseBold = (str: string): ReactNode[] => {
      const parts = str.split(/\*\*(.+?)\*\*/g);
      return parts.map((part, j) =>
        j % 2 === 1 ? (
          <strong key={`b-${i}-${j}`} className="font-semibold">
            {part}
          </strong>
        ) : (
          <span key={`t-${i}-${j}`}>{part}</span>
        )
      );
    };

    // Bullet lines: starts with * or -
    const trimmed = line.trim();
    if (/^[*\-•]\s/.test(trimmed)) {
      const content = trimmed.replace(/^[*\-•]\s+/, "");
      bulletBuffer.push(
        <li key={`li-${i}`} className="text-sm leading-relaxed">
          {parseBold(content)}
        </li>
      );
    } else {
      flushBullets();
      if (trimmed === "") {
        result.push(<br key={`br-${i}`} />);
      } else {
        result.push(
          <p key={`p-${i}`} className="text-sm leading-relaxed">
            {parseBold(trimmed)}
          </p>
        );
      }
    }
  });
  flushBullets();
  return result;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isWelcome = message.id === "welcome";

  // ── User message ──
  if (isUser) {
    return (
      <div id={`msg-${message.id}`} className="flex justify-end">
        <div
          className="text-white rounded-[20px] rounded-br-[6px] px-4 py-3 text-sm leading-relaxed max-w-md ai-user-bubble shadow-md shadow-purple-500/20"
        >
          {message.content}
          {message.status === "sending" && (
            <span className="block text-[10px] text-white/60 mt-1">
              Sending…
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Welcome message — capability card ──
  if (isWelcome) {
    return (
      <div id={`msg-${message.id}`} className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ai-avatar-square shadow-md shadow-purple-500/20 ring-2 ring-purple-500/20"
        >
          <svg
            className="w-5 h-5 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
          </svg>
        </div>

        {/* Welcome card */}
        <div
          className="rounded-[20px] px-5 py-4 max-w-lg border"
          style={{
            background: "var(--ai-bg-surface)",
            borderColor: "var(--ai-border-subtle)",
            boxShadow: "var(--ai-card-shadow)",
          }}
        >
          <p
            className="text-[15px] font-semibold mb-1"
            style={{ color: "var(--ai-text-primary)" }}
          >
            Hello! 👋
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--ai-text-secondary)" }}
          >
            Ask me anything about your business — orders, inventory, payments,
            production, and more.
          </p>

          {/* Capability rows */}
          <div className="space-y-2.5">
            {WELCOME_CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div key={cap.title} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: cap.bg }}
                  >
                    <Icon className="w-4 h-4" style={{ color: cap.color }} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[13px] font-medium"
                      style={{ color: "var(--ai-text-primary)" }}
                    >
                      {cap.title}
                    </p>
                    <p
                      className="text-[12px]"
                      style={{ color: "var(--ai-text-tertiary)" }}
                    >
                      {cap.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Regular assistant message — card with markdown ──
  return (
    <div id={`msg-${message.id}`} className="flex items-start gap-3">
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ai-avatar-square shadow-md shadow-purple-500/20 ring-2 ring-purple-500/20"
      >
        <svg
          className="w-5 h-5 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
        </svg>
      </div>

      {/* Card */}
      <div
        className={`rounded-[20px] px-4 py-3 max-w-xl border ${
          isError ? "border-red-500/20" : ""
        }`}
        style={{
          background: "var(--ai-bg-surface)",
          borderColor: isError ? undefined : "var(--ai-border-subtle)",
          boxShadow: "var(--ai-card-shadow)",
        }}
      >
        <div
          className="space-y-1"
          style={{
            color: isError ? "var(--ai-error)" : "var(--ai-text-primary)",
          }}
        >
          {renderMarkdown(message.content)}
        </div>

        {/* Retry button for error messages */}
        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 flex items-center gap-1.5 text-[12px] font-medium transition-colors"
            style={{ color: "var(--ai-accent)" }}
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            Try again
          </button>
        )}

        {/* Timestamp */}
        <span
          className="block text-[10px] mt-1.5"
          style={{ color: "var(--ai-text-tertiary)" }}
        >
          {new Date(message.timestamp).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
