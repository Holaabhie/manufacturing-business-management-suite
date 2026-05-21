"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  MessageCircle,
  Mail,
  Send,
  Phone,
  Plus,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  ChevronDown,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IOSCard } from "@/components/ui/ios/IOSCard";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { StatWidget } from "@/components/ui/StatWidget";
import { useRole } from "@/lib/hooks/use-role";
import { AccessDenied } from "@/components/AccessDenied";
import { useAppNotifications } from "@/lib/hooks/use-app-notifications";
import {
  NotificationFeedItem,
  DateGroupHeader,
  getDateGroup,
} from "@/components/notifications/NotificationFeedItem";

interface Template {
  id: string;
  name: string;
  trigger: string;
  channels: string[];
  template: string;
  active: boolean;
  createdAt: string;
}

interface LogEntry {
  id: string;
  templateName: string;
  channel: string;
  eventType: string;
  recipientName: string;
  recipientContact: string;
  status: string;
  message: string;
  sentAt: string;
  error?: string;
}

export default function NotificationsPage() {
  const { isStaff, loading: roleLoading } = useRole();
  const [activeTab, setActiveTab] = useState<
    "activity" | "templates" | "logs"
  >("activity");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logStats, setLogStats] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(
    null
  );
  const [channelFilter, setChannelFilter] = useState<string>("all");

  // Activity Feed hook
  const {
    notifications: feedNotifications,
    unreadCount: feedUnreadCount,
    loading: feedLoading,
    markAsRead: feedMarkAsRead,
    markAllAsRead: feedMarkAllAsRead,
  } = useAppNotifications();

  // Pagination
  const [visibleCount, setVisibleCount] = useState(20);
  const visibleNotifications = feedNotifications.slice(0, visibleCount);
  const hasMore = feedNotifications.length > visibleCount;

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications/templates");
      const json = await res.json();
      if (json.success) setTemplates(json.data);
    } catch {
      toast.error("Failed to fetch templates");
    }
  }, []);

  const fetchLogs = useCallback(
    async (channel?: string) => {
      try {
        const filterParam = channel || channelFilter;
        const url =
          filterParam && filterParam !== "all"
            ? `/api/v1/notifications/logs?channel=${filterParam}`
            : "/api/v1/notifications/logs";
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          setLogs(json.data.logs);
          setLogStats(json.data.stats);
        }
      } catch {
        toast.error("Failed to fetch logs");
      }
    },
    [channelFilter]
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchLogs()]);
      setLoading(false);
    };
    loadData();
  }, [fetchTemplates, fetchLogs]);

  const toggleTemplate = async (id: string, active: boolean) => {
    try {
      const res = await fetch("/api/v1/notifications/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !active }),
      });
      const json = await res.json();
      if (json.success) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === id ? { ...t, active: !active } : t))
        );
        toast.success(`Template ${!active ? "activated" : "deactivated"}`);
      }
    } catch {
      toast.error("Failed to update template");
    }
  };

  // Block staff
  if (!roleLoading && isStaff) {
    return (
      <AccessDenied
        title="Notifications Access Restricted"
        description="Notification management is only accessible to business owners."
      />
    );
  }

  const channelIcons: Record<
    string,
    { icon: typeof MessageCircle; color: string; label: string }
  > = {
    whatsapp: { icon: MessageCircle, color: "#25d366", label: "WhatsApp" },
    telegram: { icon: Send, color: "#0088cc", label: "Telegram" },
    email: { icon: Mail, color: "#a78bfa", label: "Email" },
    sms: { icon: Phone, color: "#38bdf8", label: "SMS" },
  };

  const eventTypeLabels: Record<string, string> = {
    order_status_update: "Order Status",
    invoice_generated: "Invoice",
    payment_reminder: "Payment",
    low_stock_alert: "Low Stock",
    production_complete: "Production",
  };

  const handleChannelFilter = (value: string) => {
    setChannelFilter(value);
    fetchLogs(value);
  };

  const activeTemplates = templates.filter((t) => t.active).length;

  // ── Group feed notifications by date ──
  const groupedNotifications: { label: string; items: typeof visibleNotifications }[] = [];
  const seenGroups = new Set<string>();
  for (const n of visibleNotifications) {
    const group = getDateGroup(n.createdAt);
    if (!seenGroups.has(group)) {
      seenGroups.add(group);
      groupedNotifications.push({
        label: group,
        items: visibleNotifications.filter(
          (item) => getDateGroup(item.createdAt) === group
        ),
      });
    }
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 ind-page bg-[#F1F4F9] dark:bg-transparent min-h-screen -m-6 p-6"
    >
      {/* ── Header ── */}
      <motion.div variants={staggerItem}>
        <div className="ind-page-header" style={{ marginBottom: 0 }}>
          <div className="ind-label">
            <span
              className="ind-pulse-dot"
              style={{ background: "var(--ind-green)" }}
            />
            Notification Engine
          </div>
          <h1>Notifications</h1>
          <p className="ind-subtitle">
            Manage templates, channels, and delivery status for automated
            messaging.
          </p>
        </div>
      </motion.div>

      {/* ── Channel Grid ── */}
      <motion.div variants={staggerItem}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(channelIcons).map(([key, ch]) => (
            <div key={key} className="ind-card shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] dark:shadow-none" style={{ padding: 16 }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center"
                  style={{ background: `${ch.color}15` }}
                >
                  <ch.icon
                    className="h-[16px] w-[16px]"
                    style={{ color: ch.color }}
                  />
                </div>
                <div>
                  <span
                    className="text-[14px] font-semibold block"
                    style={{ color: "var(--ind-text)" }}
                  >
                    {ch.label}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--ind-text-muted)" }}
                  >
                    {
                      templates.filter(
                        (t) => t.active && t.channels.includes(key)
                      ).length
                    }{" "}
                    active rules
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Stats Row ── */}
      <div className="kpi-panel">
        <div className="kpi-panel__glow"></div>
        <div className="kpi-grid !grid-cols-1 md:!grid-cols-3">
          <StatWidget
            label="Active Rules"
            value={activeTemplates}
            change={0}
            icon={Settings}
            color="purple"
            delay={0}
          />
          <StatWidget
            label="Sent Today"
            value={(logStats.sentToday as number) || 0}
            change={0}
            icon={Send}
            color="blue"
            delay={1}
          />
          <StatWidget
            label="Failed"
            value={(logStats.failed as number) || 0}
            change={0}
            icon={XCircle}
            color="red"
            delay={2}
          />
        </div>
      </div>

      {/* ── Tab Control ── */}
      <motion.div variants={staggerItem}>
        <div className="ind-pill-tabs">
          <button
            className={cn(
              "ind-pill-tab",
              activeTab === "activity" && "active"
            )}
            onClick={() => setActiveTab("activity")}
          >
            Activity Feed
            {feedUnreadCount > 0 && (
              <span className="ml-1.5 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1 bg-[var(--accent-red,#EF4444)] text-white">
                {feedUnreadCount}
              </span>
            )}
          </button>
          <button
            className={cn(
              "ind-pill-tab",
              activeTab === "templates" && "active"
            )}
            onClick={() => setActiveTab("templates")}
          >
            Templates
          </button>
          <button
            className={cn(
              "ind-pill-tab",
              activeTab === "logs" && "active"
            )}
            onClick={() => setActiveTab("logs")}
          >
            Dispatch Logs
          </button>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          ── Tab: Activity Feed ──
          ══════════════════════════════════════════════════════════ */}
      {activeTab === "activity" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p
                className="text-[13px] font-medium"
                style={{ color: "var(--ind-text-muted)" }}
              >
                {feedNotifications.length} notification
                {feedNotifications.length !== 1 ? "s" : ""}
              </p>
            </div>
            {feedUnreadCount > 0 && (
              <button
                onClick={() => {
                  feedMarkAllAsRead();
                  toast.success("All notifications marked as read");
                }}
                className="text-[12px] font-medium flex items-center gap-1 cursor-pointer text-[var(--accent-blue,#007AFF)] hover:opacity-70 transition-opacity px-2 py-1.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <IOSCard variant="elevated" padding="none" className="overflow-hidden bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] dark:shadow-none">
            <div>
              {feedLoading ? (
                /* ── Loading skeleton ── */
                <div className="divide-y" style={{ borderColor: "var(--ind-border)" }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-4 py-3.5"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2 py-0.5">
                        <div className="h-3.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-lg w-4/5 animate-pulse" />
                        <div className="h-3 bg-black/[0.04] dark:bg-white/[0.04] rounded-lg w-3/5 animate-pulse" />
                        <div className="h-2.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-lg w-1/4 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : feedNotifications.length === 0 ? (
                /* ── Empty state ── */
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.04]">
                    <Bell
                      size={24}
                      strokeWidth={1.5}
                      className="text-[#94A3B8]"
                    />
                  </div>
                  <p className="text-[15px] font-medium text-[#111827] dark:text-[#F8FAFC]">
                    No activity yet
                  </p>
                  <p className="text-[13px] text-[#6B7280] dark:text-[#94A3B8] text-center max-w-[240px]">
                    Notifications from orders, payments, and inventory will
                    appear here
                  </p>
                </div>
              ) : (
                /* ── Grouped notification list ── */
                <div className="py-1">
                  {groupedNotifications.map((group) => (
                    <div key={group.label}>
                      <DateGroupHeader label={group.label} />
                      {group.items.map((n) => (
                        <NotificationFeedItem
                          key={n.id}
                          notification={n}
                          onMarkRead={feedMarkAsRead}
                        />
                      ))}
                    </div>
                  ))}

                  {/* Load More */}
                  {hasMore && (
                    <button
                      onClick={() => setVisibleCount((c) => c + 20)}
                      className="w-full py-3 text-[13px] text-[#6B7280] dark:text-white/40 hover:text-[#111827] dark:hover:text-white/70 transition-colors"
                    >
                      Show{" "}
                      {feedNotifications.length - visibleCount} older
                      notifications
                    </button>
                  )}
                </div>
              )}
            </div>
          </IOSCard>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ── Tab: Templates ──  (UNCHANGED content)
          ══════════════════════════════════════════════════════════ */}
      {activeTab === "templates" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[80px] rounded-lg bg-muted animate-pulse"
              />
            ))
          ) : (
            <>
              {templates.map((tmpl, idx) => {
                const isExpanded = expandedTemplate === tmpl.id;
                return (
                  <motion.div
                    key={tmpl.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={cn(
                      "ind-card shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] dark:shadow-none",
                      tmpl.active && "ind-card--glow-purple"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() =>
                          setExpandedTemplate(isExpanded ? null : tmpl.id)
                        }
                      >
                        <div
                          className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center"
                          style={{
                            background: tmpl.active
                              ? "rgba(167,139,250,0.1)"
                              : "var(--ind-input-bg)",
                          }}
                        >
                          <Bell
                            className="h-[16px] w-[16px]"
                            style={{
                              color: tmpl.active
                                ? "var(--ind-purple)"
                                : "var(--ind-text-muted)",
                            }}
                          />
                        </div>
                        <div>
                          <span
                            className="text-[14px] font-semibold block"
                            style={{ color: "var(--ind-text)" }}
                          >
                            {tmpl.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            {tmpl.channels.map((ch) => (
                              <span
                                key={ch}
                                className={`ind-chip ind-chip--${ch}`}
                              >
                                {ch}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Toggle */}
                      <div
                        className={cn(
                          "ind-toggle",
                          tmpl.active && "active"
                        )}
                        onClick={() =>
                          toggleTemplate(tmpl.id, tmpl.active)
                        }
                      />
                    </div>

                    {/* Expanded Preview */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.25 }}
                        className="mt-4 pt-3"
                        style={{
                          borderTop: "1px solid var(--ind-border)",
                        }}
                      >
                        <p
                          className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                          style={{ color: "var(--ind-text-muted)" }}
                        >
                          Message Preview
                        </p>
                        <div className="ind-code-box">{tmpl.template}</div>
                        <p
                          className="text-[11px] mt-3"
                          style={{ color: "var(--ind-text-muted)" }}
                        >
                          Trigger:{" "}
                          <strong>
                            {tmpl.trigger.replace(/_/g, " ")}
                          </strong>
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}

              {/* Add New Template */}
              <button className="ind-add-btn">
                <Plus className="h-4 w-4" /> Add New Template
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ── Tab: Dispatch Logs ──  (renamed from "Activity Log")
          ══════════════════════════════════════════════════════════ */}
      {activeTab === "logs" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {/* ── Channel Filter ── */}
          <div className="flex items-center justify-between">
            <p
              className="text-[13px] font-medium"
              style={{ color: "var(--ind-text-muted)" }}
            >
              {logs.length} notification{logs.length !== 1 ? "s" : ""}
            </p>
            <div className="relative">
              <select
                id="channel-filter"
                value={channelFilter}
                onChange={(e) => handleChannelFilter(e.target.value)}
                className="ind-select appearance-none pr-8 pl-3 py-1.5 text-[13px] rounded-[10px] font-medium"
                style={{
                  background: "var(--ind-input-bg)",
                  color: "var(--ind-text)",
                  border: "1px solid var(--ind-border)",
                  minWidth: 130,
                }}
              >
                <option value="all">All Channels</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
                style={{ color: "var(--ind-text-muted)" }}
              />
            </div>
          </div>

          <IOSCard
            variant="elevated"
            padding="none"
            className="overflow-hidden bg-white dark:bg-[var(--card)] !border !border-black/[0.09] dark:!border-[var(--border)] shadow-[0_1px_4px_rgba(15,23,42,0.07),0_4px_16px_rgba(15,23,42,0.05)] dark:shadow-none"
          >
            <div
              className="divide-y"
              style={{ borderColor: "var(--ind-border)" }}
            >
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div
                    className="w-[48px] h-[48px] rounded-[14px] flex items-center justify-center mb-3"
                    style={{ background: "var(--ind-input-bg)" }}
                  >
                    <Activity
                      className="h-5 w-5"
                      style={{ color: "var(--ind-text-muted)" }}
                    />
                  </div>
                  <p
                    className="text-[15px] font-medium"
                    style={{ color: "var(--ind-text)" }}
                  >
                    No dispatch history yet
                  </p>
                  <p
                    className="text-[13px]"
                    style={{ color: "var(--ind-text-muted)" }}
                  >
                    {channelFilter !== "all"
                      ? `No ${channelFilter} notifications found`
                      : "Dispatched messages will appear here as notifications are sent"}
                  </p>
                </div>
              ) : (
                logs.map((log, idx) => {
                  const ch =
                    channelIcons[log.channel] || channelIcons.email;
                  const eventLabel =
                    eventTypeLabels[log.eventType] || log.eventType;
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      <div
                        className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center flex-shrink-0"
                        style={{ background: `${ch.color}15` }}
                      >
                        <ch.icon
                          className="h-[14px] w-[14px]"
                          style={{ color: ch.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[13px] font-semibold truncate"
                            style={{ color: "var(--ind-text)" }}
                          >
                            {log.templateName}
                          </span>
                          <span
                            className="ind-chip text-[9px] px-1.5 py-0.5 flex-shrink-0"
                            style={{
                              background: "var(--ind-input-bg)",
                              color: "var(--ind-text-muted)",
                              borderRadius: 6,
                            }}
                          >
                            {eventLabel}
                          </span>
                        </div>
                        <span
                          className="text-[11px] block"
                          style={{ color: "var(--ind-text-muted)" }}
                        >
                          to {log.recipientName}
                          {log.recipientContact
                            ? ` (${log.recipientContact})`
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={cn("ind-badge", {
                            "ind-badge--green":
                              log.status === "sent" ||
                              log.status === "delivered",
                            "ind-badge--red": log.status === "failed",
                            "ind-badge--orange":
                              log.status === "pending",
                          })}
                        >
                          {log.status === "sent" ||
                          log.status === "delivered" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : log.status === "failed" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {log.status}
                        </span>
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--ind-text-muted)" }}
                        >
                          {new Date(log.sentAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </IOSCard>
        </motion.div>
      )}
    </motion.div>
  );
}
