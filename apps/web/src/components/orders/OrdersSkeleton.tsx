import React from "react";

export function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-[34px] w-[220px] rounded-[10px] bg-[var(--muted)] shimmer" />
        <div className="h-[20px] w-[280px] rounded-[8px] bg-[var(--muted)] shimmer mt-2" />
      </div>
      <div className="kpi-panel">
        <div className="kpi-panel__glow"></div>
        <div className="kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi-card flex flex-col justify-center min-h-[140px]">
              <div className="flex items-center justify-between mb-4">
                <div className="h-[48px] w-[48px] rounded-[14px] bg-[var(--muted)] shimmer" />
                <div className="h-[24px] w-[50px] rounded-full bg-[var(--muted)] shimmer" />
              </div>
              <div className="h-[34px] w-[120px] rounded-[8px] bg-[var(--muted)] shimmer mb-2" />
              <div className="h-[16px] w-[90px] rounded-[6px] bg-[var(--muted)] shimmer" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="h-[48px] w-full sm:w-[280px] rounded-[12px] bg-[var(--muted)] shimmer" />
        <div className="h-[40px] w-[120px] rounded-[10px] bg-[var(--muted)] shimmer" />
      </div>
      <div className="hidden md:block rounded-[20px] border border-[var(--border)] overflow-hidden">
        <div className="h-[44px] bg-[var(--muted)]/30 border-b border-[var(--border)]" />
        <div className="divide-y divide-[var(--border)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-[40px] w-[40px] rounded-full bg-[var(--muted)] shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-[14px] w-3/4 rounded-[4px] bg-[var(--muted)] shimmer" />
                <div className="h-[12px] w-1/2 rounded-[4px] bg-[var(--muted)] shimmer" />
              </div>
              <div className="h-[24px] w-[80px] rounded-full bg-[var(--muted)] shimmer" />
              <div className="h-[14px] w-[100px] rounded-[4px] bg-[var(--muted)] shimmer" />
            </div>
          ))}
        </div>
      </div>
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[16px] border border-[var(--border)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-[16px] w-2/3 rounded-[4px] bg-[var(--muted)] shimmer" />
              <div className="h-[24px] w-[72px] rounded-full bg-[var(--muted)] shimmer" />
            </div>
            <div className="h-[12px] w-1/2 rounded-[4px] bg-[var(--muted)] shimmer" />
            <div className="h-[12px] w-1/3 rounded-[4px] bg-[var(--muted)] shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
