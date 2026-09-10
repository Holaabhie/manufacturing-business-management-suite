"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Landmark,
  Upload,
  Save,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSCard, IOSButton, IOSInput } from "@/components/ui/ios";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ReadOnlyBanner } from "@/components/AccessDenied";
import { useCompanyProfile, type CompanyProfile } from "@/hooks/useCompanyProfile";
import { SettingsHeader } from "../SettingsHeader";

export default function CompanyInfoPage() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const logoSavingRef = useRef(false);

  const {
    company: hookCompany,
    loading: companyLoading,
    updateCompanyProfile,
  } = useCompanyProfile();

  const [companyData, setCompanyData] = useState<CompanyProfile>({
    companyName: "",
    address: "",
    phone: "",
    email: "",
    logoUrl: "",
    bankName: "",
    accountNo: "",
    ifsc: "",
    upiId: "",
  });

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (!data.error) {
          setUser(data);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      } finally {
        setUserLoading(false);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (hookCompany && !logoSavingRef.current) {
      setCompanyData({
        companyName: hookCompany.companyName || "",
        address: hookCompany.address || "",
        phone: hookCompany.phone || "",
        email: hookCompany.email || "",
        logoUrl: hookCompany.logoUrl || "",
        bankName: hookCompany.bankName || "",
        accountNo: hookCompany.accountNo || "",
        ifsc: hookCompany.ifsc || "",
        upiId: hookCompany.upiId || "",
      });
    }
  }, [hookCompany]);

  const isStaff = user?.role === "Staff";

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      e.target.value = "";

      if (file.size > 500 * 1024) {
        toast.error(t("companyInfoPage.toastLogoSize"));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const prevLogoUrl = companyData.logoUrl;
        setCompanyData((prev) => ({ ...prev, logoUrl: base64String }));
        logoSavingRef.current = true;
        try {
          const serverState = hookCompany || companyData;
          const updated = await updateCompanyProfile({ ...serverState, logoUrl: base64String });
          setCompanyData((prev) => ({ ...prev, logoUrl: updated.logoUrl || base64String }));
          toast.success(t("companyInfoPage.toastLogoSuccess"));
        } catch (error: any) {
          setCompanyData((prev) => ({ ...prev, logoUrl: prevLogoUrl || "" }));
          toast.error(error.message || t("companyInfoPage.toastLogoFailed"));
        } finally {
          logoSavingRef.current = false;
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(err.message || t("companyInfoPage.toastLogoProcessFailed"));
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyData.companyName.trim()) {
      toast.error(t("companyInfoPage.toastNameRequired"));
      return;
    }

    setCompanySaving(true);
    try {
      const updated = await updateCompanyProfile(companyData);
      setCompanyData((prev) => ({ ...prev, ...updated }));
      toast.success(t("companyInfoPage.toastSaveSuccess"));
    } catch (error: any) {
      toast.error(error.message || t("companyInfoPage.toastSaveFailed"));
    } finally {
      setCompanySaving(false);
    }
  };

  if (companyLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-0">
      <SettingsHeader
        title={t("companyInfoPage.title")}
        subtitle={t("companyInfoPage.subtitle")}
        icon={Building2}
        iconColor="#FF9500"
      />

      {isStaff && <ReadOnlyBanner feature={tCommon("companySettingsFeature")} />}

      <form onSubmit={handleUpdateCompany} className="space-y-6">
        <fieldset disabled={isStaff} className="space-y-6 border-none p-0 m-0 min-w-0">
          {/* Basic Company Information */}
          <IOSCard className="p-4 sm:p-6 space-y-6">
            <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#FF9500]" />
              {t("companyInfoPage.businessInfo")}
            </h3>

            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Logo Upload */}
              <div className="flex-shrink-0 w-full sm:w-auto flex flex-col items-center">
                <div className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)] flex items-center justify-center overflow-hidden group">
                  {companyData.logoUrl ? (
                    <img
                      src={companyData.logoUrl}
                      alt={t("companyInfoPage.logoAlt")}
                      className="w-full h-full object-contain p-2 bg-white dark:bg-black"
                    />
                  ) : (
                    <Building2 className="h-10 w-10 text-[var(--muted-foreground)]" />
                  )}
                  {!isStaff && (
                    <>
                      <label
                        htmlFor="logo-upload"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-[2px]"
                      >
                        <Upload className="h-7 w-7 text-white drop-shadow-md" />
                      </label>
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </>
                  )}
                </div>
                <p className="text-[11px] font-medium text-[var(--muted-foreground)] mt-2">{t("companyInfoPage.maxSize")}</p>
              </div>

              {/* Text Fields */}
              <div className="flex-1 w-full grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="companyName" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                    {t("companyInfoPage.companyName")} <span className="text-[#FF3B30]">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                    <IOSInput
                      id="companyName"
                      placeholder={t("companyInfoPage.companyNamePlaceholder")}
                      value={companyData.companyName}
                      onChange={(e: any) => setCompanyData({ ...companyData, companyName: e.target.value })}
                      className="pl-11 h-[46px]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="companyPhone" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                    {t("companyInfoPage.phone")}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                    <IOSInput
                      id="companyPhone"
                      placeholder={t("companyInfoPage.phonePlaceholder")}
                      value={companyData.phone}
                      onChange={(e: any) => setCompanyData({ ...companyData, phone: e.target.value })}
                      className="pl-11 h-[46px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="companyEmail" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                    {t("companyInfoPage.email")}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                    <IOSInput
                      id="companyEmail"
                      type="email"
                      placeholder={t("companyInfoPage.emailPlaceholder")}
                      value={companyData.email}
                      onChange={(e: any) => setCompanyData({ ...companyData, email: e.target.value })}
                      className="pl-11 h-[46px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label htmlFor="companyAddress" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                {t("companyInfoPage.address")}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 h-5 w-5 text-[var(--muted-foreground)]" />
                <Textarea
                  id="companyAddress"
                  placeholder={t("companyInfoPage.addressPlaceholder")}
                  value={companyData.address}
                  onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                  className="pl-11 pt-3 min-h-[90px] resize-none rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-[var(--border)] text-[15px] text-[var(--foreground)] focus:ring-[3px] focus:ring-[#007AFF]/30 focus:border-[#007AFF] outline-none transition-all placeholder:text-[var(--muted-foreground)] shadow-sm"
                />
              </div>
            </div>
          </IOSCard>

          {/* Bank Details */}
          <IOSCard className="p-4 sm:p-6 space-y-4">
            <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Landmark className="h-5 w-5 text-[#5AC8FA]" />
              {t("companyInfoPage.bankCredentials")}
            </h3>
            <p className="text-[13px] text-[var(--muted-foreground)] -mt-2">
              {t("companyInfoPage.bankCredentialsSubtitle")}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="space-y-1.5">
                <label htmlFor="bankName" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                  {t("companyInfoPage.bankName")}
                </label>
                <IOSInput
                  id="bankName"
                  placeholder={t("companyInfoPage.bankNamePlaceholder")}
                  value={companyData.bankName || ""}
                  onChange={(e: any) => setCompanyData({ ...companyData, bankName: e.target.value })}
                  className="h-[46px]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="accountNo" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                  {t("companyInfoPage.accountNumber")}
                </label>
                <IOSInput
                  id="accountNo"
                  placeholder={t("companyInfoPage.accountNumberPlaceholder")}
                  value={companyData.accountNo || ""}
                  onChange={(e: any) => setCompanyData({ ...companyData, accountNo: e.target.value })}
                  className="h-[46px] font-mono tracking-wide"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ifsc" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                  {t("companyInfoPage.ifscCode")}
                </label>
                <IOSInput
                  id="ifsc"
                  placeholder={t("companyInfoPage.ifscPlaceholder")}
                  value={companyData.ifsc || ""}
                  onChange={(e: any) => setCompanyData({ ...companyData, ifsc: e.target.value.toUpperCase() })}
                  className="h-[46px] font-mono uppercase"
                  maxLength={11}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="upiId" className="text-[13px] font-medium text-[var(--muted-foreground)]">
                  {t("companyInfoPage.upiId")}
                </label>
                <IOSInput
                  id="upiId"
                  placeholder={t("companyInfoPage.upiPlaceholder")}
                  value={companyData.upiId || ""}
                  onChange={(e: any) => setCompanyData({ ...companyData, upiId: e.target.value })}
                  className="h-[46px]"
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
              disabled={companySaving}
              className="px-8 text-[15px] font-semibold h-[46px] rounded-[12px]"
            >
              {companySaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("companyInfoPage.saveButton")}
            </IOSButton>
          </div>
        )}
      </form>
    </div>
  );
}

