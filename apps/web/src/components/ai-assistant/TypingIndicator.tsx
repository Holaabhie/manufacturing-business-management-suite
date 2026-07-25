"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3" id="typing-indicator">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center flex-shrink-0">
        <svg
          className="w-4 h-4 text-white"
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
      <div className="bg-white dark:bg-[#1C2333] border border-black/[0.06] dark:border-white/[0.06] rounded-[0_16px_16px_16px] px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full bg-[#2563EB]/60"
            style={{ animation: "ai-pulse 1.4s ease-in-out infinite" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-[#2563EB]/60"
            style={{
              animation: "ai-pulse 1.4s ease-in-out 0.2s infinite",
            }}
          />
          <span
            className="w-2 h-2 rounded-full bg-[#2563EB]/60"
            style={{
              animation: "ai-pulse 1.4s ease-in-out 0.4s infinite",
            }}
          />
        </div>
      </div>

      {/* CSS keyframes for the pulse animation */}
      <style>{`
        @keyframes ai-pulse {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
