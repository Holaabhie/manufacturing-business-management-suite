"use client";

import React, { useState, useEffect } from "react";
import {
  Link2,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSCard, IOSButton, IOSInput } from "@/components/ui/ios";
import { toast } from "sonner";
import { ReadOnlyBanner } from "@/components/AccessDenied";
import { SettingsHeader } from "../SettingsHeader";

export default function TallyIntegrationSettingsPage() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tallyConfig, setTallyConfig] = useState({
    tallyCompanyName: "",
    bridgeUrl: "http://localhost:4567",
    authToken: "",
  });
  const [tallyTesting, setTallyTesting] = useState(false);
  const [tallyConnected, setTallyConnected] = useState<boolean | null>(null);
  const [tallySaving, setTallySaving] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, bridgeRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/tally/bridge-health"),
        ]);

        const userData = await userRes.json();
        if (!userData.error) setUser(userData);

        const bridgeData = await bridgeRes.json();
        if (bridgeData.data) {
          setTallyConfig({
            tallyCompanyName: bridgeData.data.tallyCompanyName || "",
            bridgeUrl: bridgeData.data.bridgeUrl || "http://localhost:4567",
            authToken: "",
          });
        }
      } catch (err) {
        console.error("Error loading Tally settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const isStaff = user?.role === "Staff";

  const handleTestConnection = async () => {
    setTallyTesting(true);
    setTallyConnected(null);
    try {
      const url = tallyConfig.bridgeUrl || "http://localhost:4567";
      const healthRes = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (healthRes.ok) {
        const tallyRes = await fetch(`${url}/tally-status`, {
          signal: AbortSignal.timeout(5000),
        });
        setTallyConnected(tallyRes.ok);
      } else {
        setTallyConnected(false);
      }
    } catch {
      setTallyConnected(false);
    } finally {
      setTallyTesting(false);
    }
  };

  const handleSaveTally = async () => {
    setTallySaving(true);
    try {
      const res = await fetch("/api/profile/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: tallyConfig.tallyCompanyName || user?.company_details?.companyName || "My Company",
          tally_company_name: tallyConfig.tallyCompanyName,
          tally_bridge_url: tallyConfig.bridgeUrl,
          ...(tallyConfig.authToken ? { tally_auth_token: tallyConfig.authToken } : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(t("tallyPage.toastSaved"));
    } catch (err: any) {
      toast.error(err.message || t("tallyPage.toastSaveFailed"));
    } finally {
      setTallySaving(false);
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
        title={t("tallyPage.title")}
        subtitle={t("tallyPage.subtitle")}
        icon={Link2}
        iconColor="#FF9500"
      />

      {isStaff && <ReadOnlyBanner feature={tCommon("tallyIntegrationFeature")} />}

      <fieldset disabled={isStaff} className="space-y-6 border-none p-0 m-0 min-w-0">
        <IOSCard className="p-4 sm:p-6 space-y-6">
          <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#FF9500]" />
            {t("tallyPage.connectorTitle")}
          </h3>
          <p className="text-[13px] text-[var(--muted-foreground)] -mt-3">
            {t("tallyPage.connectorSubtitle")}
          </p>

          <div className="space-y-4 pt-1">
            {/* Tally Company Name */}
            <div className="space-y-1.5">
              <label htmlFor="tallyCompanyName" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                {t("tallyPage.companyName")}
              </label>
              <IOSInput
                id="tallyCompanyName"
                placeholder={t("tallyPage.companyNamePlaceholder")}
                value={tallyConfig.tallyCompanyName}
                onChange={(e: any) => setTallyConfig({ ...tallyConfig, tallyCompanyName: e.target.value })}
                className="h-[46px]"
              />
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {t("tallyPage.companyNameHint")}
              </p>
            </div>

            {/* Bridge URL */}
            <div className="space-y-1.5">
              <label htmlFor="bridgeUrl" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                {t("tallyPage.bridgeUrl")}
              </label>
              <IOSInput
                id="bridgeUrl"
                placeholder={t("tallyPage.bridgeUrlPlaceholder")}
                value={tallyConfig.bridgeUrl}
                onChange={(e: any) => setTallyConfig({ ...tallyConfig, bridgeUrl: e.target.value })}
                className="h-[46px] font-mono"
              />
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {t("tallyPage.bridgeUrlHint")}
              </p>
            </div>

            {/* Auth Token */}
            <div className="space-y-1.5">
              <label htmlFor="authToken" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                {t("tallyPage.authToken")}
              </label>
              <div className="relative">
                <IOSInput
                  id="authToken"
                  type={showAuthToken ? "text" : "password"}
                  placeholder={t("tallyPage.authTokenPlaceholder")}
                  value={tallyConfig.authToken}
                  onChange={(e: any) => setTallyConfig({ ...tallyConfig, authToken: e.target.value })}
                  className="h-[46px] font-mono pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthToken(!showAuthToken)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  {showAuthToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {t("tallyPage.authTokenHint")}
              </p>
            </div>

            {/* Test Connection Button & Status */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <IOSButton
                type="button"
                variant="gray"
                disabled={tallyTesting}
                onClick={handleTestConnection}
                className="px-6 text-[13px] font-semibold h-[42px] rounded-[10px]"
              >
                {tallyTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                {tallyTesting ? t("tallyPage.testing") : t("tallyPage.btnTest")}
              </IOSButton>

              {tallyConnected === true && (
                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                  <CheckCircle2 size={16} />
                  <span className="text-[13px] font-medium">{t("tallyPage.statusConnected")}</span>
                </div>
              )}
              {tallyConnected === false && (
                <div className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full">
                  <XCircle size={16} />
                  <span className="text-[13px] font-medium">{t("tallyPage.statusUnreachable")}</span>
                </div>
              )}
            </div>
          </div>
        </IOSCard>

        {/* Save Button */}
        {!isStaff && (
          <div className="flex justify-end pt-2">
            <IOSButton
              type="button"
              variant="filled"
              color="blue"
              disabled={tallySaving}
              onClick={handleSaveTally}
              className="px-8 text-[15px] font-semibold h-[46px] rounded-[12px]"
            >
              {tallySaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("tallyPage.btnSave")}
            </IOSButton>
          </div>
        )}
      </fieldset>
    </div>
  );
}

