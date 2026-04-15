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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IOSCard, IOSCardContent, IOSCardHeader } from "@/components/ui/ios/IOSCard";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { StatWidget } from "@/components/ui/StatWidget";
import { useRole } from "@/lib/hooks/use-role";
import { AccessDenied } from "@/components/AccessDenied";

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
  recipientName: string;
  status: string;
  message: string;
  sentAt: string;
  error?: string;
}

export default function NotificationsPage() {
  const { isStaff, loading: roleLoading } = useRole();
  const [activeTab, setActiveTab] = useState<"templates" | "logs">("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logStats, setLogStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications/templates");
      const json = await res.json();
      if (json.success) setTemplates(json.data);
    } catch {
      toast.error("Failed to fetch templates");
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications/logs");
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
        setLogStats(json.data.stats);
      }
    } catch {
      toast.error("Failed to fetch logs");
    }
  }, []);

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

  const channelIcons: Record<string, { icon: any; color: string; label: string }> = {
    whatsapp: { icon: MessageCircle, color: "#25d366", label: "WhatsApp" },
    telegram: { icon: Send, color: "#0088cc", label: "Telegram" },
    email: { icon: Mail, color: "#a78bfa", label: "Email" },
    sms: { icon: Phone, color: "#38bdf8", label: "SMS" },
  };

  const activeTemplates = templates.filter((t) => t.active).length;

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6 ind-page">
      {/* ── Header ── */}
      <motion.div variants={staggerItem}>
        <div className="ind-page-header" style={{ marginBottom: 0 }}>
          <div className="ind-label">
            <span className="ind-pulse-dot" style={{ background: "var(--ind-green)" }} />
            Notification Engine
          </div>
          <h1>Notifications</h1>
          <p className="ind-subtitle">
            Manage templates, channels, and delivery status for automated messaging.
          </p>
        </div>
      </motion.div>

      {/* ── Channel Grid ── */}
      <motion.div variants={staggerItem}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(channelIcons).map(([key, ch]) => (
            <div key={key} className="ind-card" style={{ padding: 16 }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center"
                  style={{ background: `${ch.color}15` }}
                >
                  <ch.icon className="h-[16px] w-[16px]" style={{ color: ch.color }} />
                </div>
                <div>
                  <span className="text-[14px] font-semibold block" style={{ color: "var(--ind-text)" }}>
                    {ch.label}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--ind-text-muted)" }}>
                    {templates.filter((t) => t.active && t.channels.includes(key)).length} active rules
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
          <StatWidget label="Active Rules" value={activeTemplates} change={0} icon={Settings} color="purple" delay={0} />
          <StatWidget label="Sent Today" value={logStats.sentToday || 0} change={0} icon={Send} color="blue" delay={1} />
          <StatWidget label="Failed" value={logStats.failed || 0} change={0} icon={XCircle} color="red" delay={2} />
        </div>
      </div>

      {/* ── Tab Control ── */}
      <motion.div variants={staggerItem}>
        <div className="ind-pill-tabs">
          <button
            className={cn("ind-pill-tab", activeTab === "templates" && "active")}
            onClick={() => setActiveTab("templates")}
          >
            Templates
          </button>
          <button
            className={cn("ind-pill-tab", activeTab === "logs" && "active")}
            onClick={() => setActiveTab("logs")}
          >
            Activity Log
          </button>
        </div>
      </motion.div>

      {/* ── Tab: Templates ── */}
      {activeTab === "templates" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[80px] rounded-[16px] bg-[var(--fill-tertiary)] shimmer" />
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
                    className={cn("ind-card", tmpl.active && "ind-card--glow-purple")}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => setExpandedTemplate(isExpanded ? null : tmpl.id)}
                      >
                        <div
                          className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center"
                          style={{
                            background: tmpl.active ? "rgba(167,139,250,0.1)" : "var(--ind-input-bg)",
                          }}
                        >
                          <Bell
                            className="h-[16px] w-[16px]"
                            style={{ color: tmpl.active ? "var(--ind-purple)" : "var(--ind-text-muted)" }}
                          />
                        </div>
                        <div>
                          <span className="text-[14px] font-semibold block" style={{ color: "var(--ind-text)" }}>
                            {tmpl.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            {tmpl.channels.map((ch) => (
                              <span key={ch} className={`ind-chip ind-chip--${ch}`}>
                                {ch}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Toggle */}
                      <div
                        className={cn("ind-toggle", tmpl.active && "active")}
                        onClick={() => toggleTemplate(tmpl.id, tmpl.active)}
                      />
                    </div>

                    {/* Expanded Preview */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.25 }}
                        className="mt-4 pt-3"
                        style={{ borderTop: "1px solid var(--ind-border)" }}
                      >
                        <p
                          className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                          style={{ color: "var(--ind-text-muted)" }}
                        >
                          Message Preview
                        </p>
                        <div className="ind-code-box">{tmpl.template}</div>
                        <p className="text-[11px] mt-3" style={{ color: "var(--ind-text-muted)" }}>
                          Trigger: <strong>{tmpl.trigger.replace(/_/g, " ")}</strong>
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

      {/* ── Tab: Activity Log ── */}
      {activeTab === "logs" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <IOSCard variant="elevated" padding="none" className="overflow-hidden">
            <div className="divide-y" style={{ borderColor: "var(--ind-border)" }}>
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div
                    className="w-[48px] h-[48px] rounded-[14px] flex items-center justify-center mb-3"
                    style={{ background: "var(--ind-input-bg)" }}
                  >
                    <Activity className="h-5 w-5" style={{ color: "var(--ind-text-muted)" }} />
                  </div>
                  <p className="text-[15px] font-medium" style={{ color: "var(--ind-text)" }}>
                    No notification history yet
                  </p>
                  <p className="text-[13px]" style={{ color: "var(--ind-text-muted)" }}>
                    Activity will appear here as notifications are sent
                  </p>
                </div>
              ) : (
                logs.map((log) => {
                  const ch = channelIcons[log.channel] || channelIcons.email;
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div
                        className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center flex-shrink-0"
                        style={{ background: `${ch.color}15` }}
                      >
                        <ch.icon className="h-[14px] w-[14px]" style={{ color: ch.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-semibold block truncate" style={{ color: "var(--ind-text)" }}>
                          {log.templateName}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--ind-text-muted)" }}>
                          to {log.recipientName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={cn("ind-badge", {
                            "ind-badge--green": log.status === "sent" || log.status === "delivered",
                            "ind-badge--red": log.status === "failed",
                            "ind-badge--orange": log.status === "pending",
                          })}
                        >
                          {log.status === "sent" || log.status === "delivered" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : log.status === "failed" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {log.status}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--ind-text-muted)" }}>
                          {new Date(log.sentAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
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
