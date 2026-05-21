"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Error Icon */}
        <div className="mx-auto w-14 h-14 rounded-lg flex items-center justify-center mb-5 bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>

        <h2 className="text-[20px] font-semibold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
          {error.message || "An unexpected error occurred while loading the dashboard."}
        </p>

        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium text-white bg-primary hover:bg-primary/90 transition-colors active:scale-[0.98] cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>

        {error.digest && (
          <p className="mt-4 text-[11px] font-mono text-muted-foreground/50">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
