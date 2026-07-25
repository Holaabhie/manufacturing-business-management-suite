"use client";

import { useState, useCallback } from "react";
import type { WebhookStatus, WebhookTestResult } from "@/lib/ai/types";
import { XIcon, CopyIcon, CheckIcon, RefreshIcon } from "./icons";

interface WebhookModalProps {
  status: WebhookStatus;
  onClose: () => void;
}

export function WebhookModal({ status, onClose }: WebhookModalProps) {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);

  const handleCopy = useCallback(async () => {
    if (!status.url) return;
    try {
      await navigator.clipboard.writeText(status.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [status.url]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai-assistant/test", { method: "POST" });
      const data: WebhookTestResult = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({
        ok: false,
        status: 0,
        latencyMs: 0,
        error: "Test request failed.",
      });
    } finally {
      setTesting(false);
    }
  }, []);

  return (
    <div
      id="webhook-modal-backdrop"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === "webhook-modal-backdrop")
          onClose();
      }}
    >
      <div className="w-full max-w-md mx-4 bg-white dark:bg-[#1C2333] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Webhook Configuration
          </h2>
          <button
            id="webhook-modal-close"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status.configured ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {status.configured ? "●  Connected" : "✕  Not configured"}
            </span>
          </div>

          {/* URL field (readonly) */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Webhook URL
            </label>
            <div className="flex items-center gap-2">
              <input
                id="webhook-url-display"
                type="text"
                readOnly
                value={status.url ?? "Not set — add AI_WEBHOOK_URL to .env"}
                className="flex-1 h-9 rounded-lg px-3 text-[13px] bg-[#F3F5F9] dark:bg-[#0F1117] border border-black/[0.06] dark:border-white/[0.06] text-slate-600 dark:text-slate-400 outline-none cursor-default"
              />
              {status.url && (
                <button
                  id="webhook-copy-btn"
                  onClick={handleCopy}
                  className="w-9 h-9 rounded-lg flex items-center justify-center border border-black/[0.06] dark:border-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label="Copy URL"
                >
                  {copied ? (
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <CopyIcon className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Test connection button */}
          <button
            id="webhook-test-btn"
            onClick={handleTest}
            disabled={!status.configured || testing}
            className="w-full h-9 rounded-lg text-[13px] font-medium bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                Testing…
              </>
            ) : (
              "Test Connection"
            )}
          </button>

          {/* Test result */}
          {testResult && (
            <div
              className={`rounded-lg px-3 py-2.5 text-[12px] ${
                testResult.ok
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                  : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20"
              }`}
            >
              {testResult.ok ? (
                <p>
                  ✓ Connected — {testResult.latencyMs}ms latency (HTTP{" "}
                  {testResult.status})
                </p>
              ) : (
                <p>✕ {testResult.error ?? `HTTP ${testResult.status}`}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.06] bg-[#F3F5F9]/50 dark:bg-[#0F1117]/50">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
            Set <code className="text-[10px] font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 py-0.5 rounded">AI_WEBHOOK_URL</code> in your <code className="text-[10px] font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 py-0.5 rounded">.env.local</code> file and restart the server.
          </p>
        </div>
      </div>
    </div>
  );
}
