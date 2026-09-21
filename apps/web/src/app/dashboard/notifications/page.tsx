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
  ExternalLink,
  Copy,
  Loader2,
} from "lucide-react";
import {
  buildWhatsAppLink,
  buildEmailLink,
  buildSmsLink,
} from "@/lib/notifications/deepLinks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IOSCard } from "@/components/ui/ios/IOSCard";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { StatWidget } from "@/components/ui/StatWidget";
import { useRole } from "@/lib/hooks/use-role";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/components/LocaleProvider";
import { AccessDenied } from "@/components/AccessDenied";
import { useAppNotifications } from "@/lib/hooks/use-app-notifications";
import {
  NotificationFeedItem,
  DateGroupHeader,
  getDateGroup,
} from "@/components/notifications/NotificationFeedItem";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { IOSInput } from "@/components/ui/ios/IOSFormElements";

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
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const { locale } = useAppLocale();
  const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";
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

  // Add Template modal state
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formTrigger, setFormTrigger] = useState("order_status_change");
  const [formChannels, setFormChannels] = useState<string[]>([
    "whatsapp",
    "telegram",
  ]);
  const [formTemplate, setFormTemplate] = useState("");
  const [formWhatsappContent, setFormWhatsappContent] = useState("");
  const [formTelegramContent, setFormTelegramContent] = useState("");
  const [formEmailSubject, setFormEmailSubject] = useState("");
  const [formEmailBody, setFormEmailBody] = useState("");
  const [formSmsContent, setFormSmsContent] = useState("");
  const [formVariables, setFormVariables] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [nameError, setNameError] = useState(false);

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
      toast.error(t("toasts.fetchTemplatesFailed"));
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
        toast.error(t("toasts.fetchLogsFailed"));
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
        toast.success(!active ? t("toasts.templateActivated") : t("toasts.templateDeactivated"));
      }
    } catch {
      toast.error(t("toasts.updateTemplateFailed"));
    }
  };

  const openAddTemplate = () => {
    setFormName("");
    setNameError(false);
    setFormTrigger("order_status_change");
    setFormChannels(["whatsapp", "telegram"]);
    setFormTemplate("");
    setFormWhatsappContent("");
    setFormTelegramContent("");
    setFormEmailSubject("");
    setFormEmailBody("");
    setFormSmsContent("");
    setFormVariables("");
    setFormActive(true);
    setAddTemplateOpen(true);
  };

  const toggleChannel = (ch: string) => {
    setFormChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleSaveTemplate = async () => {
    if (!formName.trim()) {
      setNameError(true);
      toast.error(t("toasts.nameRequired"));
      return;
    }
    setNameError(false);
    setSavingTemplate(true);
    try {
      const vars = formVariables
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const res = await fetch("/api/v1/notifications/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          trigger: formTrigger,
          channels: formChannels.length > 0 ? formChannels : ["whatsapp"],
          template: formTemplate,
          whatsappContent: formChannels.includes("whatsapp") ? formWhatsappContent : undefined,
          telegramContent: formChannels.includes("telegram") ? formTelegramContent : undefined,
          emailSubject: formChannels.includes("email") ? formEmailSubject : undefined,
          emailBody: formChannels.includes("email") ? formEmailBody : undefined,
          smsContent: formChannels.includes("sms") ? formSmsContent : undefined,
          variables: vars,
          active: formActive,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(t("toasts.templateCreated"));
        setAddTemplateOpen(false);
        fetchTemplates();
      } else {
        toast.error(data.error?.message || t("toasts.templateCreateFailed"));
      }
    } catch {
      toast.error(t("toasts.templateCreateFailed"));
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDispatchSend = async (log: LogEntry) => {
    try {
      const ch = log.channel?.toLowerCase();
      if (ch === "telegram") {
        await navigator.clipboard.writeText(log.message || "");
        toast.success(t("toasts.telegramCopied"));
      } else {
        let url = "";
        if (ch === "whatsapp") {
          url = buildWhatsAppLink(log.recipientContact || "", log.message || "");
        } else if (ch === "email") {
          url = buildEmailLink(log.recipientContact || "", log.templateName || "Notification", log.message || "");
        } else if (ch === "sms") {
          url = buildSmsLink(log.recipientContact || "", log.message || "");
        }
        if (url) window.open(url, "_blank");
      }

      // Optimistically update status to "dispatched"
      setLogs((prev) =>
        prev.map((l) => (l.id === log.id ? { ...l, status: "dispatched" } : l)),
      );

      // Persist via PATCH
      fetch("/api/v1/notifications/logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: log.id, status: "dispatched" }),
      }).catch(() => {
        // Revert on failure
        setLogs((prev) =>
          prev.map((l) => (l.id === log.id ? { ...l, status: log.status } : l)),
        );
        toast.error(t("toasts.updateLogFailed"));
      });
    } catch {
      toast.error(t("toasts.actionFailed"));
    }
  };

  // Block staff
  if (!roleLoading && isStaff) {
    return (
      <AccessDenied
        title={tCommon("notificationsAccessRestricted")}
        description={tCommon("notificationsAccessRestrictedDesc")}
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
    order_status_update: t("eventOrderStatus"),
    invoice_generated: t("eventInvoice"),
    payment_reminder: t("eventPayment"),
    low_stock_alert: t("eventLowStock"),
    production_complete: t("eventProduction"),
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
      className="w-full min-w-0 overflow-x-hidden space-y-6 ind-page bg-[#F1F4F9] dark:bg-transparent -m-6 p-6"
    >
      {/* ── Header ── */}
      <motion.div variants={staggerItem}>
        <div className="ind-page-header" style={{ marginBottom: 0 }}>
          <div className="ind-label">
            <span
              className="ind-pulse-dot"
              style={{ background: "var(--ind-green)" }}
            />
            {t("headerBadge")}
          </div>
          <h1>{t("title")}</h1>
          <p className="ind-subtitle">
            {t("subtitle")}
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
                    {t("activeRulesCount", {
                      count: templates.filter(
                        (t) => t.active && t.channels.includes(key)
                      ).length,
                    })}
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
            label={t("kpiActiveRules")}
            value={activeTemplates}
            change={0}
            icon={Settings}
            color="purple"
            delay={0}
          />
          <StatWidget
            label={t("kpiSentToday")}
            value={(logStats.sentToday as number) || 0}
            change={0}
            icon={Send}
            color="blue"
            delay={1}
          />
          <StatWidget
            label={t("kpiFailed")}
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
            {t("tabActivity")}
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
            {t("tabTemplates")}
          </button>
          <button
            className={cn(
              "ind-pill-tab",
              activeTab === "logs" && "active"
            )}
            onClick={() => setActiveTab("logs")}
          >
            {t("tabLogs")}
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
                {t("notificationsCount", { count: feedNotifications.length })}
              </p>
            </div>
            {feedUnreadCount > 0 && (
              <button
                onClick={() => {
                  feedMarkAllAsRead();
                  toast.success(t("toasts.allMarkedRead"));
                }}
                className="text-[12px] font-medium flex items-center gap-1 cursor-pointer text-[var(--accent-blue,#007AFF)] hover:opacity-70 transition-opacity px-2 py-1.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("markAllRead")}
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
                    {t("feedEmptyTitle")}
                  </p>
                  <p className="text-[13px] text-[#6B7280] dark:text-[#94A3B8] text-center max-w-[240px]">
                    {t("feedEmptyDesc")}
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
                      {t("showOlderNotifications", { count: feedNotifications.length - visibleCount })}
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
                          {t("tmplPreview")}
                        </p>
                        <div className="ind-code-box">{tmpl.template}</div>
                        <p
                          className="text-[11px] mt-3"
                          style={{ color: "var(--ind-text-muted)" }}
                        >
                          {t("tmplTrigger", { trigger: tmpl.trigger.replace(/_/g, " ") })}
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}

              {/* Add New Template */}
              <button
                id="add-template-btn"
                onClick={openAddTemplate}
                className="ind-add-btn"
              >
                <Plus className="h-4 w-4" /> {t("btnAddTemplate")}
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
              {t("notificationsCount", { count: logs.length })}
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
                <option value="all">{t("filterAllChannels")}</option>
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
                    {t("logsEmptyTitle")}
                  </p>
                  <p
                    className="text-[13px]"
                    style={{ color: "var(--ind-text-muted)" }}
                  >
                    {channelFilter !== "all" ? t("logsEmptyFiltered", { channel: channelFilter }) : t("logsEmptyAll")}
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
                          {t("logTo", { name: log.recipientName })}
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
                            "ind-badge--blue": log.status === "dispatched",
                            "ind-badge--red": log.status === "failed",
                            "ind-badge--orange":
                              log.status === "pending",
                          })}
                        >
                          {log.status === "sent" ||
                          log.status === "delivered" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : log.status === "dispatched" ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : log.status === "failed" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {(log.status === "sent" ? t("statusSent") : log.status === "delivered" ? t("statusDelivered") : log.status === "dispatched" ? t("statusDispatched") : log.status === "failed" ? t("statusFailed") : log.status === "pending" ? t("statusPending") : log.status === "queued" ? t("statusQueued") : log.status)}
                        </span>
                        {/* ── Send action button ── */}
                        {(log.status === "queued" ||
                          log.status === "pending" ||
                          log.status === "failed") && (
                          <button
                            title={
                              !log.recipientContact &&
                              log.channel?.toLowerCase() !== "telegram"
                                ? t("tooltipNoContact")
                                : log.channel?.toLowerCase() === "telegram"
                                  ? t("tooltipCopy")
                                  : t("tooltipSend")
                            }
                            disabled={
                              !log.recipientContact &&
                              log.channel?.toLowerCase() !== "telegram"
                            }
                            onClick={() => handleDispatchSend(log)}
                            className="flex items-center justify-center w-[26px] h-[26px] rounded-[7px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--ind-input-bg)]"
                            style={{ color: "var(--ind-text-muted)" }}
                          >
                            {log.channel?.toLowerCase() === "telegram" ? (
                              <Copy className="h-3.5 w-3.5" />
                            ) : (
                              <ExternalLink className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--ind-text-muted)" }}
                        >
                          {new Date(log.sentAt).toLocaleDateString(
                            dateLocale,
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

      {/* ─── Add Template Dialog ─── */}
      <Dialog open={addTemplateOpen} onOpenChange={setAddTemplateOpen}>
        <DialogContent
          fullScreenMobile
          className="sm:max-w-[540px] bg-white/95 dark:bg-[rgba(28,28,30,0.95)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px] overflow-hidden p-0 flex flex-col md:max-h-[85dvh]"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(255,255,255,0.06))",
                  border: "1px solid rgba(255,255,255,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bell className="h-5 w-5 text-[#60a5fa]" />
              </div>
              <div>
                <DialogTitle
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--foreground)",
                    lineHeight: "22px",
                    margin: 0,
                  }}
                >
                  {t("addTemplateTitle")}
                </DialogTitle>
                <DialogDescription
                  style={{
                    fontSize: 13,
                    color: "var(--muted-foreground)",
                    lineHeight: "18px",
                    margin: "2px 0 0",
                  }}
                >
                  {t("addTemplateDesc")}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Form Scroll Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                {t("fieldName")} <span className="text-[#FF3B30]">*</span>
              </label>
              <IOSInput
                id="template-name-input"
                value={formName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormName(e.target.value);
                  if (nameError) setNameError(false);
                }}
                placeholder={t("placeholderName")}
                className={cn("h-[44px]", nameError && "!border-[#FF3B30] focus:!ring-[#FF3B30]/30")}
              />
              {nameError && (
                <p id="name-validation-error" className="text-[12px] text-[#FF3B30] font-medium ml-1">
                  {t("toasts.nameRequired")}
                </p>
              )}
            </div>

            {/* Trigger Event */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                {t("fieldTrigger")}
              </label>
              <div className="relative">
                <select
                  id="template-trigger-select"
                  value={formTrigger}
                  onChange={(e) => setFormTrigger(e.target.value)}
                  className="w-full h-[44px] px-4 rounded-[12px] bg-[var(--muted)] hover:bg-[var(--accent)] border border-[var(--border)] text-[14px] font-medium focus:ring-[3px] focus:ring-[#007AFF]/30 focus:border-[#007AFF] outline-none transition-all appearance-none text-[var(--foreground)]"
                >
                  <option value="order_status_change">{t("triggerOrderStatus")}</option>
                  <option value="invoice_created">{t("triggerInvoice")}</option>
                  <option value="payment_overdue">{t("triggerPayment")}</option>
                  <option value="stock_low">{t("triggerStock")}</option>
                  <option value="production_complete">{t("triggerProduction")}</option>
                  <option value="payment_critical">{t("triggerPaymentCritical")}</option>
                  <option value="custom">{t("triggerCustom")}</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-[var(--muted-foreground)]" />
              </div>
            </div>

            {/* Channels Multi-Select */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                {t("fieldChannels")}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#25d366" },
                  { id: "telegram", label: "Telegram", icon: Send, color: "#0088cc" },
                  { id: "email", label: "Email", icon: Mail, color: "#a78bfa" },
                  { id: "sms", label: "SMS", icon: Phone, color: "#38bdf8" },
                ].map((ch) => {
                  const selected = formChannels.includes(ch.id);
                  const Icon = ch.icon;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggleChannel(ch.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-[12px] border text-[13px] font-medium transition-all text-left",
                        selected
                          ? "border-[#007AFF] bg-[#007AFF]/10 text-[var(--foreground)]"
                          : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] opacity-70 hover:opacity-100"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: ch.color }} />
                      <span className="truncate">{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Default Message Template */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                {t("fieldTemplate")}
              </label>
              <textarea
                id="template-content-input"
                value={formTemplate}
                onChange={(e) => setFormTemplate(e.target.value)}
                placeholder={t.raw("placeholderTemplate")}
                rows={3}
                className="w-full px-4 py-3 rounded-[12px] bg-[var(--muted)] hover:bg-[var(--accent)] border border-[var(--border)] text-[14px] font-normal focus:ring-[3px] focus:ring-[#007AFF]/30 focus:border-[#007AFF] outline-none transition-all resize-none text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60"
              />
            </div>

            {/* Per-Channel Overrides */}
            {formChannels.includes("whatsapp") && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--muted-foreground)] ml-1 flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-[#25d366]" />
                  {t("labelWhatsappContent")}
                </label>
                <textarea
                  value={formWhatsappContent}
                  onChange={(e) => setFormWhatsappContent(e.target.value)}
                  placeholder="*Bold*, _italic_ formatted message for WhatsApp..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-[10px] bg-[var(--muted)] border border-[var(--border)] text-[13px] focus:ring-2 focus:ring-[#25d366]/30 outline-none resize-none text-[var(--foreground)]"
                />
              </div>
            )}

            {formChannels.includes("telegram") && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--muted-foreground)] ml-1 flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-[#0088cc]" />
                  {t("labelTelegramContent")}
                </label>
                <textarea
                  value={formTelegramContent}
                  onChange={(e) => setFormTelegramContent(e.target.value)}
                  placeholder="Markdown formatted message for Telegram..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-[10px] bg-[var(--muted)] border border-[var(--border)] text-[13px] focus:ring-2 focus:ring-[#0088cc]/30 outline-none resize-none text-[var(--foreground)]"
                />
              </div>
            )}

            {formChannels.includes("email") && (
              <div className="space-y-2 rounded-[12px] p-3 border border-[var(--border)] bg-[var(--muted)]/40">
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#a78bfa]" />
                    {t("labelEmailSubject")}
                  </label>
                  <IOSInput
                    value={formEmailSubject}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEmailSubject(e.target.value)}
                    placeholder="e.g. Order Status Update"
                    className="h-[38px] text-[13px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[var(--muted-foreground)]">
                    {t("labelEmailBody")}
                  </label>
                  <textarea
                    value={formEmailBody}
                    onChange={(e) => setFormEmailBody(e.target.value)}
                    placeholder="<p>HTML formatted email body...</p>"
                    rows={2}
                    className="w-full px-3 py-2 rounded-[10px] bg-[var(--muted)] border border-[var(--border)] text-[13px] focus:ring-2 focus:ring-[#a78bfa]/30 outline-none resize-none text-[var(--foreground)]"
                  />
                </div>
              </div>
            )}

            {formChannels.includes("sms") && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--muted-foreground)] ml-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#38bdf8]" />
                  {t("labelSmsContent")}
                </label>
                <input
                  type="text"
                  value={formSmsContent}
                  onChange={(e) => setFormSmsContent(e.target.value)}
                  placeholder="Plain text SMS (160 chars max)..."
                  className="w-full h-[38px] px-3 rounded-[10px] bg-[var(--muted)] border border-[var(--border)] text-[13px] focus:ring-2 focus:ring-[#38bdf8]/30 outline-none text-[var(--foreground)]"
                />
              </div>
            )}

            {/* Variables */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                {t("fieldVariables")}
              </label>
              <IOSInput
                id="template-variables-input"
                value={formVariables}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormVariables(e.target.value)}
                placeholder={t("placeholderVariables")}
                className="h-[44px]"
              />
              <p className="text-[11px] text-[var(--muted-foreground)] ml-1">
                Comma-separated: e.g. client_name, order_id, status
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-[13px] font-medium text-[var(--foreground)] ml-1">
                {t("fieldActive")}
              </label>
              <button
                type="button"
                onClick={() => setFormActive(!formActive)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  formActive ? "bg-[#34d399]" : "bg-[var(--muted)] border border-[var(--border)]"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    formActive ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 border-t border-[var(--border)] flex gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setAddTemplateOpen(false)}
              className="flex-1 h-12 rounded-[14px] bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)] text-[15px] font-semibold transition-opacity hover:opacity-80 cursor-pointer"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              id="save-template-btn"
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              className="flex-1 h-12 rounded-[14px] bg-gradient-to-r from-blue-600 to-blue-500 text-white border border-blue-400/30 shadow-[0_4px_16px_rgba(59,130,246,0.25)] text-[15px] font-semibold transition-opacity hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {savingTemplate && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("saveTemplate")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
