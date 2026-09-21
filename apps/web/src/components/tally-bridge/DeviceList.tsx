"use client";

import React, { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { IOSCard, IOSButton, IOSBadge } from "@/components/ui/ios";
import {
  Laptop,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  Server,
  Radio,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/formatters";
import type { BridgeDeviceItem } from "./RevokeDeviceDialog";
import { RevokeDeviceDialog } from "./RevokeDeviceDialog";

interface DeviceListProps {
  devices: BridgeDeviceItem[];
  loading: boolean;
  savedTallyCompanyName: string;
  onRefresh: () => void;
}

export function DeviceList({
  devices,
  loading,
  savedTallyCompanyName,
  onRefresh,
}: DeviceListProps) {
  const t = useTranslations("settings.tallyPage");
  const locale = useLocale();

  const [showRevoked, setShowRevoked] = useState(false);
  const [deviceToRevoke, setDeviceToRevoke] = useState<BridgeDeviceItem | null>(null);

  const activeDevices = devices.filter((d) => !d.revokedAt);
  const revokedDevices = devices.filter((d) => !!d.revokedAt);
  const displayedDevices = showRevoked ? devices : activeDevices;

  // D7: Check if saved company and device company are both non-empty and differ (case-insensitive)
  const isCompanyMismatch = (deviceCompany?: string) => {
    if (!savedTallyCompanyName || !deviceCompany) return false;
    const s = savedTallyCompanyName.trim().toLowerCase();
    const d = deviceCompany.trim().toLowerCase();
    return s !== "" && d !== "" && s !== d;
  };

  return (
    <IOSCard className="p-4 sm:p-6 space-y-5 bg-[var(--card)] border border-[var(--border)] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Server className="h-5 w-5 text-[#34C759]" />
            {t("devicesCardTitle")}
          </h3>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            {t("devicesCardSubtitle")}
          </p>
        </div>

        {/* Toggle Revoked Button */}
        {revokedDevices.length > 0 && (
          <button
            type="button"
            onClick={() => setShowRevoked(!showRevoked)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors self-start sm:self-auto cursor-pointer"
          >
            {showRevoked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>
              {showRevoked
                ? t("hideRevoked", { count: revokedDevices.length })
                : t("showRevoked", { count: revokedDevices.length })}
            </span>
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && devices.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-[var(--muted-foreground)]">
          <Radio className="h-6 w-6 animate-pulse text-[var(--primary)]" />
          <span className="text-[13px]">{t("testing")}</span>
        </div>
      )}

      {/* D8: Empty State */}
      {!loading && displayedDevices.length === 0 && (
        <div className="py-12 px-4 text-center rounded-[16px] bg-[var(--muted)]/20 border border-[var(--border)] space-y-2">
          <div className="h-12 w-12 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto text-[var(--muted-foreground)]">
            <Laptop className="h-6 w-6" />
          </div>
          <h4 className="text-[15px] font-medium text-[var(--foreground)]">
            {t("emptyDevicesTitle")}
          </h4>
          <p className="text-[13px] text-[var(--muted-foreground)] max-w-md mx-auto leading-relaxed">
            {t("emptyDevicesDesc")}
          </p>
        </div>
      )}

      {/* Devices content */}
      {displayedDevices.length > 0 && (
        <>
          {/* ─── Desktop Table View ─── */}
          <div className="hidden md:block overflow-x-auto scrollbar-hide border border-[var(--border)] rounded-[14px]">
            <table className="w-full text-left table-fixed text-[13px]">
              <thead className="bg-[var(--muted)]/50 border-b border-[var(--border)] text-[var(--muted-foreground)] font-medium">
                <tr>
                  <th className="py-3 px-4 w-[170px]">{t("thDevice")}</th>
                  <th className="py-3 px-3 w-[85px]">{t("thPlatform")}</th>
                  <th className="py-3 px-3 w-[75px]">{t("thVersion")}</th>
                  <th className="py-3 px-3 w-[95px]">{t("thStatus")}</th>
                  <th className="py-3 px-3 w-[110px]">{t("thLastSeen")}</th>
                  <th className="py-3 px-3 w-[180px]">{t("thTallyStatus")}</th>
                  <th className="py-3 px-3 min-w-0">{t("thActiveCompany")}</th>
                  <th className="py-3 px-4 w-[90px] text-right">{t("thActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {displayedDevices.map((device) => {
                  const isRevoked = !!device.revokedAt;
                  const mismatch = isCompanyMismatch(device.tally?.company);

                  return (
                    <tr
                      key={device.id}
                      className={
                        isRevoked
                          ? "opacity-50 bg-[var(--muted)]/20"
                          : "hover:bg-[var(--muted)]/30 transition-colors"
                      }
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-[var(--foreground)] truncate">
                        <div className="flex items-center gap-2 truncate">
                          <Laptop className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                          <span className="truncate" title={device.name}>
                            {device.name}
                          </span>
                        </div>
                      </td>

                      {/* Platform */}
                      <td className="py-3.5 px-3 text-[var(--muted-foreground)] truncate capitalize">
                        {device.platform || "—"}
                      </td>

                      {/* Version */}
                      <td className="py-3.5 px-3 text-[var(--muted-foreground)] font-mono text-[12px] truncate">
                        {device.appVersion || "—"}
                      </td>

                      {/* Status (online/offline/revoked) */}
                      <td className="py-3.5 px-3">
                        {isRevoked ? (
                          <IOSBadge color="gray" variant="tinted" size="small">
                            {t("badgeRevoked")}
                          </IOSBadge>
                        ) : device.online ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[12px]">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            {t("statusOnline")}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[var(--muted-foreground)] font-medium text-[12px]">
                            <span className="h-2 w-2 rounded-full bg-zinc-400 shrink-0" />
                            {t("statusOffline")}
                          </div>
                        )}
                      </td>

                      {/* Last Seen */}
                      <td className="py-3.5 px-3 text-[var(--muted-foreground)] truncate text-[12px]">
                        {device.lastSeenAt ? formatRelativeTime(device.lastSeenAt, locale) : "—"}
                      </td>

                      {/* Tally Status */}
                      <td className="py-3.5 px-3">
                        {device.tally ? (
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {device.tally.reachable ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              )}
                              <span
                                className={`text-[12px] font-medium truncate ${
                                  device.tally.reachable
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-red-500"
                                }`}
                              >
                                {device.tally.reachable
                                  ? t("tallyConnected")
                                  : t("tallyUnreachable")}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-[var(--muted-foreground)] truncate">
                              {device.tally.host}:{device.tally.port}
                              {device.tally.lastError ? ` (${device.tally.lastError})` : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)] text-[12px]">—</span>
                        )}
                      </td>

                      {/* Active Company + D7 mismatch */}
                      <td className="py-3.5 px-3 min-w-0">
                        <div className="space-y-1 min-w-0">
                          <span
                            className="font-medium text-[var(--foreground)] truncate block"
                            title={device.tally?.company || "—"}
                          >
                            {device.tally?.company || "—"}
                          </span>
                          {mismatch && (
                            <div className="flex items-start gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-[6px] border border-amber-500/20 leading-tight">
                              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                              <span className="truncate">
                                {t("companyMismatch", {
                                  bridgeCompany: device.tally?.company || "",
                                  accountCompany: savedTallyCompanyName,
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {!isRevoked && (
                          <IOSButton
                            type="button"
                            variant="gray"
                            onClick={() => setDeviceToRevoke(device)}
                            className="h-[30px] px-3 text-[12px] font-medium rounded-[8px] text-red-500 hover:bg-red-500/10 hover:border-red-500/30"
                          >
                            {t("btnRevoke")}
                          </IOSButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ─── Mobile Card View ─── */}
          <div className="md:hidden space-y-3">
            {displayedDevices.map((device) => {
              const isRevoked = !!device.revokedAt;
              const mismatch = isCompanyMismatch(device.tally?.company);

              return (
                <div
                  key={device.id}
                  className={`p-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] space-y-3.5 ${
                    isRevoked ? "opacity-60 bg-[var(--muted)]/20" : ""
                  }`}
                >
                  {/* Card Header: Device Name + Status */}
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Laptop className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                      <h4 className="font-semibold text-[14px] text-[var(--foreground)] truncate">
                        {device.name}
                      </h4>
                    </div>

                    <div className="shrink-0">
                      {isRevoked ? (
                        <IOSBadge color="gray" variant="tinted" size="small">
                          {t("badgeRevoked")}
                        </IOSBadge>
                      ) : device.online ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t("statusOnline")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/10 text-[var(--muted-foreground)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                          {t("statusOffline")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <span className="text-[var(--muted-foreground)] block text-[11px]">
                        {t("thPlatform")} / {t("thVersion")}
                      </span>
                      <span className="font-medium text-[var(--foreground)] capitalize">
                        {device.platform || "—"} ({device.appVersion || "—"})
                      </span>
                    </div>

                    <div>
                      <span className="text-[var(--muted-foreground)] block text-[11px]">
                        {t("thLastSeen")}
                      </span>
                      <span className="font-medium text-[var(--foreground)]">
                        {device.lastSeenAt ? formatRelativeTime(device.lastSeenAt, locale) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Tally Status */}
                  <div className="text-[12px] pt-1">
                    <span className="text-[var(--muted-foreground)] block text-[11px] mb-1">
                      {t("thTallyStatus")}
                    </span>
                    {device.tally ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {device.tally.reachable ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          )}
                          <span
                            className={`font-medium ${
                              device.tally.reachable
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-500"
                            }`}
                          >
                            {device.tally.reachable
                              ? t("tallyConnected")
                              : t("tallyUnreachable")}
                          </span>
                          <span className="text-[var(--muted-foreground)] font-mono text-[11px]">
                            ({device.tally.host}:{device.tally.port})
                          </span>
                        </div>
                        {device.tally.lastError && (
                          <div className="text-[11px] text-red-500">
                            {device.tally.lastError}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">—</span>
                    )}
                  </div>

                  {/* Active Company */}
                  <div className="text-[12px] pt-1 space-y-1">
                    <span className="text-[var(--muted-foreground)] block text-[11px]">
                      {t("thActiveCompany")}
                    </span>
                    <span className="font-medium text-[var(--foreground)] block truncate">
                      {device.tally?.company || "—"}
                    </span>
                    {mismatch && (
                      <div className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-[8px] border border-amber-500/20">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="leading-snug">
                          {t("companyMismatch", {
                            bridgeCompany: device.tally?.company || "",
                            accountCompany: savedTallyCompanyName,
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Revoke Action */}
                  {!isRevoked && (
                    <div className="pt-2 border-t border-[var(--border)] flex justify-end">
                      <IOSButton
                        type="button"
                        variant="gray"
                        onClick={() => setDeviceToRevoke(device)}
                        className="h-[32px] px-4 text-[12px] font-medium rounded-[8px] text-red-500 hover:bg-red-500/10"
                      >
                        {t("btnRevoke")}
                      </IOSButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Revoke Confirmation Dialog */}
      <RevokeDeviceDialog
        device={deviceToRevoke}
        open={!!deviceToRevoke}
        onOpenChange={(open) => {
          if (!open) setDeviceToRevoke(null);
        }}
        onSuccess={() => {
          setDeviceToRevoke(null);
          onRefresh();
        }}
      />
    </IOSCard>
  );
}
