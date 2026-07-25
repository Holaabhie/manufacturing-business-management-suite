"use client";

import {
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────

interface TableSkeletonRowsProps {
  /** Number of skeleton rows to render. Default: 5 */
  rows?: number;
  /** Number of columns per row. Default: 4 */
  cols?: number;
  /** Use div-based layout instead of table rows (for CSS grid contexts). Default: false */
  gridMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─── Deterministic width pattern (NO Math.random) ──

const WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-5/6"] as const;

// ─── Table-based Skeleton (for <Table> contexts) ──

export function TableSkeletonRows({
  rows = 5,
  cols = 4,
  gridMode = false,
  className,
}: TableSkeletonRowsProps) {
  if (gridMode) {
    return <GridSkeletonRows rows={rows} cols={cols} className={className} />;
  }

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow
          key={`skeleton-row-${rowIdx}`}
          className={cn(
            "border-b border-[var(--border)]",
            rowIdx % 2 === 1 && "bg-[var(--muted)]/30"
          )}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <TableCell
              key={`skeleton-cell-${rowIdx}-${colIdx}`}
              className={cn(
                "py-4",
                colIdx === 0 && "pl-5",
                colIdx === cols - 1 && "pr-5"
              )}
            >
              <div className="space-y-2">
                <div
                  className={cn(
                    "h-4 rounded-[8px] bg-[var(--muted)] shimmer",
                    WIDTHS[(rowIdx + colIdx) % WIDTHS.length]
                  )}
                />
                {colIdx === 0 && (
                  <div className="h-3 w-1/3 rounded-[6px] bg-[var(--muted)] shimmer" />
                )}
              </div>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Grid-based Skeleton (for Production page's CSS grid layout) ──

function GridSkeletonRows({
  rows = 5,
  cols = 6,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("p-5 space-y-3", className)}>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`grid-skeleton-${rowIdx}`}
          className={cn(
            "flex gap-4 items-center",
            rowIdx % 2 === 1 && "opacity-80"
          )}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={`grid-cell-${rowIdx}-${colIdx}`}
              className={cn(
                "rounded-[10px] bg-[var(--muted)] shimmer",
                colIdx === cols - 1 ? "h-10 w-10 rounded-full" : "h-14 flex-1",
                WIDTHS[(rowIdx + colIdx) % WIDTHS.length]
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
