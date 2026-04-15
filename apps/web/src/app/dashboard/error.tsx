"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Error Icon */}
        <div
          className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: "rgba(255, 59, 48, 0.12)",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ios-red)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2
          className="text-[22px] font-bold mb-2"
          style={{ color: "var(--label-primary)" }}
        >
          Something went wrong
        </h2>
        <p
          className="text-[15px] mb-6 leading-relaxed"
          style={{ color: "var(--label-secondary)" }}
        >
          {error.message || "An unexpected error occurred while loading the dashboard."}
        </p>

        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-95 cursor-pointer"
          style={{
            background:
              "linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))",
            boxShadow: "0 4px 14px rgba(0, 122, 255, 0.3)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          Try again
        </button>

        {error.digest && (
          <p
            className="mt-4 text-[12px] font-mono"
            style={{ color: "var(--label-quaternary)" }}
          >
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
