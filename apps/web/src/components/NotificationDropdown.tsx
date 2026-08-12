"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NotificationIcon } from "@/components/notifications/NotificationIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppNotifications } from "@/lib/hooks/use-app-notifications";
import { useIsMobile } from "@/hooks/use-mobile";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { MobileSheet } from "@/components/ui/MobileSheet";
import "./NotificationDropdown.css";

/* ─── Exported helper — testable pure function ─── */
export function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff)) return "—";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return "—"; }
}

/* ─── Shared inner content — rendered by both Popover and MobileSheet ─── */
function NotificationPanelContent({
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onMarkAsRead,
  onClose,
  onNavigate,
}: {
  notifications: ReturnType<typeof useAppNotifications>["notifications"];
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
  onNavigate: (url: string) => void;
}) {
  return (
    <>
      {/* ── Sticky Header ── */}
      <div
        className="sticky top-0 z-10 px-4 pt-3.5 pb-2.5 shrink-0 bg-white/90 dark:bg-[#1C1C1E]/90"
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Title + badge */}
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-[var(--foreground)]">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 bg-[var(--accent-red,#EF4444)] text-white">
                {unreadCount}
              </span>
            )}
          </div>
          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                className="text-[12px] font-medium flex items-center gap-1 cursor-pointer text-[var(--accent-blue,#007AFF)] hover:opacity-70 transition-opacity px-2 py-1 rounded-lg hover:bg-[var(--muted)]"
                onClick={onMarkAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full flex items-center justify-center bg-[var(--muted)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            </button>
          </div>
        </div>
        {/* Header bottom separator */}
        <div className="h-px mt-2.5 bg-gradient-to-r from-transparent via-[var(--separator,rgba(60,60,67,0.15))] dark:via-white/[0.08] to-transparent" />
      </div>

      {/* ── Scrollable Notification List ── */}
      <div
        className="overflow-y-auto flex-1 min-h-0"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--muted) transparent",
        }}
      >
        {notifications.length > 0 ? (
          notifications.map((n, idx) => {
            return (
              <div
                key={n.id}
                className={cn(
                  "group relative cursor-pointer transition-all duration-150",
                  "hover:bg-black/[0.02] dark:hover:bg-white/[0.03]",
                  "active:scale-[0.998]",
                  !n.isRead && [
                    "bg-[rgba(37,99,235,0.04)]",
                    "dark:bg-[rgba(59,130,246,0.06)]",
                  ]
                )}
                style={{
                  padding: "12px 16px",
                  borderLeft: !n.isRead
                    ? "2.5px solid var(--accent-blue, #007AFF)"
                    : "2.5px solid transparent",
                }}
                onClick={() => {
                  if (!n.isRead) {
                    onMarkAsRead(n.id);
                  }
                  if (n.url) {
                    onNavigate(n.url);
                    onClose();
                  }
                }}
              >
                <div className="flex gap-3">
                  {/* Icon — centralized via NotificationIcon */}
                  <NotificationIcon type={n.type} size={16} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-[13px] leading-[1.35] tracking-[-0.01em]",
                        !n.isRead
                          ? "font-semibold text-[#0F172A] dark:text-[#F8FAFC]"
                          : "font-normal text-[#64748B] dark:text-white/50"
                      )}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <div className="flex-shrink-0 mt-1.5 rounded-full w-2 h-2 bg-blue-500" />
                      )}
                    </div>
                    <p className={cn(
                      "text-[12px] mt-[2px] overflow-hidden text-ellipsis whitespace-nowrap",
                      n.isRead
                        ? "text-[#94A3B8] dark:text-white/30"
                        : "text-[var(--muted-foreground)]"
                    )}>
                      {n.message}
                    </p>
                    <span className="text-[11px] mt-0.5 block text-[#94A3B8] dark:text-white/30 tracking-[0.02em]">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Separator */}
                {idx < notifications.length - 1 && (
                  <div className="absolute bottom-0 left-[62px] right-4 h-px bg-[var(--separator,rgba(60,60,67,0.08))] dark:bg-white/[0.04]" />
                )}
              </div>
            );
          })
        ) : (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--muted)] flex items-center justify-center mb-3">
              <Bell className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            <p className="text-[14px] font-semibold text-[var(--muted-foreground)] tracking-[-0.01em]">
              All caught up!
            </p>
            <p className="text-[12px] mt-1 text-[var(--muted-foreground)]">
              No new notifications
            </p>
          </div>
        )}
      </div>

      {/* ── Footer: "See all notifications →" ── */}
      {notifications.length > 0 && (
        <div className="shrink-0 border-t border-[var(--separator,rgba(60,60,67,0.08))] dark:border-white/[0.06]">
          <Link
            href="/dashboard/notifications"
            className="flex items-center justify-center gap-1.5 px-4 py-3 text-[13px] font-semibold text-[var(--accent-blue,#007AFF)] hover:bg-[var(--muted)] transition-colors"
            onClick={onClose}
          >
            See all notifications
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </>
  );
}

/* ─── Main Component ──────────────────────────────── */
export function NotificationDropdown() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const {
    notifications: allNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead: hookMarkAllAsRead,
  } = useAppNotifications();

  // Dropdown only shows latest 20
  const notifications = allNotifications.slice(0, 20);

  const [isOpen, setIsOpen] = useState(false);
  const [hasNewPulse, setHasNewPulse] = useState(false);
  const prevUnreadRef = useRef(0);

  // Pulse when new unread arrives
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && !isOpen) {
      setHasNewPulse(true);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, isOpen]);

  // Stop pulse when opened
  useEffect(() => {
    if (isOpen) setHasNewPulse(false);
  }, [isOpen]);

  // Close panel on breakpoint change to prevent stale container state
  useEffect(() => {
    if (isOpen) setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  /* ─── Callbacks ────────────────────────────────── */
  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleMarkAllAsRead = useCallback(() => {
    hookMarkAllAsRead();
    toast.success("All notifications marked as read");
  }, [hookMarkAllAsRead]);

  const handleNavigate = useCallback((url: string) => {
    router.push(url);
  }, [router]);

  /* ─── Shared content props ─────────────────────── */
  const contentProps = {
    notifications,
    unreadCount,
    onMarkAllAsRead: handleMarkAllAsRead,
    onMarkAsRead: markAsRead,
    onClose: handleClose,
    onNavigate: handleNavigate,
  };

  /* ─── Bell trigger (shared between both paths) ─── */
  const bellButton = (
    <button
      onClick={() => setIsOpen((prev) => !prev)}
      className="relative h-[36px] w-[36px] rounded-[10px] flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
    >
      <Bell className="h-[18px] w-[18px]" />
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -top-[6px] -right-[6px] flex items-center justify-center",
            "min-w-[18px] h-[18px] rounded-full px-1",
            "bg-[var(--accent-red,#EF4444)] text-white text-[10px] font-extrabold",
            "border-2 border-[var(--bg-card,#fff)] dark:border-[var(--bg-page,#000)]",
            "shadow-lg shadow-red-500/30"
          )}
          style={{
            animation: hasNewPulse ? "notif-pulse 2s ease-in-out infinite" : "none",
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="notification-dropdown-root relative">
      {/* ════════════ DESKTOP (≥768px): Radix Popover ════════════ */}
      {!isMobile ? (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            {bellButton}
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className={cn(
              "w-[400px] max-h-[80vh] p-0 flex flex-col",
              /* Glass surface — Light */
              "bg-white/95 border-[0.5px] border-[var(--border-card,rgba(60,60,67,0.12))]",
              "shadow-[0_8px_40px_rgba(0,0,0,0.10),0_2px_12px_rgba(0,0,0,0.06)]",
              /* Glass surface — Dark */
              "dark:bg-[#1C1C1E]/95 dark:border-white/[0.10]",
              "dark:shadow-[0_8px_40px_rgba(0,0,0,0.5),0_2px_12px_rgba(0,0,0,0.3)]",
              /* Rounded corners */
              "rounded-[16px]"
            )}
            style={{
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
            }}
          >
            <NotificationPanelContent {...contentProps} />
          </PopoverContent>
        </Popover>
      ) : (
        <>
          {/* ════════════ MOBILE (<768px): MobileSheet ════════════ */}
          {bellButton}
          <MobileSheet
            open={isOpen}
            onClose={handleClose}
            maxHeight="88dvh"
            showHandle={true}
            dragToClose={true}
            className="notification-sheet__container"
          >
            <NotificationPanelContent {...contentProps} />
          </MobileSheet>
        </>
      )}

      {/* ── Pulse keyframe ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes notif-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      ` }} />
    </div>
  );
}
