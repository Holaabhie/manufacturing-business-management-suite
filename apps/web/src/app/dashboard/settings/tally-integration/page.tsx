"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link2, Save, Loader2, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSCard, IOSButton, IOSInput } from "@/components/ui/ios";
import { toast } from "sonner";
import { ReadOnlyBanner } from "@/components/AccessDenied";
import { SettingsHeader } from "../SettingsHeader";
import { PairingCodeCard } from "@/components/tally-bridge/PairingCodeCard";
import { DeviceList } from "@/components/tally-bridge/DeviceList";
import type { BridgeDeviceItem } from "@/components/tally-bridge/RevokeDeviceDialog";

export default function TallyIntegrationSettingsPage() {
  const t = useTranslations("settings.tallyPage");
  const tCommon = useTranslations("common");

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Company card state
  const [tallyCompanyName, setTallyCompanyName] = useState("");
  const [companySaving, setCompanySaving] = useState(false);

  // 2 & 3. Devices list state
  const [devices, setDevices] = useState<BridgeDeviceItem[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);

  const isFetchingDevicesRef = useRef(false);

  // Load user profile & company profile on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [profileRes, companyRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/profile/company"),
        ]);

        const profileData = await profileRes.json().catch(() => ({}));
        if (!profileData.error) {
          setUser(profileData);
        }

        const companyData = await companyRes.json().catch(() => ({}));
        if (companyData.company) {
          setTallyCompanyName(companyData.company.tally_company_name || "");
        }
      } catch (err) {
        console.error("Error loading Tally settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  const isAdmin = user?.role === "Admin";
  const isStaff = user?.role === "Staff";

  // Fetch paired devices (Admin only)
  const fetchDevices = useCallback(async () => {
    if (isFetchingDevicesRef.current) return;
    isFetchingDevicesRef.current = true;
    try {
      const res = await fetch("/api/tally/bridge/devices");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setDevices(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch bridge devices:", err);
    } finally {
      isFetchingDevicesRef.current = false;
      setDevicesLoading(false);
    }
  }, []);

  // Polling loop: every 15s while tab is visible, never overlap, stop on unmount (D5)
  useEffect(() => {
    if (!isAdmin) return;

    fetchDevices();

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchDevices();
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchDevices();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAdmin, fetchDevices]);

  // Save company name (D3)
  const handleSaveCompany = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCompanySaving(true);
    try {
      const res = await fetch("/api/profile/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tally_company_name: tallyCompanyName,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t("toastCompanySaveFailed"));
      }

      // Update state from response and show Saved only after API confirms
      if (data.company?.tally_company_name !== undefined) {
        setTallyCompanyName(data.company.tally_company_name);
      }
      toast.success(t("toastCompanySaved"));
    } catch (err: any) {
      toast.error(err.message || t("toastCompanySaveFailed"));
    } finally {
      setCompanySaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF9500]" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-0">
      <SettingsHeader
        title={t("title")}
        subtitle={t("subtitle")}
        icon={Link2}
        iconColor="#FF9500"
      />

      {isStaff && <ReadOnlyBanner feature={tCommon("tallyIntegrationFeature")} />}

      {/* ─── Top Card (1): Company Card ─── */}
      <IOSCard className="p-4 sm:p-6 space-y-5 bg-[var(--card)] border border-[var(--border)]">
        <div>
          <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#FF9500]" />
            {t("companyCardTitle")}
          </h3>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            {t("companyCardSubtitle")}
          </p>
        </div>

        <form onSubmit={handleSaveCompany} className="space-y-4 pt-1">
          <fieldset disabled={isStaff} className="space-y-4 border-none p-0 m-0 min-w-0">
            <div className="space-y-1.5">
              <label
                htmlFor="tallyCompanyName"
                className="text-[13px] font-medium text-[var(--muted-foreground)]"
              >
                {t("companyNameLabel")}
              </label>
              <IOSInput
                id="tallyCompanyName"
                placeholder={t("companyNamePlaceholderText")}
                value={tallyCompanyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTallyCompanyName(e.target.value)
                }
                maxLength={120}
                className="h-[46px]"
              />
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {t("companyNameDescription")}
              </p>
            </div>

            {!isStaff && (
              <div className="flex justify-end pt-1">
                <IOSButton
                  type="submit"
                  variant="filled"
                  color="blue"
                  disabled={companySaving}
                  className="px-6 text-[14px] font-semibold h-[42px] rounded-[10px]"
                >
                  {companySaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {companySaving ? t("saving") : t("saveCompanyBtn")}
                </IOSButton>
              </div>
            )}
          </fieldset>
        </form>
      </IOSCard>

      {/* ─── Admin Only: Bridge Card (2) & Devices List (3) ─── */}
      {isAdmin && (
        <>
          {/* Card (2): Connect a new bridge */}
          <PairingCodeCard onCodeGenerated={fetchDevices} />

          {/* Card (3): Devices list */}
          <DeviceList
            devices={devices}
            loading={devicesLoading}
            savedTallyCompanyName={tallyCompanyName}
            onRefresh={fetchDevices}
          />
        </>
      )}
    </div>
  );
}
