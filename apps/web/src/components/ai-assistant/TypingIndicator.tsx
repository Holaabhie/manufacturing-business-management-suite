"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3" id="typing-indicator">
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ai-avatar-square shadow-md shadow-purple-500/20 ring-2 ring-purple-500/20"
      >
        <svg
          className="w-5 h-5 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
        </svg>
      </div>

      {/* Bubble with pulsing dots */}
      <div
        className="rounded-[20px] px-4 py-3 border"
        style={{
          background: "var(--ai-bg-surface)",
          borderColor: "var(--ai-border-subtle)",
          boxShadow: "var(--ai-card-shadow)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full bg-[#7C3AED] dark:bg-[#8B5CF6]"
            style={{
              opacity: 0.6,
              animation: "ai-pulse 1.4s ease-in-out infinite",
            }}
          />
          <span
            className="w-2 h-2 rounded-full bg-[#7C3AED] dark:bg-[#8B5CF6]"
            style={{
              opacity: 0.6,
              animation: "ai-pulse 1.4s ease-in-out 0.2s infinite",
            }}
          />
          <span
            className="w-2 h-2 rounded-full bg-[#7C3AED] dark:bg-[#8B5CF6]"
            style={{
              opacity: 0.6,
              animation: "ai-pulse 1.4s ease-in-out 0.4s infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
