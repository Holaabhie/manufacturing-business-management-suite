"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { IOSCard, IOSButton } from "@/components/ui/ios";
import { KeyRound, Copy, Check, Clock, Loader2, RotateCw, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface PairingCodeCardProps {
  onCodeGenerated?: () => void;
}

export function PairingCodeCard({ onCodeGenerated }: PairingCodeCardProps) {
  const t = useTranslations("settings.tallyPage");

  // Keep the pairing code ONLY in React state (never localStorage/sessionStorage/URL, never logged)
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear code and timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setCode(null);
      setExpiresAt(null);
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!expiresAt) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        setIsExpired(true);
        setCode(null); // Clear code from state upon expiry
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    updateCountdown();
    timerRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiresAt]);

  const handleGenerateCode = async () => {
    setLoading(true);
    setIsExpired(false);
    setCopied(false);
    try {
      const res = await fetch("/api/tally/bridge/pairing-codes", {
        method: "POST",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate pairing code");
      }

      const json = await res.json();
      const newCode = json.data?.code;
      // D4: use the expiry from response if present, otherwise 10 minutes from now
      const exp = json.data?.expiresAt
        ? new Date(json.data.expiresAt).getTime()
        : Date.now() + 10 * 60 * 1000;

      setCode(newCode);
      setExpiresAt(exp);

      // Refresh devices list immediately after code generation (D5)
      onCodeGenerated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate pairing code");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code to clipboard");
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <IOSCard className="p-4 sm:p-6 space-y-5 bg-[var(--card)] border border-[var(--border)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#0A84FF]" />
            {t("bridgeCardTitle")}
          </h3>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            {t("bridgeCardSubtitle")}
          </p>
        </div>

        {!code && !isExpired && (
          <IOSButton
            type="button"
            variant="filled"
            color="blue"
            disabled={loading}
            onClick={handleGenerateCode}
            className="h-[42px] px-5 text-[13px] font-semibold rounded-[10px] shrink-0"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            {loading ? t("btnGeneratingCode") : t("btnGenerateCode")}
          </IOSButton>
        )}
      </div>

      {/* Code Display Area */}
      {code && !isExpired && (
        <div className="p-4 sm:p-5 rounded-[16px] bg-[var(--muted)]/40 border border-[var(--border)] space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-[var(--foreground)] select-all px-3 py-1 rounded-[8px] bg-[var(--card)] border border-[var(--border)]">
                {code}
              </span>
              <IOSButton
                type="button"
                variant="gray"
                onClick={handleCopy}
                className="h-[38px] px-3.5 text-[12px] font-medium rounded-[8px]"
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4 text-emerald-500" />
                    {t("copied")}
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-4 w-4" />
                    {t("btnCopy")}
                  </>
                )}
              </IOSButton>
            </div>

            <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#FF9500] bg-[#FF9500]/10 px-3 py-1.5 rounded-full">
              <Clock className="h-4 w-4" />
              <span>{t("codeExpiresIn", { time: formatCountdown(remainingSeconds) })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Expired State */}
      {isExpired && (
        <div className="p-4 rounded-[16px] bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-500 font-medium text-[14px]">
            <Clock className="h-4 w-4" />
            <span>{t("codeExpired")}</span>
          </div>
          <IOSButton
            type="button"
            variant="filled"
            color="blue"
            disabled={loading}
            onClick={handleGenerateCode}
            className="h-[38px] px-4 text-[13px] font-semibold rounded-[10px]"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="mr-2 h-4 w-4" />
            )}
            {t("btnGenerateNewCode")}
          </IOSButton>
        </div>
      )}

      {/* Help text */}
      <div className="flex items-start gap-2 pt-1 text-[12px] text-[var(--muted-foreground)]">
        <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--primary)]" />
        <p className="leading-relaxed">{t("pairingHelpText")}</p>
      </div>
    </IOSCard>
  );
}
