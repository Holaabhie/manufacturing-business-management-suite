"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Key,
  KeyRound,
  Lock,
  LogOut,
  Fingerprint,
  Monitor,
  Smartphone,
  Globe,
  Trash2,
  Loader2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSCard, IOSButton, IOSInput } from "@/components/ui/ios";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { SettingsHeader } from "../SettingsHeader";

interface ActiveSession {
  id: string;
  createdAt: string;
  lastActiveAt?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
}

export default function SecuritySettingsPage() {
  const t = useTranslations("settings");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Active sessions state
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/sessions");
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleUpdatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t("securityPage.toastPasswordsMismatch"));
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error(t("securityPage.toastPasswordMinLength"));
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: passwordData.newPassword }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || t("securityPage.toastPasswordFailed"));
      } else {
        toast.success(t("securityPage.toastPasswordSuccess"));
        setPasswordData({ newPassword: "", confirmPassword: "" });
        setPasswordDialogOpen(false);
      }
    } catch (error: any) {
      toast.error(error.message || t("securityPage.toastPasswordFailed"));
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Failed to revoke session");
      toast.success(t("securityPage.toastSessionRevoked"));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      toast.error(err.message || t("securityPage.toastSessionRevokeFailed"));
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm(t("securityPage.confirmSignOutAll"))) return;
    setRevokingAll(true);
    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error("Failed to revoke all sessions");
      toast.success(t("securityPage.toastAllSessionsRevoked"));
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || t("securityPage.toastAllSessionsFailed"));
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-0">
      <SettingsHeader
        title={t("securityPage.title")}
        subtitle={t("securityPage.subtitle")}
        icon={Shield}
        iconColor="#34C759"
      />

      {/* Password & Authentication */}
      <IOSCard className="p-4 sm:p-6 space-y-5">
        <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Lock className="h-5 w-5 text-[#34C759]" />
          {t("securityPage.authTitle")}
        </h3>

        <div className="flex flex-col gap-3">
          {/* Change Password Item */}
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogTrigger asChild>
              <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted)]/80 transition-all cursor-pointer group active:scale-[0.99]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-[12px] bg-[#007AFF]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Key className="h-5 w-5 text-[#007AFF]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("securityPage.changePassword")}</p>
                    <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5">
                      {t("securityPage.changePasswordDesc")}
                    </p>
                  </div>
                </div>
                <IOSButton variant="gray" className="rounded-full px-4 text-[13px] font-semibold">
                  {t("securityPage.update")}
                </IOSButton>
              </div>
            </DialogTrigger>

            <DialogContent
              fullScreenMobile
              className="sm:max-w-md bg-white/90 dark:bg-[rgba(28,28,30,0.9)] backdrop-blur-[40px] border border-[var(--border)] shadow-[var(--shadow-lg)] rounded-[24px] p-0 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 pb-3 mb-4 border-b border-[var(--border)]">
                  <div className="w-10 h-10 rounded-[12px] bg-[#007AFF]/10 flex items-center justify-center">
                    <KeyRound className="h-5 w-5 text-[#007AFF]" />
                  </div>
                  <div>
                    <DialogTitle className="text-[18px] font-bold text-[var(--foreground)]">
                      {t("securityPage.dialogTitle")}
                    </DialogTitle>
                    <DialogDescription className="text-[13px] text-[var(--muted-foreground)]">
                      {t("securityPage.dialogDesc")}
                    </DialogDescription>
                  </div>
                </div>

                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <label htmlFor="new-password" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                      {t("securityPage.newPassword")}
                    </label>
                    <IOSInput
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={passwordData.newPassword}
                      onChange={(e: any) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="h-[44px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="confirm-password" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                      {t("securityPage.confirmNewPassword")}
                    </label>
                    <IOSInput
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={passwordData.confirmPassword}
                      onChange={(e: any) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="h-[44px]"
                    />
                  </div>
                </div>

                <DialogFooter className="flex gap-2 pt-4 border-t border-[var(--border)] mt-4">
                  <IOSButton
                    variant="filled"
                    color="blue"
                    onClick={handleUpdatePassword}
                    disabled={updatingPassword}
                    className="w-full text-[15px] font-semibold h-[44px] rounded-[12px]"
                  >
                    {updatingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {updatingPassword ? t("securityPage.updating") : t("securityPage.dialogButton")}
                  </IOSButton>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* 2FA Toggle — Stubbed as Coming Soon */}
          <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)] opacity-75">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#34C759]/10 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-[#34C759]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("securityPage.twoFactor")}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--border)] text-[var(--muted-foreground)]">
                    {t("securityPage.comingSoon")}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5">
                  {t("securityPage.twoFactorDesc")}
                </p>
              </div>
            </div>
            <Switch disabled checked={false} />
          </div>
        </div>
      </IOSCard>

      {/* Active Sessions Card (Real Backend) */}
      <IOSCard className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Monitor className="h-5 w-5 text-[#007AFF]" />
              {t("securityPage.activeSessionsTitle")}
            </h3>
            <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
              {t("securityPage.activeSessionsSubtitle")}
            </p>
          </div>
          {sessions.length > 1 && (
            <IOSButton
              variant="gray"
              onClick={handleRevokeAllSessions}
              disabled={revokingAll}
              className="text-[13px] font-medium h-[36px] rounded-[10px] shrink-0"
            >
              {revokingAll ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <LogOut className="mr-1.5 h-3.5 w-3.5" />}
              {t("securityPage.signOutAll")}
            </IOSButton>
          )}
        </div>

        {sessionsLoading ? (
          <div className="flex items-center gap-2 py-4 text-[var(--muted-foreground)] text-[14px]">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("securityPage.loadingSessions")}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 rounded-[14px] bg-[var(--muted)] border border-[var(--border)] text-[14px] text-[var(--muted-foreground)] text-center">
            {t("securityPage.onlyActive")}
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((sess, idx) => {
              const isMobile = sess.deviceType?.toLowerCase().includes("mobile") || sess.deviceType?.toLowerCase().includes("phone");
              const isCurrent = idx === 0;

              return (
                <div
                  key={sess.id}
                  className="flex items-center justify-between p-3.5 rounded-[14px] bg-[var(--muted)] border border-[var(--border)] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[10px] bg-white dark:bg-[#1C1C1E] border border-[var(--border)] flex items-center justify-center shrink-0">
                      {isMobile ? (
                        <Smartphone size={18} className="text-[var(--primary)]" />
                      ) : (
                        <Monitor size={18} className="text-[var(--primary)]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-[var(--foreground)] truncate">
                          {sess.browser || t("securityPage.webBrowser")} {t("securityPage.on")} {sess.deviceType || t("securityPage.device")}
                        </p>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#34C759]/15 text-[#34C759]">
                            {t("securityPage.currentSession")}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[var(--muted-foreground)] flex items-center gap-2 mt-0.5 truncate">
                        <span>{t("securityPage.ip")}: {sess.ipAddress || "—"}</span>
                        {sess.lastActiveAt && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {t("securityPage.active")} {new Date(sess.lastActiveAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && (
                    <IOSButton
                      variant="destructive"
                      onClick={() => handleRevokeSession(sess.id)}
                      disabled={revokingSessionId === sess.id}
                      className="h-[32px] px-3 text-[12px] rounded-[8px]"
                    >
                      {revokingSessionId === sess.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      {t("securityPage.revoke")}
                    </IOSButton>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </IOSCard>
    </div>
  );
}
