"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface TruncatedDataBannerProps {
    truncated?: boolean;
    count?: number;
    maxLimit?: number;
    entityName?: string;
    className?: string;
}

export function TruncatedDataBanner({
    truncated,
    count,
    maxLimit = 500,
    entityName = "records",
    className = "",
}: TruncatedDataBannerProps) {
    if (!truncated) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`w-full min-w-0 flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${className}`}
            style={{
                backgroundColor: "rgba(245, 158, 11, 0.08)",
                borderColor: "rgba(245, 158, 11, 0.25)",
                color: "#d97706",
            }}
        >
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <div className="flex-1 min-w-0 text-xs sm:text-sm text-foreground">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                    Display capped ({count ? `${count} ` : ""}{entityName}):
                </span>{" "}
                <span className="text-muted-foreground">
                    Only the top {maxLimit} records are loaded to maintain performance. Please apply search or date filters to narrow down results.
                </span>
            </div>
        </div>
    );
}

export default TruncatedDataBanner;
