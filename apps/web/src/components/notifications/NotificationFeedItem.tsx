"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotificationIcon } from "@/components/notifications/NotificationIcon";
import type { StoredNotification } from "@/lib/hooks/use-app-notifications";

// ─── Relative time formatter ────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    // Show actual date for older
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}

// ─── Date grouping helper ───────────────────────────────────────
export function getDateGroup(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    if (date >= today) return "Today";
    if (date >= yesterday) return "Yesterday";
    if (date >= weekAgo) return "This week";
    return "Earlier";
  } catch {
    return "Earlier";
  }
}

// ─── Component ──────────────────────────────────────────────────
interface NotificationFeedItemProps {
  notification: StoredNotification;
  onMarkRead: (id: string) => void;
}

export function NotificationFeedItem({
  notification,
  onMarkRead,
}: NotificationFeedItemProps) {
  const router = useRouter();

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkRead(notification.id);
    }
    if (notification.url) {
      router.push(notification.url);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group flex items-start gap-3 px-4 py-3.5 rounded-2xl",
        "cursor-pointer transition-all duration-150",
        "hover:bg-[#F8FAFC] dark:hover:bg-white/[0.02]",
        "active:scale-[0.998]",
        !notification.isRead &&
          "bg-[#F0F4FF] dark:bg-[rgba(59,130,246,0.05)]"
      )}
    >
      {/* Icon */}
      <NotificationIcon type={notification.type} size={16} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] leading-[1.4] tracking-[-0.01em]",
            notification.isRead
              ? "font-normal text-[#6B7280] dark:text-white/50"
              : "font-medium text-[#111827] dark:text-[#F8FAFC]"
          )}
        >
          {notification.title}
        </p>
        <p
          className={cn(
            "text-[12px] mt-[2px] overflow-hidden text-ellipsis whitespace-nowrap",
            notification.isRead
              ? "text-[#9CA3AF] dark:text-white/30"
              : "text-[#6B7280] dark:text-white/40"
          )}
        >
          {notification.message}
        </p>
        <p className="text-[11px] mt-0.5 text-[#9CA3AF] dark:text-white/30 tracking-[0.02em]">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
      )}
    </div>
  );
}

// ─── Date Group Header ──────────────────────────────────────────
export function DateGroupHeader({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-white/30 px-4 py-2 mt-2 first:mt-0">
      {label}
    </p>
  );
}
