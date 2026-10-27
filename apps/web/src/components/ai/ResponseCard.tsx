"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  RefreshCw,
  Share2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { AIMark } from "@/components/ai/AIMark";
import { useAppLocale } from "@/components/LocaleProvider";

interface ResponseCardProps {
  id: string;
  content: string;
  displayedContent?: string;
  timestamp: string;
  isTyping?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

function formatMessageTime(isoTimestamp: string, locale: string = "en"): string {
  try {
    const d = new Date(isoTimestamp);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "";
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Markdown-like formatter with tight list spacing ──────────────
function formatContent(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isBullet = /^[•\-*]\s+(.*)$/.test(line);
    const isNumbered = /^\d+\.\s+(.*)$/.test(line);

    if (isBullet || isNumbered) {
      if (!inList) {
        inList = true;
        out.push('<ul class="my-1 pl-4 list-disc space-y-0.5 leading-snug">');
      }
      const itemText = escapeHtml(line.replace(/^[•\-*]\s+/, "").replace(/^\d+\.\s+/, ""));
      out.push(`<li>${itemText}</li>`);
    } else {
      if (inList) {
        inList = false;
        out.push("</ul>");
      }
      if (line.trim().length === 0) {
        out.push('<div class="h-1.5"></div>');
      } else {
        out.push(`<p class="my-0.5 leading-relaxed">${escapeHtml(line)}</p>`);
      }
    }
  }
  if (inList) {
    out.push("</ul>");
  }

  let html = out.join("");
  return html
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-[12px] font-mono">$1</code>')
    .replace(/### (.*?)(?:<br\s*\/?>|<\/p>)/g, '<h4 class="font-semibold text-sm my-1 text-foreground">$1</h4>')
    .replace(/## (.*?)(?:<br\s*\/?>|<\/p>)/g, '<h3 class="font-semibold text-base my-1.5 text-foreground">$1</h3>');
}

export function ResponseCard({
  id,
  content,
  displayedContent,
  timestamp,
  isTyping,
  isError,
  errorMessage,
  onRetry,
}: ResponseCardProps) {
  const t = useTranslations("assistant");
  const { locale } = useAppLocale();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const rawText = displayedContent ?? content;
  const displayText = rawText;
  const isLong = displayText.length > 800;
  const formattedTime = formatMessageTime(timestamp, locale);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayText);
    setCopiedId(id);
    toast.success(t("toastCopied"));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ text: displayText });
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        try {
          await navigator.clipboard.writeText(displayText);
          setIsShared(true);
          toast.success(t("toastShared"));
          setTimeout(() => setIsShared(false), 2000);
        } catch {
          /* ignore */
        }
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(displayText);
        setIsShared(true);
        toast.success(t("toastShared"));
        setTimeout(() => setIsShared(false), 2000);
      } catch {
        /* ignore */
      }
    }
  };

  // Friendly error message fallback
  const friendlyError =
    errorMessage &&
    !errorMessage.includes("{") &&
    !errorMessage.includes("status") &&
    !errorMessage.includes("503") &&
    !errorMessage.includes("429") &&
    !errorMessage.includes("FetchError")
      ? errorMessage
      : t("aiBusy");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="flex gap-2.5 items-start w-full max-w-full"
    >
      {/* Modern AI Mark Avatar (28px) */}
      <AIMark size={28} className="mt-0.5 shrink-0" />

      {/* Bubble + Metadata Column */}
      <div className="flex-1 min-w-0 max-w-[88%]">
        {/* Error Bubble */}
        {isError ? (
          <div className="rounded-2xl rounded-tl-[4px] p-3.5 sm:p-4 text-sm leading-relaxed bg-destructive/10 border border-destructive/25 text-foreground shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4.5 w-4.5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] text-foreground leading-snug">
                  {friendlyError}
                </p>
                {onRetry && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={onRetry}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors shadow-xs cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{t("retry")}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Normal Assistant Bubble */
          <div className="rounded-2xl rounded-tl-[4px] p-3.5 sm:p-4 text-sm leading-relaxed bg-card border border-border text-foreground shadow-xs">
            {/* Content Body */}
            <div
              className="break-words text-[13.5px] sm:text-sm"
              style={
                isLong && !isExpanded
                  ? {
                      maxHeight: 220,
                      overflow: "hidden",
                      maskImage:
                        "linear-gradient(to bottom, black 70%, transparent 100%)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, black 70%, transparent 100%)",
                    }
                  : undefined
              }
              dangerouslySetInnerHTML={{
                __html: formatContent(displayText),
              }}
            />

            {/* Typing cursor */}
            {isTyping && (
              <motion.span
                className="inline-block w-1.5 h-3.5 bg-primary ml-1 align-middle rounded-sm"
                animate={{ opacity: [1, 0] }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />
            )}

            {/* Expand / Collapse */}
            {isLong && !isTyping && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-xs font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> {t("showLess")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> {t("showMore")}
                  </>
                )}
              </button>
            )}

            {/* Action Footer */}
            {!isTyping && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 hover:text-foreground transition-colors px-1 py-0.5 rounded cursor-pointer"
                >
                  {copiedId === id ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>{copiedId === id ? t("btnCopied") : t("btnCopy")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1 hover:text-foreground transition-colors px-1 py-0.5 rounded cursor-pointer"
                >
                  {isShared ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Share2 className="h-3 w-3" />
                  )}
                  <span>{isShared ? t("btnShared") : t("btnShare")}</span>
                </button>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex items-center gap-1 hover:text-foreground transition-colors px-1 py-0.5 rounded cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{t("btnRegenerate")}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Timestamp below the bubble in muted text */}
        <span className="text-[10.5px] text-muted-foreground/70 block mt-1 pl-1 font-normal select-none">
          {formattedTime}
        </span>
      </div>
    </motion.div>
  );
}

export default ResponseCard;
