"use client";

import { SparklesIcon, TrashIcon, SettingsIcon } from "./icons";

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
      className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06] bg-white/88 dark:bg-[#161B27] backdrop-blur-sm flex-shrink-0"
    >
      {/* Left: Title */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center flex-shrink-0">
          <SparklesIcon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            AI Assistant
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            आपका business advisor
          </p>
        </div>
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Connection status dot */}
        <div className="flex items-center gap-1.5 mr-1">
          <span
            className={`w-2 h-2 rounded-full ${
              webhookConfigured ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
            {webhookConfigured ? "Connected" : "Not configured"}
          </span>
        </div>

        {/* Settings button */}
        <button
          id="ai-settings-btn"
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Webhook settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>

        {/* Clear button */}
        <button
          id="ai-clear-btn"
          onClick={onClear}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          aria-label="Chat clear करें"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
