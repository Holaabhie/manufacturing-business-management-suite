"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  MessageSquare,
  Send,
  Smartphone,
  Volume2,
  Package,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSCard } from "@/components/ui/ios";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useCompletionSound } from "@/hooks/useCompletionSound";
import { SettingsHeader } from "../SettingsHeader";

export default function NotificationsSettingsPage() {
  const t = useTranslations("settings");
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    stock_alerts: true,
    order_alerts: true,
    emailNotifications: true,
    pushNotifications: false,
    whatsapp_notifications: true,
    telegram_notifications: false,
    sms_notifications: false,
  });

  const { soundEnabled, setSoundEnabled } = useCompletionSound();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (data.notification_preferences) {
          setPreferences((prev) => ({ ...prev, ...data.notification_preferences }));
        }
      } catch (err) {
        console.error("Failed to load notification preferences:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleUpdatePreferences = async (newPrefs: Partial<typeof preferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_preferences: updated }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(t("notificationsPage.toastUpdated"));
    } catch {
      toast.error(t("notificationsPage.toastFailed"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF2D55]" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-0">
      <SettingsHeader
        title={t("notificationsPage.title")}
        subtitle={t("notificationsPage.subtitle")}
        icon={Bell}
        iconColor="#FF2D55"
      />

      {/* Business Alert Triggers */}
      <IOSCard className="p-4 sm:p-6 space-y-4">
        <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#FF9500]" />
          {t("notificationsPage.alertsTitle")}
        </h3>
        <p className="text-[13px] text-[var(--muted-foreground)] -mt-2">
          {t("notificationsPage.alertsSubtitle")}
        </p>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
            <div className="flex items-center gap-3.5 pr-4">
              <div className="w-9 h-9 rounded-[10px] bg-[#FF9500]/10 flex items-center justify-center shrink-0">
                <Package size={18} className="text-[#FF9500]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("notificationsPage.stockAlerts")}</p>
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  {t("notificationsPage.stockAlertsDesc")}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.stock_alerts}
              onCheckedChange={(checked) => handleUpdatePreferences({ stock_alerts: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
            <div className="flex items-center gap-3.5 pr-4">
              <div className="w-9 h-9 rounded-[10px] bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                <ShoppingCart size={18} className="text-[#007AFF]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("notificationsPage.orderAlerts")}</p>
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  {t("notificationsPage.orderAlertsDesc")}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.order_alerts}
              onCheckedChange={(checked) => handleUpdatePreferences({ order_alerts: checked })}
            />
          </div>
        </div>
      </IOSCard>

      {/* Dispatch Channels */}
      <IOSCard className="p-4 sm:p-6 space-y-4">
        <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Send className="h-5 w-5 text-[#007AFF]" />
          {t("notificationsPage.channelsTitle")}
        </h3>
        <p className="text-[13px] text-[var(--muted-foreground)] -mt-2">
          {t("notificationsPage.channelsSubtitle")}
        </p>

        <div className="space-y-3 pt-1">
          {/* WhatsApp */}
          <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
            <div className="flex items-center gap-3.5 pr-4">
              <div className="w-9 h-9 rounded-[10px] bg-[#25D366]/10 flex items-center justify-center shrink-0">
                <MessageSquare size={18} className="text-[#25D366]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("notificationsPage.whatsapp")}</p>
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  {t("notificationsPage.whatsappDesc")}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.whatsapp_notifications}
              onCheckedChange={(checked) => handleUpdatePreferences({ whatsapp_notifications: checked })}
            />
          </div>

          {/* Telegram */}
          <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
            <div className="flex items-center gap-3.5 pr-4">
              <div className="w-9 h-9 rounded-[10px] bg-[#0088CC]/10 flex items-center justify-center shrink-0">
                <Send size={18} className="text-[#0088CC]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("notificationsPage.telegram")}</p>
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  {t("notificationsPage.telegramDesc")}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.telegram_notifications}
              onCheckedChange={(checked) => handleUpdatePreferences({ telegram_notifications: checked })}
            />
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
            <div className="flex items-center gap-3.5 pr-4">
              <div className="w-9 h-9 rounded-[10px] bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                <Mail size={18} className="text-[#007AFF]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("notificationsPage.email")}</p>
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  {t("notificationsPage.emailDesc")}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => handleUpdatePreferences({ emailNotifications: checked })}
            />
          </div>

          {/* SMS */}
          <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
            <div className="flex items-center gap-3.5 pr-4">
              <div className="w-9 h-9 rounded-[10px] bg-[#AF52DE]/10 flex items-center justify-center shrink-0">
                <Smartphone size={18} className="text-[#AF52DE]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("notificationsPage.sms")}</p>
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  {t("notificationsPage.smsDesc")}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.sms_notifications}
              onCheckedChange={(checked) => handleUpdatePreferences({ sms_notifications: checked })}
            />
          </div>
        </div>
      </IOSCard>

      {/* Audio Feedback */}
      <IOSCard className="p-4 sm:p-6 space-y-4">
        <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-[#34C759]" />
          {t("notificationsPage.soundTitle")}
        </h3>
        <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
          <div className="space-y-0.5 pr-4">
            <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("notificationsPage.soundFeedback")}</p>
            <p className="text-[13px] text-[var(--muted-foreground)]">
              {t("notificationsPage.soundDesc")}
            </p>
          </div>
          <Switch
            id="sound-effects-toggle"
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
          />
        </div>
      </IOSCard>
    </div>
  );
}
