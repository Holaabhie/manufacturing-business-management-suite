"use client";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <div
          className="h-[34px] w-[200px] rounded-[10px] shimmer"
          style={{ background: "var(--fill-tertiary)" }}
        />
        <div
          className="h-[20px] w-[300px] rounded-[8px] shimmer"
          style={{ background: "var(--fill-tertiary)" }}
        />
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[140px] rounded-[16px] shimmer"
            style={{
              background: "var(--fill-tertiary)",
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 h-[340px] rounded-[16px] shimmer"
          style={{ background: "var(--fill-tertiary)" }}
        />
        <div
          className="h-[340px] rounded-[16px] shimmer"
          style={{ background: "var(--fill-tertiary)" }}
        />
      </div>

      {/* Activity Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="h-[280px] rounded-[16px] shimmer"
          style={{
            background: "var(--fill-tertiary)",
            animationDelay: "200ms",
          }}
        />
        <div
          className="lg:col-span-2 h-[280px] rounded-[16px] shimmer"
          style={{
            background: "var(--fill-tertiary)",
            animationDelay: "300ms",
          }}
        />
      </div>
    </div>
  );
}
