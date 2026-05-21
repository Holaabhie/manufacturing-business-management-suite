"use client";

/**
 * TallyExportButton
 * ─────────────────────────────────────────────────────────
 * Self-contained button component that handles the full
 * Tally Prime sync flow: bridge check → Tally check →
 * XML generation → ledger sync → voucher sync.
 *
 * Shows real-time sync stage with spinner, success/error
 * state, and toast notifications. Never freezes the UI.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

type SyncStage =
  | "idle"
  | "checking-bridge"
  | "checking-tally"
  | "generating-xml"
  | "syncing-ledger"
  | "syncing-voucher"
  | "success"
  | "error";

interface TallyExportButtonProps {
  invoiceId: string;
  invoiceNumber: string;
  tallySynced?: boolean;
  tallySyncedAt?: string;
  tallyVoucherNumber?: string;
  onSuccess?: () => void;
  /** Compact mode for table rows */
  compact?: boolean;
  className?: string;
}

// ─── Tally Logo SVG ─────────────────────────────────────

function TallyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 4h16v2H4V4zm0 4h10v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2zm0 4h16v2H4v-2z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────

export default function TallyExportButton({
  invoiceId,
  invoiceNumber,
  tallySynced = false,
  tallySyncedAt,
  tallyVoucherNumber,
  onSuccess,
  compact = false,
  className,
}: TallyExportButtonProps) {
  const t = useTranslations("tally");
  const [stage, setStage] = useState<SyncStage>(tallySynced ? "success" : "idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const isLoading = ![
    "idle",
    "success",
    "error",
  ].includes(stage);

  // ─── Stage display text ──────────────────────────────

  function getStageLabel(): string {
    switch (stage) {
      case "checking-bridge":
        return t("stages.checkingBridge");
      case "checking-tally":
        return t("stages.checkingTally");
      case "generating-xml":
        return t("stages.generatingXml");
      case "syncing-ledger":
        return t("stages.syncingLedger");
      case "syncing-voucher":
        return t("stages.syncingVoucher");
      case "success":
        return t("stages.success");
      case "error":
        return t("stages.error");
      default:
        return t("exportButton");
    }
  }

  // ─── Error code to message ───────────────────────────

  function getErrorMessage(code: string): string {
    const errorMap: Record<string, string> = {
      TALLY_NOT_RUNNING: t("errors.TALLY_NOT_RUNNING"),
      BRIDGE_NOT_RUNNING: t("errors.BRIDGE_NOT_RUNNING"),
      VOUCHER_ALREADY_EXISTS: t("errors.VOUCHER_ALREADY_EXISTS"),
      XML_INVALID: t("errors.XML_INVALID"),
      BRIDGE_AUTH_FAILED: t("errors.BRIDGE_AUTH_FAILED"),
      TIMEOUT: t("errors.TIMEOUT"),
    };
    return errorMap[code] || code;
  }

  // ─── Main sync flow ──────────────────────────────────

  const handleSync = useCallback(async () => {
    setErrorMessage("");

    try {
      // Step 1: Get bridge config
      setStage("checking-bridge");
      const configRes = await fetch("/api/tally/bridge-health");
      const configData = await configRes.json();

      if (!configRes.ok || !configData.data) {
        throw { code: "BRIDGE_NOT_RUNNING", message: "Failed to fetch bridge config" };
      }

      const { bridgeUrl } = configData.data;

      // Step 2: Check bridge health
      try {
        const healthRes = await fetch(`${bridgeUrl}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!healthRes.ok) {
          throw { code: "BRIDGE_NOT_RUNNING" };
        }
      } catch (err: any) {
        if (err?.code === "BRIDGE_NOT_RUNNING") throw err;
        throw { code: "BRIDGE_NOT_RUNNING", message: "Bridge is not reachable" };
      }

      // Step 3: Check Tally status
      setStage("checking-tally");
      try {
        const tallyRes = await fetch(`${bridgeUrl}/tally-status`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!tallyRes.ok) {
          throw { code: "TALLY_NOT_RUNNING" };
        }
      } catch (err: any) {
        if (err?.code === "TALLY_NOT_RUNNING") throw err;
        throw { code: "TALLY_NOT_RUNNING", message: "Tally Prime is not responding" };
      }

      // Step 4: Generate XML
      setStage("generating-xml");
      const xmlRes = await fetch("/api/tally/generate-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const xmlData = await xmlRes.json();

      if (!xmlRes.ok || !xmlData.data) {
        throw { code: "XML_INVALID", message: xmlData.error?.message || "Failed to generate XML" };
      }

      const { ledgerXml, stockItemXml, voucherXml } = xmlData.data;

      // Step 5: Sync ledger (sent first for idempotent creation)
      setStage("syncing-ledger");
      const ledgerRes = await fetch(`${bridgeUrl}/sync-voucher`, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: ledgerXml,
        signal: AbortSignal.timeout(15000),
      });

      if (!ledgerRes.ok) {
        const ledgerErr = await ledgerRes.text();
        console.warn("Ledger sync warning:", ledgerErr);
        // Don't fail — Tally ignores duplicate ledgers
      }

      // Step 5b: Sync stock items
      if (stockItemXml) {
        await fetch(`${bridgeUrl}/sync-voucher`, {
          method: "POST",
          headers: { "Content-Type": "application/xml" },
          body: stockItemXml,
          signal: AbortSignal.timeout(15000),
        }).catch(() => {
          // Non-critical — stock items may already exist
        });
      }

      // Step 6: Sync voucher
      setStage("syncing-voucher");
      const voucherRes = await fetch(`${bridgeUrl}/sync-voucher`, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: voucherXml,
        signal: AbortSignal.timeout(15000),
      });

      if (!voucherRes.ok) {
        const voucherErr = await voucherRes.json().catch(() => ({ error: "Unknown" }));
        throw {
          code: voucherErr.errorCode || "VOUCHER_SYNC_FAILED",
          message: voucherErr.message || "Failed to create voucher in Tally",
        };
      }

      const voucherResult = await voucherRes.json().catch(() => ({}));

      // Step 7: Update sync status in DB
      await fetch("/api/tally/sync-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          tally_synced: true,
          tally_voucher_number: voucherResult.voucherNumber || invoiceNumber,
        }),
      });

      // Success
      setStage("success");
      toast.success(t("stages.success"), {
        description: `${invoiceNumber} → Tally`,
      });
      onSuccess?.();
    } catch (err: any) {
      const code = err?.code || "UNKNOWN";
      const message = getErrorMessage(code);
      setErrorMessage(message);
      setStage("error");
      toast.error(t("stages.error"), { description: message });
    }
  }, [invoiceId, invoiceNumber, onSuccess, t]);

  // ─── Reset to idle ────────────────────────────────────

  const handleRetry = useCallback(() => {
    setStage("idle");
    setErrorMessage("");
  }, []);

  // ─── Already-synced compact badge ────────────────────

  if (tallySynced && stage !== "error" && compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-[11px] text-emerald-600 font-medium">
          {t("synced")}
        </span>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────

  // Success state
  if (stage === "success") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          onClick={handleSync}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all",
            "bg-emerald-50 text-emerald-700 border border-emerald-200",
            "hover:bg-emerald-100 hover:border-emerald-300",
            "cursor-pointer"
          )}
          title={t("reSyncButton")}
        >
          <CheckCircle2 size={13} />
          <span>{t("synced")}</span>
          {tallyVoucherNumber && (
            <span className="text-emerald-500 font-mono text-[10px] ml-1">
              {tallyVoucherNumber}
            </span>
          )}
        </button>
        {tallySyncedAt && (
          <span className="text-[10px] text-[var(--muted-foreground)]">
            {new Date(tallySyncedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
    );
  }

  // Error state
  if (stage === "error") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          onClick={handleRetry}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all",
            "bg-red-50 text-red-700 border border-red-200",
            "hover:bg-red-100 hover:border-red-300",
            "cursor-pointer"
          )}
        >
          <RefreshCw size={13} />
          <span>{t("reSyncButton")}</span>
        </button>
        <span className="text-[10px] text-red-500 max-w-[150px] truncate" title={errorMessage}>
          {errorMessage}
        </span>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
            "bg-blue-50 text-blue-700 border border-blue-200"
          )}
        >
          <Loader2 size={13} className="animate-spin" />
          <span>{getStageLabel()}</span>
        </div>
      </div>
    );
  }

  // Idle state — primary button
  return (
    <button
      onClick={handleSync}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg text-[12px] font-semibold transition-all",
        "bg-[#2563EB] text-white",
        "hover:bg-[#1d4ed8] active:scale-[0.98]",
        "cursor-pointer shadow-sm",
        compact ? "px-2.5 py-1" : "px-3 py-1.5",
        className
      )}
    >
      <ArrowUpRight size={13} />
      <span>{t("exportButton")}</span>
    </button>
  );
}
