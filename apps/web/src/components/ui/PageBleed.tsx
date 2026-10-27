import { cn } from "@/lib/utils";
import React from "react";

interface PageBleedProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * PageBleed counters <main>'s padding (p-4 md:p-6 lg:p-8) precisely across all breakpoints,
 * allowing pages that want custom background colors or edge-to-edge layouts to bleed seamlessly
 * without causing horizontal overflow or 8px offset shifts.
 */
export function PageBleed({ children, className, ...props }: PageBleedProps) {
  return (
    <div
      className={cn(
        "page-bleed w-full min-w-0 overflow-x-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
