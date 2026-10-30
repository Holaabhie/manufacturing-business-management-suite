import { useTranslations } from "next-intl";
import { X, Building2, User, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { VendorFormData, VendorFormErrors } from "./types";

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorForm: VendorFormData;
  setVendorForm: React.Dispatch<React.SetStateAction<VendorFormData>>;
  vendorErrors: VendorFormErrors;
  setVendorErrors: React.Dispatch<React.SetStateAction<VendorFormErrors>>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddVendorModal({
  isOpen,
  onClose,
  vendorForm,
  setVendorForm,
  vendorErrors,
  setVendorErrors,
  isSubmitting,
  onSubmit,
}: AddVendorModalProps) {
  const tVendorModal = useTranslations("purchasing.vendorModal");
  const tCommon = useTranslations("common");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        fullScreenMobile
        className="sm:max-w-[560px] max-h-[90dvh] md:max-h-[85dvh] flex flex-col overflow-hidden p-0 rounded-t-[24px] sm:rounded-[24px] border-[var(--border)] bg-[var(--card)]"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--muted-foreground)]/25" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header */}
          <div className="shrink-0 px-5 pt-2 pb-3.5 sm:pt-4 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--card)]/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center shrink-0 shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-[var(--foreground)] truncate">
                  {tVendorModal("titleNew")}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                  {tVendorModal("subtitle")}
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/60 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
            {/* Section 1: Basic details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1.5 border-b border-[var(--border)]/60">
                <User className="w-3.5 h-3.5 text-sky-500" />
                <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                  {tVendorModal("sectionBasic")}
                </h3>
              </div>

              {/* Vendor Name */}
              <div>
                <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                  {tVendorModal("lblName")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={vendorForm.name}
                  onChange={(e) => {
                    setVendorForm({ ...vendorForm, name: e.target.value });
                    if (vendorErrors.name)
                      setVendorErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder={tVendorModal("placeholderName")}
                  className={cn(
                    "w-full h-12 px-3.5 text-sm rounded-xl bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] placeholder:text-[var(--muted-foreground)]/50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all",
                    vendorErrors.name &&
                      "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                />
                {vendorErrors.name && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">
                    {vendorErrors.name}
                  </p>
                )}
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                    {tVendorModal("lblContact")}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vendorForm.contactPerson}
                    onChange={(e) => {
                      setVendorForm({
                        ...vendorForm,
                        contactPerson: e.target.value,
                      });
                      if (vendorErrors.contactPerson)
                        setVendorErrors((prev) => ({
                          ...prev,
                          contactPerson: undefined,
                        }));
                    }}
                    placeholder={tVendorModal("placeholderContact")}
                    className={cn(
                      "w-full h-12 px-3.5 text-sm rounded-xl bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] placeholder:text-[var(--muted-foreground)]/50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all",
                      vendorErrors.contactPerson &&
                        "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                  />
                  {vendorErrors.contactPerson && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">
                      {vendorErrors.contactPerson}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                    {tVendorModal("lblPhone")} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-semibold text-[var(--muted-foreground)] select-none bg-[var(--muted)]/60 px-1.5 py-1 rounded">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={vendorForm.phone
                        .replace(/^\+91/, "")
                        .replace(/\D/g, "")}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setVendorForm({ ...vendorForm, phone: digits });
                        if (vendorErrors.phone)
                          setVendorErrors((prev) => ({
                            ...prev,
                            phone: undefined,
                          }));
                      }}
                      placeholder={tVendorModal("placeholderPhone")}
                      className={cn(
                        "w-full h-12 pl-14 pr-3.5 text-sm rounded-xl bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] placeholder:text-[var(--muted-foreground)]/50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-mono tracking-wide",
                        vendorErrors.phone &&
                          "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      )}
                    />
                  </div>
                  {vendorErrors.phone ? (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">
                      {vendorErrors.phone}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                      10-digit mobile number
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Tax & contact */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1.5 border-b border-[var(--border)]/60">
                <Building2 className="w-3.5 h-3.5 text-sky-500" />
                <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                  {tVendorModal("sectionTaxContact")}
                </h3>
              </div>

              {/* Email & GSTIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                    {tVendorModal("lblEmail")}
                  </label>
                  <input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => {
                      setVendorForm({ ...vendorForm, email: e.target.value });
                      if (vendorErrors.email)
                        setVendorErrors((prev) => ({
                          ...prev,
                          email: undefined,
                        }));
                    }}
                    placeholder={tVendorModal("placeholderEmail")}
                    className={cn(
                      "w-full h-12 px-3.5 text-sm rounded-xl bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] placeholder:text-[var(--muted-foreground)]/50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all",
                      vendorErrors.email &&
                        "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                  />
                  {vendorErrors.email && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">
                      {vendorErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                    {tVendorModal("lblGstin")}
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={vendorForm.gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().slice(0, 15);
                      setVendorForm({ ...vendorForm, gstin: val });
                      if (vendorErrors.gstin)
                        setVendorErrors((prev) => ({
                          ...prev,
                          gstin: undefined,
                        }));
                    }}
                    placeholder={tVendorModal("placeholderGstin")}
                    className={cn(
                      "w-full h-12 px-3.5 text-sm rounded-xl bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] placeholder:text-[var(--muted-foreground)]/50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-mono uppercase tracking-wider",
                      vendorErrors.gstin &&
                        "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                  />
                  {vendorErrors.gstin ? (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">
                      {vendorErrors.gstin}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                      {tVendorModal("helperGstin")}
                    </p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                  {tVendorModal("lblAddress")}
                </label>
                <textarea
                  rows={3}
                  value={vendorForm.address}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, address: e.target.value })
                  }
                  placeholder={tVendorModal("placeholderAddress")}
                  className="w-full py-2.5 px-3.5 text-sm rounded-xl bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] placeholder:text-[var(--muted-foreground)]/50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 px-5 py-3 border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur pb-[max(env(safe-area-inset-bottom),14px)]">
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-12 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 font-medium text-sm transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                {tVendorModal("btnCancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{tCommon("loading")}</span>
                  </>
                ) : (
                  <span>{tVendorModal("btnSave")}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
