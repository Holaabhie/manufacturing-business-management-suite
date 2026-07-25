"use client";

import type { Message } from "@/lib/ai/types";
import { RefreshIcon } from "./icons";

interface ChatMessageProps {
  message: Message;
  onRetry?: () => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.status === "error";

  if (isUser) {
    return (
      <div id={`msg-${message.id}`} className="flex justify-end">
        <div className="bg-[#2563EB] text-white rounded-[16px_16px_0_16px] px-4 py-3 text-sm leading-relaxed max-w-md">
          {message.content}
          {message.status === "sending" && (
            <span className="block text-[10px] text-white/60 mt-1">
              भेज रहे हैं…
            </span>
          )}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div id={`msg-${message.id}`} className="flex items-start gap-3">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center flex-shrink-0">
        <svg
          className="w-4 h-4 text-white"
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

      {/* Bubble */}
      <div
        className={`bg-white dark:bg-[#1C2333] border rounded-[0_16px_16px_16px] px-4 py-3 text-sm leading-relaxed shadow-[0_8px_30px_rgba(15,23,42,0.06)] max-w-xl ${
          isError
            ? "border-red-500/20 dark:border-red-400/20"
            : "border-black/[0.06] dark:border-white/[0.06]"
        }`}
      >
        <p
          className={`whitespace-pre-wrap ${
            isError
              ? "text-red-600 dark:text-red-400"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {message.content}
        </p>

        {/* Retry button for error messages */}
        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#2563EB] hover:text-blue-700 transition-colors"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            फिर से कोशिश करें
          </button>
        )}

        {/* Timestamp */}
        <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
          {new Date(message.timestamp).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
