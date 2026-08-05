"use client";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <div className="h-[34px] w-[200px] rounded-[10px] bg-[var(--muted)] shimmer" />
        <div className="h-[20px] w-[300px] rounded-[8px] bg-[var(--muted)] shimmer" />
      </div>

      {/* Stat Cards Skeleton — shares .kpi-panel / .kpi-grid / .kpi-card with real content */}
      <div className="kpi-panel">
        <div className="kpi-panel__glow"></div>
        <div className="kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="kpi-card flex flex-col justify-center min-h-[140px]"
            >
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

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-[340px] rounded-[16px] bg-[var(--muted)] shimmer" />
        <div className="h-[340px] rounded-[16px] bg-[var(--muted)] shimmer" />
      </div>

      {/* Activity Skeleton */}
      <div className="flex flex-col lg:flex-row items-stretch gap-4">
        <div className="lg:w-1/3 h-[300px] rounded-[16px] bg-[var(--muted)] shimmer" />
        <div className="lg:flex-1 h-[300px] rounded-[16px] bg-[var(--muted)] shimmer" />
      </div>
    </div>
  );
}
