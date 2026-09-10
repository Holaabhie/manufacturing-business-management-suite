const fs = require('fs');

const file = 'apps/web/src/app/dashboard/notifications/page.tsx';
let raw = fs.readFileSync(file, 'utf8');
const isCrlf = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

// 1. Imports
if (!code.includes('useAppLocale')) {
  code = code.replace(
    'import { useTranslations } from "next-intl";',
    'import { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";'
  );
}

// 2. Component hooks
const oldCompStart = `export default function NotificationsPage() {
  const tCommon = useTranslations("common");
  const { isStaff, loading: roleLoading } = useRole();`;

const newCompStart = `export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const { locale } = useAppLocale();
  const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";
  const { isStaff, loading: roleLoading } = useRole();`;

code = code.replace(oldCompStart, newCompStart);

// 3. Toasts
code = code.replace('toast.error("Failed to fetch templates");', 'toast.error(t("toasts.fetchTemplatesFailed"));');
code = code.replace('toast.error("Failed to fetch logs");', 'toast.error(t("toasts.fetchLogsFailed"));');
code = code.replace('toast.success(`Template ${!active ? "activated" : "deactivated"}`);', 'toast.success(!active ? t("toasts.templateActivated") : t("toasts.templateDeactivated"));');
code = code.replace('toast.error("Failed to update template");', 'toast.error(t("toasts.updateTemplateFailed"));');
code = code.replace('toast.success("Message copied — paste it in Telegram");', 'toast.success(t("toasts.telegramCopied"));');
code = code.replace('toast.error("Failed to update log status");', 'toast.error(t("toasts.updateLogFailed"));');
code = code.replace('toast.error("Action failed");', 'toast.error(t("toasts.actionFailed"));');
code = code.replace('toast.success("All notifications marked as read");', 'toast.success(t("toasts.allMarkedRead"));');

// 4. Event types map
const oldEventTypes = `  const eventTypeLabels: Record<string, string> = {
    order_status_update: "Order Status",
    invoice_generated: "Invoice",
    payment_reminder: "Payment",
    low_stock_alert: "Low Stock",
    production_complete: "Production",
  };`;

const newEventTypes = `  const eventTypeLabels: Record<string, string> = {
    order_status_update: t("eventOrderStatus"),
    invoice_generated: t("eventInvoice"),
    payment_reminder: t("eventPayment"),
    low_stock_alert: t("eventLowStock"),
    production_complete: t("eventProduction"),
  };`;

code = code.replace(oldEventTypes, newEventTypes);

// 5. Page root container layout containment (AGENTS.md)
code = code.replace(
  'className="space-y-6 ind-page bg-[#F1F4F9] dark:bg-transparent -m-6 p-6"',
  'className="w-full min-w-0 overflow-x-hidden space-y-6 ind-page bg-[#F1F4F9] dark:bg-transparent -m-6 p-6"'
);

// 6. Header
code = code.replace(
  '<span\n              className="ind-pulse-dot"\n              style={{ background: "var(--ind-green)" }}\n            />\n            Notification Engine',
  '<span\n              className="ind-pulse-dot"\n              style={{ background: "var(--ind-green)" }}\n            />\n            {t("headerBadge")}'
);
code = code.replace('<h1>Notifications</h1>', '<h1>{t("title")}</h1>');
code = code.replace(
  '<p className="ind-subtitle">\n            Manage templates, channels, and delivery status for automated\n            messaging.\n          </p>',
  '<p className="ind-subtitle">\n            {t("subtitle")}\n          </p>'
);

// 7. Channel Grid rules count
const oldChannelRules = `                  <span
                    className="text-[11px]"
                    style={{ color: "var(--ind-text-muted)" }}
                  >
                    {
                      templates.filter(
                        (t) => t.active && t.channels.includes(key)
                      ).length
                    }{" "}
                    active rules
                  </span>`;

const newChannelRules = `                  <span
                    className="text-[11px]"
                    style={{ color: "var(--ind-text-muted)" }}
                  >
                    {t("activeRulesCount", {
                      count: templates.filter(
                        (t) => t.active && t.channels.includes(key)
                      ).length,
                    })}
                  </span>`;

code = code.replace(oldChannelRules, newChannelRules);

// 8. Stats Row (KPIs)
code = code.replace('label="Active Rules"', 'label={t("kpiActiveRules")}');
code = code.replace('label="Sent Today"', 'label={t("kpiSentToday")}');
code = code.replace('label="Failed"', 'label={t("kpiFailed")}');

// 9. Tab Control
code = code.replace(
  'Activity Feed\n            {feedUnreadCount > 0 && (',
  '{t("tabActivity")}\n            {feedUnreadCount > 0 && ('
);
code = code.replace(
  '>\n            Templates\n          </button>',
  '>\n            {t("tabTemplates")}\n          </button>'
);
code = code.replace(
  '>\n            Dispatch Logs\n          </button>',
  '>\n            {t("tabLogs")}\n          </button>'
);

// 10. Activity Feed Header
code = code.replace(
  '{feedNotifications.length} notification\n                {feedNotifications.length !== 1 ? "s" : ""}',
  '{t("notificationsCount", { count: feedNotifications.length })}'
);
code = code.replace(
  '<CheckCheck className="h-3.5 w-3.5" />\n                Mark all read',
  '<CheckCheck className="h-3.5 w-3.5" />\n                {t("markAllRead")}'
);

// 11. Activity Feed Empty state
code = code.replace(
  '<p className="text-[15px] font-medium text-[#111827] dark:text-[#F8FAFC]">\n                    No activity yet\n                  </p>',
  '<p className="text-[15px] font-medium text-[#111827] dark:text-[#F8FAFC]">\n                    {t("feedEmptyTitle")}\n                  </p>'
);
code = code.replace(
  '<p className="text-[13px] text-[#6B7280] dark:text-[#94A3B8] text-center max-w-[240px]">\n                    Notifications from orders, payments, and inventory will\n                    appear here\n                  </p>',
  '<p className="text-[13px] text-[#6B7280] dark:text-[#94A3B8] text-center max-w-[240px]">\n                    {t("feedEmptyDesc")}\n                  </p>'
);

// 12. Load More button in Activity Feed
code = code.replace(
  'Show{" "}\n                      {feedNotifications.length - visibleCount} older\n                      notifications',
  '{t("showOlderNotifications", { count: feedNotifications.length - visibleCount })}'
);

// 13. Templates Tab
code = code.replace(
  'Message Preview\n                        </p>',
  '{t("tmplPreview")}\n                        </p>'
);
code = code.replace(
  'Trigger:{" "}\n                          <strong>\n                            {tmpl.trigger.replace(/_/g, " ")}\n                          </strong>',
  '{t("tmplTrigger", { trigger: tmpl.trigger.replace(/_/g, " ") })}'
);
code = code.replace(
  '<Plus className="h-4 w-4" /> Add New Template',
  '<Plus className="h-4 w-4" /> {t("btnAddTemplate")}'
);

// 14. Dispatch Logs Tab
code = code.replace(
  '{logs.length} notification{logs.length !== 1 ? "s" : ""}',
  '{t("notificationsCount", { count: logs.length })}'
);
code = code.replace(
  '<option value="all">All Channels</option>',
  '<option value="all">{t("filterAllChannels")}</option>'
);

// 15. Dispatch Logs Empty state
code = code.replace(
  '<p\n                    className="text-[15px] font-medium"\n                    style={{ color: "var(--ind-text)" }}\n                  >\n                    No dispatch history yet\n                  </p>',
  '<p\n                    className="text-[15px] font-medium"\n                    style={{ color: "var(--ind-text)" }}\n                  >\n                    {t("logsEmptyTitle")}\n                  </p>'
);
code = code.replace(
  '{channelFilter !== "all"\n                      ? `No ${channelFilter} notifications found`\n                      : "Dispatched messages will appear here as notifications are sent"}',
  '{channelFilter !== "all" ? t("logsEmptyFiltered", { channel: channelFilter }) : t("logsEmptyAll")}'
);

// 16. Dispatch Log Row
code = code.replace(
  '<span\n                          className="text-[11px] block"\n                          style={{ color: "var(--ind-text-muted)" }}\n                        >\n                          to {log.recipientName}\n                          {log.recipientContact\n                            ? ` (${log.recipientContact})`\n                            : ""}\n                        </span>',
  '<span\n                          className="text-[11px] block"\n                          style={{ color: "var(--ind-text-muted)" }}\n                        >\n                          {t("logTo", { name: log.recipientName })}\n                          {log.recipientContact\n                            ? ` (${log.recipientContact})`\n                            : ""}\n                        </span>'
);

code = code.replace(
  '{log.status}\n                        </span>',
  '{(log.status === "sent" ? t("statusSent") : log.status === "delivered" ? t("statusDelivered") : log.status === "failed" ? t("statusFailed") : log.status === "pending" ? t("statusPending") : log.status === "queued" ? t("statusQueued") : log.status)}\n                        </span>'
);

code = code.replace(
  `title={
                              !log.recipientContact &&
                              log.channel?.toLowerCase() !== "telegram"
                                ? "No contact info available"
                                : log.channel?.toLowerCase() === "telegram"
                                  ? "Copy message"
                                  : "Send now"
                            }`,
  `title={
                              !log.recipientContact &&
                              log.channel?.toLowerCase() !== "telegram"
                                ? t("tooltipNoContact")
                                : log.channel?.toLowerCase() === "telegram"
                                  ? t("tooltipCopy")
                                  : t("tooltipSend")
                            }`
);

code = code.replace(
  `{new Date(log.sentAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}`,
  `{new Date(log.sentAt).toLocaleDateString(
                            dateLocale,
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}`
);

if (isCrlf) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully transformed apps/web/src/app/dashboard/notifications/page.tsx!');
