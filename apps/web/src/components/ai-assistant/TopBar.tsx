"use client";

import { SparklesIcon, TrashIcon, SettingsIcon, FileTextIcon } from "./icons";

interface TopBarProps {
  onClear: () => void;
  onOpenSettings: () => void;
  webhookConfigured: boolean;
}

export function TopBar({
  onClear,
  onOpenSettings,
  webhookConfigured,
}: TopBarProps) {
  return (
    <div
      id="ai-topbar"
      className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b bg-[var(--ai-bg-glass)] backdrop-blur-sm flex-shrink-0"
      style={{ borderColor: "var(--ai-border-subtle)" }}
    >
      {/* Left: Tab Pill */}
      <div className="flex-1 min-w-0 flex items-center">
        <div
          className="inline-flex items-center rounded-full p-1 gap-0.5"
          style={{ background: "var(--ai-bg-surface-elevated)" }}
        >
          {/* Chat tab — active */}
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold text-white transition-colors ai-tab-active shadow-sm shadow-purple-500/25"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            Chat
          </button>

          {/* Smart Reports tab — visual only, no click affordance */}
          <span
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium opacity-40 cursor-default select-none"
            style={{ color: "var(--ai-text-secondary)" }}
          >
            <FileTextIcon className="w-3.5 h-3.5" />
            Smart Reports
          </span>
        </div>
      </div>

      {/* Right: Status Pill + Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Status pill */}
        <div
          className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium"
          style={{
            background: "var(--ai-bg-surface-elevated)",
            color: "var(--ai-text-secondary)",
          }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: webhookConfigured
                ? "var(--ai-success)"
                : "var(--ai-warning)",
              animation: webhookConfigured
                ? "ai-status-pulse 2s ease-in-out infinite"
                : "none",
            }}
          />
          {webhookConfigured ? "Ready" : "Not configured"}
        </div>

        {/* Settings button */}
        <button
          id="ai-settings-btn"
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: "var(--ai-text-tertiary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--ai-bg-surface-elevated)";
            e.currentTarget.style.color = "var(--ai-text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--ai-text-tertiary)";
          }}
          aria-label="Webhook settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>

        {/* Clear button */}
        <button
          id="ai-clear-btn"
          onClick={onClear}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: "var(--ai-text-tertiary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(220,38,38,0.08)";
            e.currentTarget.style.color = "var(--ai-error)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--ai-text-tertiary)";
          }}
          aria-label="Clear chat"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
