"use client";

import { useRef, useCallback, type KeyboardEvent } from "react";
import { SendIcon, StopIcon } from "./icons";

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
      className="flex-shrink-0 px-5 py-4 border-t border-black/[0.06] dark:border-white/[0.06] bg-white/88 dark:bg-[#161B27] backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 bg-[#F3F5F9] dark:bg-[#0F1117] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-4 py-2.5">
        {/* Input */}
        <textarea
          ref={textareaRef}
          id="ai-chat-input"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="कोई भी सवाल पूछें…"
          rows={1}
          className="flex-1 min-w-0 bg-transparent border-none outline-none resize-none text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed"
          style={{ maxHeight: "120px" }}
          disabled={false}
        />

        {/* Send / Stop Button */}
        {loading ? (
          <button
            id="ai-stop-btn"
            onClick={onStop}
            className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-red-600 transition-colors"
            aria-label="रुकें"
          >
            <StopIcon className="w-3.5 h-3.5 text-white" />
          </button>
        ) : (
          <button
            id="ai-send-btn"
            onClick={onSend}
            disabled={!value.trim()}
            className="w-8 h-8 bg-[#2563EB] disabled:opacity-40 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-blue-700 transition-colors"
            aria-label="भेजें"
          >
            <SendIcon className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
