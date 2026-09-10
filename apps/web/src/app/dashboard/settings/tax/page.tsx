"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  CreditCard,
  Percent,
  FileSpreadsheet,
  Layers,
  Save,
  Loader2,
  AlertCircle,
  HelpCircle,
  FileText,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSCard, IOSButton, IOSInput } from "@/components/ui/ios";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ReadOnlyBanner } from "@/components/AccessDenied";
import { SettingsHeader } from "../SettingsHeader";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

interface TaxSettingsState {
  gstin: string;
  pan: string;
  default_tax_rate: number;
  default_hsn_code: string;
  show_tax_breakdown: boolean;
  tax_regime: "Regular" | "Composition" | "Unregistered";
  tds_applicable: boolean;
  tcs_applicable: boolean;
  reverse_charge_liable: boolean;
}

export default function TaxSettingsPage() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [form, setForm] = useState<TaxSettingsState>({
    gstin: "",
    pan: "",
    default_tax_rate: 18,
    default_hsn_code: "",
    show_tax_breakdown: true,
    tax_regime: "Regular",
    tds_applicable: false,
    tcs_applicable: false,
    reverse_charge_liable: false,
  });

  const [gstinError, setGstinError] = useState<string | null>(null);
  const [panError, setPanError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, taxRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/profile/tax"),
        ]);

        const userData = await userRes.json();
        if (!userData.error) setUser(userData);

        const taxData = await taxRes.json();
        if (taxData.tax) {
          setForm({
            gstin: taxData.tax.gstin || "",
            pan: taxData.tax.pan || "",
            default_tax_rate: taxData.tax.default_tax_rate ?? 18,
            default_hsn_code: taxData.tax.default_hsn_code || "",
            show_tax_breakdown: taxData.tax.show_tax_breakdown ?? true,
            tax_regime: taxData.tax.tax_regime || "Regular",
            tds_applicable: Boolean(taxData.tax.tds_applicable),
            tcs_applicable: Boolean(taxData.tax.tcs_applicable),
            reverse_charge_liable: Boolean(taxData.tax.reverse_charge_liable),
          });
        }
      } catch (err) {
        console.error("Error loading tax settings:", err);
        toast.error(t("taxPage.toastLoadFailed"));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [t]);

  const validateGstin = (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) {
      setGstinError(null);
      return true;
    }
    if (!GSTIN_REGEX.test(trimmed)) {
      setGstinError(t("taxPage.gstinError"));
      return false;
    }
    setGstinError(null);
    return true;
  };

  const validatePan = (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) {
      setPanError(null);
      return true;
    }
    if (!PAN_REGEX.test(trimmed)) {
      setPanError(t("taxPage.panError"));
      return false;
    }
    setPanError(null);
    return true;
  };

  const isStaff = user?.role === "Staff";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const isGstinValid = validateGstin(form.gstin);
    const isPanValid = validatePan(form.pan);

    if (!isGstinValid || !isPanValid) {
      toast.error(t("taxPage.toastValidationErrors"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile/tax", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("taxPage.toastSaveFailed"));
      }

      toast.success(t("taxPage.toastSaveSuccess"));
      if (data.tax) {
        setForm({
          gstin: data.tax.gstin || "",
          pan: data.tax.pan || "",
          default_tax_rate: data.tax.default_tax_rate ?? 18,
          default_hsn_code: data.tax.default_hsn_code || "",
          show_tax_breakdown: data.tax.show_tax_breakdown ?? true,
          tax_regime: data.tax.tax_regime || "Regular",
          tds_applicable: Boolean(data.tax.tds_applicable),
          tcs_applicable: Boolean(data.tax.tcs_applicable),
          reverse_charge_liable: Boolean(data.tax.reverse_charge_liable),
        });
      }
    } catch (err: any) {
      toast.error(err.message || t("taxPage.toastSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00C7BE]" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-0">
      <SettingsHeader
        title={t("taxPage.title")}
        subtitle={t("taxPage.subtitle")}
        icon={Receipt}
        iconColor="#00C7BE"
      />

      {isStaff && <ReadOnlyBanner feature={tCommon("taxSettingsFeature")} />}

      <form onSubmit={handleSave} className="space-y-6">
        <fieldset disabled={isStaff} className="space-y-6 border-none p-0 m-0 min-w-0">
          {/* Core Identification & Rates Card */}
          <IOSCard className="p-4 sm:p-6 space-y-6">
            <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#00C7BE]" />
              {t("taxPage.gstCardTitle")}
            </h3>
            <p className="text-[13px] text-[var(--muted-foreground)] -mt-3">
              {t("taxPage.gstCardSubtitle")}
            </p>

            <div className="grid gap-5 sm:grid-cols-2 pt-1">
              {/* GSTIN Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="gstin" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                    {t("taxPage.gstinLabel")}
                  </label>
                  <span className="text-[11px] text-[var(--muted-foreground)]">{t("taxPage.gstinChars")}</span>
                </div>
                <IOSInput
                  id="gstin"
                  placeholder="27AABCU9603R1ZM"
                  value={form.gstin}
                  onChange={(e: any) => {
                    const val = e.target.value.toUpperCase();
                    setForm({ ...form, gstin: val });
                    if (gstinError) validateGstin(val);
                  }}
                  onBlur={(e: any) => validateGstin(e.target.value)}
                  className={`h-[46px] font-mono uppercase ${gstinError ? "border-[#FF3B30] focus:border-[#FF3B30]" : ""}`}
                  maxLength={15}
                />
                {gstinError ? (
                  <p className="text-[12px] font-medium text-[#FF3B30] flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {gstinError}
                  </p>
                ) : (
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {t("taxPage.gstinHint")}
                  </p>
                )}
              </div>

              {/* PAN Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="pan" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                    {t("taxPage.panLabel")}
                  </label>
                  <span className="text-[11px] text-[var(--muted-foreground)]">{t("taxPage.panChars")}</span>
                </div>
                <IOSInput
                  id="pan"
                  placeholder="AABCU9603R"
                  value={form.pan}
                  onChange={(e: any) => {
                    const val = e.target.value.toUpperCase();
                    setForm({ ...form, pan: val });
                    if (panError) validatePan(val);
                  }}
                  onBlur={(e: any) => validatePan(e.target.value)}
                  className={`h-[46px] font-mono uppercase ${panError ? "border-[#FF3B30] focus:border-[#FF3B30]" : ""}`}
                  maxLength={10}
                />
                {panError ? (
                  <p className="text-[12px] text-[#FF3B30] flex items-center gap-1 mt-1">
                    <AlertCircle size={14} className="shrink-0" />
                    {panError}
                  </p>
                ) : (
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {t("taxPage.panHint")}
                  </p>
                )}
              </div>

              {/* Default GST Rate Dropdown */}
              <div className="space-y-1.5">
                <label htmlFor="default_tax_rate" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                  {t("taxPage.defaultTaxRate")}
                </label>
                <div className="relative">
                  <select
                    id="default_tax_rate"
                    value={form.default_tax_rate}
                    onChange={(e) => setForm({ ...form, default_tax_rate: Number(e.target.value) })}
                    className="w-full h-[46px] px-3.5 rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-[var(--border)] text-[15px] font-medium text-[var(--foreground)] focus:ring-[3px] focus:ring-[#00C7BE]/30 focus:border-[#00C7BE] outline-none appearance-none cursor-pointer transition-all shadow-sm"
                  >
                    <option value={0}>{t("taxPage.rate0")}</option>
                    <option value={5}>{t("taxPage.rate5")}</option>
                    <option value={12}>{t("taxPage.rate12")}</option>
                    <option value={18}>{t("taxPage.rate18")}</option>
                    <option value={28}>{t("taxPage.rate28")}</option>
                  </select>
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {t("taxPage.defaultTaxRateHint")}
                </p>
              </div>

              {/* Default HSN / SAC Code */}
              <div className="space-y-1.5">
                <label htmlFor="default_hsn_code" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                  {t("taxPage.defaultHsn")}
                </label>
                <IOSInput
                  id="default_hsn_code"
                  placeholder={t("taxPage.defaultHsnPlaceholder")}
                  value={form.default_hsn_code}
                  onChange={(e: any) => setForm({ ...form, default_hsn_code: e.target.value })}
                  className="h-[46px] font-mono"
                  maxLength={10}
                />
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {t("taxPage.defaultHsnHint")}
                </p>
              </div>
            </div>

            {/* Toggle: Show Tax Breakdown on Invoices */}
            <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)] mt-2">
              <div className="space-y-0.5 pr-4">
                <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("taxPage.showBreakdown")}</p>
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  {t("taxPage.showBreakdownDesc")}
                </p>
              </div>
              <Switch
                checked={form.show_tax_breakdown}
                onCheckedChange={(checked) => setForm({ ...form, show_tax_breakdown: checked })}
              />
            </div>
          </IOSCard>

          {/* GST Compliance & Regimes Card */}
          <IOSCard className="p-4 sm:p-6 space-y-6">
            <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[#00C7BE]" />
              {t("taxPage.complianceCardTitle")}
            </h3>
            <p className="text-[13px] text-[var(--muted-foreground)] -mt-3">
              {t("taxPage.complianceCardSubtitle")}
            </p>

            {/* Tax Regime */}
            <div className="space-y-1.5 pt-1">
              <label htmlFor="tax_regime" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                {t("taxPage.regimeLabel")}
              </label>
              <select
                id="tax_regime"
                value={form.tax_regime}
                onChange={(e) => setForm({ ...form, tax_regime: e.target.value as any })}
                className="w-full sm:w-[320px] h-[46px] px-3.5 rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-[var(--border)] text-[15px] font-medium text-[var(--foreground)] focus:ring-[3px] focus:ring-[#00C7BE]/30 focus:border-[#00C7BE] outline-none appearance-none cursor-pointer transition-all shadow-sm"
              >
                <option value="Regular">{t("taxPage.regimeRegular")}</option>
                <option value="Composition">{t("taxPage.regimeComposition")}</option>
                <option value="Unregistered">{t("taxPage.regimeUnregistered")}</option>
              </select>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {t("taxPage.regimeHint")}
              </p>
            </div>

            {/* Compliance Toggles */}
            <div className="space-y-3 pt-2">
              {/* TDS */}
              <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
                <div className="space-y-0.5 pr-4">
                  <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("taxPage.tdsLabel")}</p>
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    {t("taxPage.tdsDesc")}
                  </p>
                </div>
                <Switch
                  checked={form.tds_applicable}
                  onCheckedChange={(checked) => setForm({ ...form, tds_applicable: checked })}
                />
              </div>

              {/* TCS */}
              <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
                <div className="space-y-0.5 pr-4">
                  <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("taxPage.tcsLabel")}</p>
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    {t("taxPage.tcsDesc")}
                  </p>
                </div>
                <Switch
                  checked={form.tcs_applicable}
                  onCheckedChange={(checked) => setForm({ ...form, tcs_applicable: checked })}
                />
              </div>

              {/* Reverse Charge */}
              <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
                <div className="space-y-0.5 pr-4">
                  <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("taxPage.rcmLabel")}</p>
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    {t("taxPage.rcmDesc")}
                  </p>
                </div>
                <Switch
                  checked={form.reverse_charge_liable}
                  onCheckedChange={(checked) => setForm({ ...form, reverse_charge_liable: checked })}
                />
              </div>
            </div>
          </IOSCard>
        </fieldset>

        {/* Save Button */}
        {!isStaff && (
          <div className="flex justify-end pt-2">
            <IOSButton
              type="submit"
              variant="filled"
              color="blue"
              disabled={saving}
              className="px-8 text-[15px] font-semibold h-[46px] rounded-[12px] bg-[#00C7BE] hover:bg-[#00C7BE]/90 text-white"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("taxPage.saveButton")}
            </IOSButton>
          </div>
        )}
      </form>
    </div>
  );
}
