"use client";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-[200px] rounded-md bg-muted animate-pulse" />
        <div className="h-5 w-[300px] rounded-md bg-muted animate-pulse" />
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[120px] rounded-lg bg-muted animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-[300px] rounded-lg bg-muted animate-pulse" />
        <div className="h-[300px] rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Activity Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-[240px] rounded-lg bg-muted animate-pulse" style={{ animationDelay: "160ms" }} />
        <div className="lg:col-span-2 h-[240px] rounded-lg bg-muted animate-pulse" style={{ animationDelay: "240ms" }} />
      </div>
    </div>
  );
}
