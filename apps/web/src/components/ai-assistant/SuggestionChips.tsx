"use client";

// ─── Suggestion Chip Definitions ─────────────────────────────
// Prompts reuse the exact text from the old QuickActionsSidebar,
// translated to English (old prompts were Hindi).
const SUGGESTION_CHIPS = [
  {
    id: "chip-low-stock",
    label: "Low stock items",
    prompt: "Which items have low stock? Give me a low inventory alert.",
  },
  {
    id: "chip-pending-orders",
    label: "Pending orders",
    prompt: "Show me the status of all pending orders.",
  },
  {
    id: "chip-outstanding",
    label: "Outstanding payments",
    prompt: "Show this month's payment summary — collected vs outstanding.",
  },
];

// ─── Component ───────────────────────────────────────────────
interface SuggestionChipsProps {
  onAction: (prompt: string) => void;
  disabled?: boolean;
  messageCount: number;
}

export function SuggestionChips({
  onAction,
  disabled,
  messageCount,
}: SuggestionChipsProps) {
  // Auto-hide once conversation has started (more than just the welcome message)
  if (messageCount > 1) return null;

  return (
    <div
      className="flex-shrink-0 px-4 sm:px-5 pt-2 pb-1"
      style={{ background: "var(--ai-bg-primary)" }}
    >
      <div className="max-w-[900px] mx-auto">
        <p
          className="text-[11px] font-medium mb-2 select-none"
          style={{ color: "var(--ai-text-tertiary)" }}
        >
          Try asking
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip.id}
              id={chip.id}
              onClick={() => onAction(chip.prompt)}
              disabled={disabled}
              className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--ai-bg-surface-elevated)",
                borderColor: "var(--ai-border-subtle)",
                color: "var(--ai-text-secondary)",
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.background =
                    "var(--ai-bg-surface-hover)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "var(--ai-bg-surface-elevated)";
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
