"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, Share2, ChevronDown, ChevronUp, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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

// ── Markdown-like formatter ──────────────────────────────────
function formatContent(content: string): string {
  return content
    // Headers
    .replace(/^### (.*$)/gm, '<h4 class="ai-response-card__title" style="font-size:14px;margin:12px 0 6px;">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 class="ai-response-card__title" style="font-size:15px;margin:14px 0 8px;">$1</h3>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Bullet lists
    .replace(/^[•\-]\s+(.*$)/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\d+\.\s+(.*$)/gm, '<li>$1</li>')
    // Tables (basic)
    .replace(/\|/g, ' | ')
    // Line breaks
    .replace(/\n/g, '<br />');
}

// ── Extract title from content ──────────────────────────────
function extractTitle(content: string): string | null {
  // Look for first bold text or heading
  const boldMatch = content.match(/^\*\*(.*?)\*\*/);
  if (boldMatch && boldMatch[1].length < 60) return boldMatch[1];
  
  const headingMatch = content.match(/^#{1,3}\s+(.*$)/m);
  if (headingMatch) return headingMatch[1];
  
  // Check for emoji-prefixed title
  const emojiMatch = content.match(/^([^\n]{5,50})\n/);
  if (emojiMatch && !emojiMatch[1].includes('.')) return emojiMatch[1];
  
  return null;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const displayText = displayedContent ?? content;
  const title = extractTitle(content);
  const isLong = content.length > 600;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex gap-3 items-start"
    >
      {/* AI Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-[10px] flex items-center justify-center mt-1"
        style={{
          background: isError
            ? "linear-gradient(135deg, #F43F5E, #E11D48)"
            : "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
          boxShadow: isError
            ? "0 2px 10px rgba(244,63,94,0.3)"
            : "0 2px 10px rgba(139,92,246,0.3)",
        }}
      >
        <Bot className="h-4 w-4 text-white" />
      </div>

      {/* Card */}
      <div
        className={`ai-response-card flex-1 min-w-0 ${
          isError ? "!border-[var(--ai-error)]/20" : ""
        }`}
        style={isError ? { background: "rgba(244,63,94,0.06)" } : undefined}
      >
        {/* Title */}
        {title && !isError && (
          <div className="ai-response-card__title flex items-center gap-2">
            <span>{title.replace(/\*\*/g, '')}</span>
          </div>
        )}

        {/* Body */}
        <div
          className="ai-response-card__body"
          style={isLong && !isExpanded ? { maxHeight: 200, overflow: "hidden", maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)" } : undefined}
          dangerouslySetInnerHTML={{
            __html: formatContent(displayText),
          }}
        />

        {/* Typing cursor */}
        {isTyping && (
          <motion.span
            className="inline-block w-[2px] h-[16px] bg-[var(--ai-accent-purple)] ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
          />
        )}

        {/* Expand/Collapse */}
        {isLong && !isTyping && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ai-expandable-trigger"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Show more
              </>
            )}
          </button>
        )}

        {/* Error retry */}
        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 mt-3 text-[12px] text-[var(--ai-error)] font-semibold hover:underline"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        )}

        {/* Actions row */}
        {!isTyping && !isError && (
          <div className="ai-response-card__actions">
            <button onClick={copyToClipboard} className="ai-response-card__action-btn">
              {copiedId === id ? (
                <Check className="h-3 w-3 text-[var(--ai-success)]" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copiedId === id ? "Copied" : "Copy"}
            </button>
            <button className="ai-response-card__action-btn">
              <Share2 className="h-3 w-3" /> Share
            </button>
            {onRetry && (
              <button onClick={onRetry} className="ai-response-card__action-btn">
                <RefreshCw className="h-3 w-3" /> Regenerate
              </button>
            )}
            <span className="ml-auto text-[10px] text-[var(--ai-text-tertiary)] self-center">
              {new Date(timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
