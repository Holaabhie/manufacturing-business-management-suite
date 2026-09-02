"use client";

import { useRef, useCallback, type KeyboardEvent } from "react";
import { ArrowUpIcon, StopIcon } from "./icons";

interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  loading: boolean;
}

export function CommandBar({
  value,
  onChange,
  onSend,
  onStop,
  loading,
}: CommandBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!loading && value.trim()) {
          onSend();
        }
      }
    },
    [loading, value, onSend]
  );

  // Auto-resize textarea
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    },
    [onChange]
  );

  return (
    <div
      id="ai-command-bar"
      className="flex-shrink-0 px-4 sm:px-5 py-3 pb-4"
      style={{ background: "var(--ai-bg-primary)" }}
    >
      <div className="max-w-[900px] mx-auto">
        <div
          className="flex items-center gap-3 rounded-[24px] px-4 py-2.5 border"
          style={{
            background: "var(--ai-bg-surface)",
            borderColor: "var(--ai-border-subtle)",
            boxShadow: "var(--ai-card-shadow)",
          }}
        >
          {/* Input */}
          <textarea
            ref={textareaRef}
            id="ai-chat-input"
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything…"
            rows={1}
            className="flex-1 min-w-0 bg-transparent border-none outline-none resize-none text-sm leading-relaxed"
            style={{
              maxHeight: "120px",
              color: "var(--ai-text-primary)",
            }}
            disabled={false}
          />

          {/* Send / Stop Button — circular */}
          {loading ? (
            <button
              id="ai-stop-btn"
              onClick={onStop}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: "var(--ai-error)" }}
              aria-label="Stop"
            >
              <StopIcon className="w-3.5 h-3.5 text-white" />
            </button>
          ) : (
            <button
              id="ai-send-btn"
              onClick={onSend}
              disabled={!value.trim()}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 ai-send-button shadow-md shadow-purple-500/25"
              aria-label="Send"
            >
              <ArrowUpIcon className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
