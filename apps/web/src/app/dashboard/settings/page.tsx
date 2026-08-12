"use client";

import dynamic from "next/dynamic";
const AuditTrailPanel = dynamic(() => import("@/components/AuditTrailPanel"), { ssr: false });

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Shield,
  Key,
  LogOut,
  Bell,
  Loader2,
  Phone,
  AlertTriangle,
  Lock,
  Fingerprint,
  Building2,
  MapPin,
  CreditCard,
  Upload,
  Save,
  Landmark,
  Mail,
  Puzzle,
  Cog,
  Cpu,
  Package,
  ShoppingCart,
  FileText,
  Users,
  LayoutDashboard,
  Bot,
  UserCog,
  Info,
  Link2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  IOSCard,
  IOSButton,
  IOSInput
} from "@/components/ui/ios";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { variantsFadeUp } from "@/lib/motion";
import { toast } from "sonner";
import usePageStateCache from "@/infrastructure/state/pageStateCache";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { ReadOnlyBanner } from "@/components/AccessDenied";
import { exportWorkbook } from "@/lib/excel-export";
import { useTranslations } from "next-intl";
import { LanguageSwitcherFull } from "@/components/LanguageSwitcher";
import { Globe } from "lucide-react";
import { useCompanyProfile, type CompanyProfile } from "@/hooks/useCompanyProfile";
import {
  useModules,
  MODULE_META,
  LOCKED_MODULES,
  type ModuleConfig,
} from "@/hooks/useModules";

// Icon map for module meta rendering
const MODULE_ICON_MAP: Record<string, any> = {
  Cog,
  Cpu,
  Package,
  ShoppingCart,
  FileText,
  CreditCard,
  Users,
  LayoutDashboard,
  Bot,
  UserCog,
};

// CompanyDetails type imported from shared hook as CompanyProfile

function SettingsContent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"company" | "security" | "notifications" | "modules" | "audit" | "language" | "integrations">("company");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tTally = useTranslations("tally");

  // Tally integration state
  const [tallyConfig, setTallyConfig] = useState({
    tallyCompanyName: "",
    bridgeUrl: "http://localhost:4567",
    authToken: "",
  });
  const [tallyTesting, setTallyTesting] = useState(false);
  const [tallyConnected, setTallyConnected] = useState<boolean | null>(null);
  const [tallySaving, setTallySaving] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);

  // Shared company profile hook — single source of truth with OnboardingModal
  const {
    company: hookCompany,
    loading: companyLoading,
    updateCompanyProfile,
  } = useCompanyProfile();

  // Module management hook
  const {
    modules: enabledModules,
    updateModule: toggleModule,
  } = useModules();

  const [companySaving, setCompanySaving] = useState(false);
  // Guard: prevents the hookCompany sync effect from overwriting local state during an active logo save
  const logoSavingRef = useRef(false);
  const [companyData, setCompanyData] = useState<CompanyProfile>({
    companyName: "",
    address: "",
    phone: "",
    email: "",
    logoUrl: "",
    gstin: "",
    pan: "",
    bankName: "",
    accountNo: "",
    ifsc: "",
    upiId: "",
  });

  // Sync form state when hook data loads
  // Guarded by logoSavingRef to prevent stale hookCompany data from overwriting
  // the logo during an in-flight save (refinement #2 — race window)
  useEffect(() => {
    if (hookCompany && !logoSavingRef.current) {
      setCompanyData({
        companyName: hookCompany.companyName || "",
        address: hookCompany.address || "",
        phone: hookCompany.phone || "",
        email: hookCompany.email || "",
        logoUrl: hookCompany.logoUrl || "",
        gstin: hookCompany.gstin || "",
        pan: hookCompany.pan || "",
        bankName: hookCompany.bankName || "",
        accountNo: hookCompany.accountNo || "",
        ifsc: hookCompany.ifsc || "",
        upiId: hookCompany.upiId || "",
      });
    }
  }, [hookCompany]);

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [preferences, setPreferences] = useState({
    stock_alerts: true,
    order_alerts: true,
    emailNotifications: true,
    pushNotifications: false,
  });

  const isStaff = user?.role === "Staff";

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "security" || tab === "notifications" || tab === "company" || tab === "audit" || tab === "language" || tab === "modules" || tab === "integrations") {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  // Load tally config from bridge-health endpoint
  useEffect(() => {
    async function fetchTallyConfig() {
      try {
        const res = await fetch("/api/tally/bridge-health");
        const data = await res.json();
        if (data.data) {
          setTallyConfig({
            tallyCompanyName: data.data.tallyCompanyName || "",
            bridgeUrl: data.data.bridgeUrl || "http://localhost:4567",
            authToken: "", // Never send back — masked
          });
        }
      } catch {
        // Silently fail — settings will show empty
      }
    }
    fetchTallyConfig();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.error) {
        console.error("Error fetching profile:", data.error);
      } else {
        setUser(data);
        setPreferences(data.notification_preferences || { stock_alerts: true, order_alerts: true, emailNotifications: true, pushNotifications: false });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdatePreferences = async (newPrefs: Partial<typeof preferences>) => {
    const updatedPrefs = { ...preferences, ...newPrefs };
    setPreferences(updatedPrefs);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_preferences: updatedPrefs }),
      });
      const data = await res.json();

      if (data.error) {
        toast.error("Failed to update preferences");
      } else {
        toast.success("Preferences updated");
      }
    } catch (error) {
      toast.error("Failed to update preferences");
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyData.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    setCompanySaving(true);
    try {
      // Use shared hook — same endpoint as OnboardingModal
      const updated = await updateCompanyProfile(companyData);
      toast.success("Company details saved successfully!");
      setCompanyData(updated);
    } catch (error: any) {
      toast.error(error.message || "Failed to save company details");
    } finally {
      setCompanySaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: passwordData.newPassword }),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Password updated successfully!");
        setPasswordData({ newPassword: "", confirmPassword: "" });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setUpdating(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = e.target.files[0];
      // Reset file input so re-selecting the same file fires onChange
      e.target.value = '';

      if (file.size > 500 * 1024) {
        toast.error("Logo must be smaller than 500KB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const prevLogoUrl = companyData.logoUrl;
        // Optimistic preview
        setCompanyData({ ...companyData, logoUrl: base64String });
        // Auto-save: merge the new logo with the LAST SERVER STATE (hookCompany), not the
        // local form state, to avoid accidentally persisting half-edited fields (refinement #5).
        // hookCompany always has companyName which the API requires.
        logoSavingRef.current = true;
        try {
          const serverState = hookCompany || companyData;
          const updated = await updateCompanyProfile({ ...serverState, logoUrl: base64String });
          setCompanyData((prev) => ({ ...prev, logoUrl: updated.logoUrl || base64String }));
          toast.success("Logo saved successfully!");
        } catch (error: any) {
          // Revert on failure
          setCompanyData((prev) => ({ ...prev, logoUrl: prevLogoUrl || "" }));
          toast.error(error.message || "Failed to save logo");
        } finally {
          logoSavingRef.current = false;
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLogout = async (allDevices = false) => {
    try {
      usePageStateCache.getState().clearAll();
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const [inventoryRes, ordersRes, clientsRes, staffRes] = await Promise.all([
        fetch("/api/v1/inventory"),
        fetch("/api/v1/orders"),
        fetch("/api/v1/clients"),
        fetch("/api/employees")
      ]);

      const inventoryData = await inventoryRes.json();
      const ordersData = await ordersRes.json();
      const clientsData = await clientsRes.json();
      const staffData = await staffRes.json();

      const inventoryItems = Array.isArray(inventoryData.data) ? inventoryData.data : [];
      const ordersList = Array.isArray(ordersData.data) ? ordersData.data : [];
      const clientsList = Array.isArray(clientsData.data) ? clientsData.data : [];
      const staffList = Array.isArray(staffData.users) ? staffData.users : [];

      const formattedInventory = inventoryItems.map((item: any) => ({
        ...item,
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("en-IN") : "—"
      }));

      const formattedOrders = ordersList.map((order: any) => ({
        order_id: order.id,
        client_name: order.client?.name || order.clients?.name || "—",
        status: order.status,
        total_amount: order.total_amount || order.totalAmount || 0,
        date_formatted: new Date(order.createdAt).toLocaleDateString("en-IN"),
      }));

      const formattedClients = clientsList.map((client: any) => ({
        ...client,
        contact: client.phone || client.email || "—",
        total_orders: client.total_orders || 0,
        total_value: client.total_value || 0,
      }));

      const formattedStaff = staffList.map((emp: any) => ({
        ...emp,
        role_display: emp.designation || emp.role,
        createdAt: new Date(emp.createdAt).toLocaleDateString("en-IN")
      }));

      const monthlyRevenueMap: Record<string, { total: number, ordersCount: number, clients: Record<string, number> }> = {};
      
      ordersList.forEach((order: any) => {
          const date = new Date(order.createdAt);
          const monthStr = date.toLocaleString('default', { month: 'short', year: 'numeric' });
          const clientName = order.client?.name || order.clients?.name || "Unknown";
          const amount = order.total_amount || order.totalAmount || 0;

          if (!monthlyRevenueMap[monthStr]) {
              monthlyRevenueMap[monthStr] = { total: 0, ordersCount: 0, clients: {} };
          }
          
          monthlyRevenueMap[monthStr].total += amount;
          monthlyRevenueMap[monthStr].ordersCount += 1;
          monthlyRevenueMap[monthStr].clients[clientName] = (monthlyRevenueMap[monthStr].clients[clientName] || 0) + amount;
      });

      const formattedRevenue = Object.entries(monthlyRevenueMap).map(([month, data]) => {
          let topClient = "—";
          let maxSpend = 0;
          Object.entries(data.clients).forEach(([name, spend]) => {
              if (spend > maxSpend) {
                  topClient = name;
                  maxSpend = spend;
              }
          });

          return {
              month,
              revenue: data.total,
              ordersCount: data.ordersCount,
              topClient
          };
      });

      const sheets = [
        {
          sheetName: "Inventory",
          data: formattedInventory,
          columns: [
            { header: "Material name", key: "name" },
            { header: "Stock level", key: "quantity" },
            { header: "Unit cost", key: "purchase_cost_per_unit" },
            { header: "Critical stock", key: "min_stock_level" },
            { header: "Last updated", key: "updatedAt" },
          ]
        },
        {
          sheetName: "Orders",
          data: formattedOrders,
          columns: [
            { header: "Order ID", key: "order_id" },
            { header: "Client", key: "client_name" },
            { header: "Status", key: "status" },
            { header: "Amount", key: "total_amount" },
            { header: "Date", key: "date_formatted" },
          ]
        },
        {
          sheetName: "Revenue",
          data: formattedRevenue,
          columns: [
            { header: "Month", key: "month" },
            { header: "Total revenue", key: "revenue" },
            { header: "Orders count", key: "ordersCount" },
            { header: "Top client", key: "topClient" },
          ]
        },
        {
          sheetName: "Clients",
          data: formattedClients,
          columns: [
            { header: "Name", key: "name" },
            { header: "Contact", key: "contact" },
            { header: "Total orders", key: "total_orders" },
            { header: "Total value", key: "total_value" },
          ]
        },
        {
          sheetName: "Staff",
          data: formattedStaff,
          columns: [
            { header: "Name", key: "fullName" },
            { header: "Role", key: "role_display" },
            { header: "Join Date", key: "createdAt" },
            { header: "Status", key: "status" },
          ]
        }
      ];

      exportWorkbook(`Complete_Data_Export_${new Date().toISOString().split("T")[0]}.xlsx`, sheets);
      toast.success("Complete Data Export downloaded successfully!");

    } catch (error) {
      console.error("Export Error:", error);
      toast.error("Failed to export all data");
    } finally {
      setExportingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={variantsFadeUp}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-12 px-4 sm:px-0"
    >
      <div className="flex flex-col gap-1.5 pt-4 sm:pt-6">
        <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--foreground)]">{t("title")}</h1>
        <p className="text-[15px] sm:text-[17px] text-[var(--muted-foreground)]">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 sm:gap-8 md:grid-cols-4">
        {/* Left Column - Navigation */}
        <div className="md:col-span-1 space-y-4 sm:space-y-6">
          <IOSCard className="p-2 sm:p-2.5">
            <div className="space-y-1">
              <button
                className={`w-full flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-medium transition-colors ${activeTab === "company" ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}
                onClick={() => setActiveTab("company")}
              >
                <Building2 size={18} className={activeTab === "company" ? "text-[#FF9500]" : "opacity-70"} />
                Company Info
              </button>
              <button
                className={`w-full flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-medium transition-colors ${activeTab === "language" ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}
                onClick={() => setActiveTab("language")}
              >
                <Globe size={18} className={activeTab === "language" ? "text-[#007AFF]" : "opacity-70"} />
                {tCommon("language")}
              </button>
              <button
                className={`w-full flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-medium transition-colors ${activeTab === "security" ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}
                onClick={() => setActiveTab("security")}
              >
                <Shield size={18} className={activeTab === "security" ? "text-[#34C759]" : "opacity-70"} />
                {t("security")}
              </button>
              <button
                className={`w-full flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-medium transition-colors ${activeTab === "notifications" ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}
                onClick={() => setActiveTab("notifications")}
              >
                <Bell size={18} className={activeTab === "notifications" ? "text-[#FF2D55]" : "opacity-70"} />
                {t("notifications")}
              </button>
              <button
                className={`w-full flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-medium transition-colors ${activeTab === "modules" ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}
                onClick={() => setActiveTab("modules")}
              >
                <Puzzle size={18} className={activeTab === "modules" ? "text-[#FF9500]" : "opacity-70"} />
                Modules
              </button>
              <button
                className={`w-full flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-medium transition-colors text-[var(--muted-foreground)] hover:bg-[var(--muted)]`}
                onClick={() => window.location.href = "/dashboard/settings/team"}
              >
                <Users size={18} className="opacity-70" />
                Team
              </button>
              <button
                className={`w-full flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-medium transition-colors ${activeTab === "audit" ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}
                onClick={() => setActiveTab("audit")}
              >
                <Shield size={18} className={activeTab === "audit" ? "text-[#5856D6]" : "opacity-70"} />
                {t("auditTrails")}
              </button>
              <button
                className={`w-full flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-medium transition-colors ${activeTab === "integrations" ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}
                onClick={() => setActiveTab("integrations")}
              >
                <Link2 size={18} className={activeTab === "integrations" ? "text-[#FF9500]" : "opacity-70"} />
                {tTally("settings.title")}
              </button>
            </div>
          </IOSCard>
        </div>

        {/* Right Column - Content */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === "company" && (
              <motion.div
                key="company"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-1.5 mb-6">
                  <h2 className="text-[22px] font-semibold text-[var(--foreground)]">{t("companyDetails")}</h2>
                  <p className="text-[15px] text-[var(--muted-foreground)]">{t("companyDetailsSubtitle")}</p>
                </div>

                {companyLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
                  </div>
                ) : (
                  <form onSubmit={handleUpdateCompany} className="space-y-6">
                    {isStaff && (
                      <ReadOnlyBanner feature="company settings" />
                    )}
                    <fieldset disabled={isStaff} className="space-y-6 border-none p-0 m-0 min-w-0">
                      {/* Basic Company Information */}
                      <IOSCard className="p-1 sm:p-2">
                        <div className="p-4 sm:p-5 space-y-6">
                          <h3 className="text-[17px] font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-[#FF9500]" />
                            Business Information
                          </h3>

                          {/* Logo Upload */}
                          <div className="flex flex-col sm:flex-row items-start gap-6">
                            <div className="flex-shrink-0 w-full sm:w-auto flex flex-col items-center">
                              <div className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)] flex items-center justify-center overflow-hidden group">
                                {companyData.logoUrl ? (
                                  <img
                                    src={companyData.logoUrl}
                                    alt="Company Logo"
                                    className="w-full h-full object-contain p-2 bg-white dark:bg-black"
                                  />
                                ) : (
                                  <Building2 className="h-10 w-10 text-[var(--muted-foreground)]" />
                                )}
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
                              </div>
                              <p className="text-[11px] font-medium text-[var(--muted-foreground)] mt-3">{t("maxFileSize")}</p>
                            </div>
                            <div className="flex-1 w-full grid gap-5 sm:grid-cols-2">
                              <div className="space-y-2 sm:col-span-2">
                                <label htmlFor="companyName" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                                  {t("companyName")} <span className="text-[#FF3B30]">*</span>
                                </label>
                                <div className="relative">
                                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                                  <IOSInput
                                    id="companyName"
                                    placeholder="Your Company Name Pvt. Ltd."
                                    value={companyData.companyName}
                                    onChange={(e: any) => setCompanyData({ ...companyData, companyName: e.target.value })}
                                    className="pl-11 h-[48px]"
                                    required
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label htmlFor="companyPhone" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("phone")}</label>
                                <div className="relative">
                                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                                  <IOSInput
                                    id="companyPhone"
                                    placeholder="+91 22 1234 5678"
                                    value={companyData.phone}
                                    onChange={(e: any) => setCompanyData({ ...companyData, phone: e.target.value })}
                                    className="pl-11 h-[48px]"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label htmlFor="companyEmail" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("email")}</label>
                                <div className="relative">
                                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                                  <IOSInput
                                    id="companyEmail"
                                    type="email"
                                    placeholder="billing@yourcompany.com"
                                    value={companyData.email}
                                    onChange={(e: any) => setCompanyData({ ...companyData, email: e.target.value })}
                                    className="pl-11 h-[48px]"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2">
                            <label htmlFor="companyAddress" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("address")}</label>
                            <div className="relative">
                              <MapPin className="absolute left-3.5 top-3.5 h-5 w-5 text-[var(--muted-foreground)]" />
                              <Textarea
                                id="companyAddress"
                                placeholder={"123 Industrial Area, Sector 5\nMumbai, Maharashtra - 400001"}
                                value={companyData.address}
                                onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                className="pl-11 pt-3.5 min-h-[96px] resize-none rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-[var(--border)] text-[16px] text-[var(--foreground)] focus:ring-[3px] focus:ring-[#007AFF]/30 focus:border-[#007AFF] outline-none transition-all placeholder:text-[var(--muted-foreground)] shadow-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </IOSCard>

                      {/* Tax Details */}
                      <IOSCard className="p-1 sm:p-2">
                        <div className="p-4 sm:p-5 space-y-4">
                          <h3 className="text-[17px] font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-[#34C759]" />
                            Tax Information
                          </h3>
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label htmlFor="gstin" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("gstin")}</label>
                              <IOSInput
                                id="gstin"
                                placeholder="27AABCU9603R1ZM"
                                value={companyData.gstin}
                                onChange={(e: any) => setCompanyData({ ...companyData, gstin: e.target.value.toUpperCase() })}
                                className="h-[48px] font-mono uppercase"
                                maxLength={15}
                              />
                              <p className="text-[11px] text-[var(--muted-foreground)] ml-1">{t("gstinHint")}</p>
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="pan" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("pan")}</label>
                              <IOSInput
                                id="pan"
                                placeholder="AABCU9603R"
                                value={companyData.pan}
                                onChange={(e: any) => setCompanyData({ ...companyData, pan: e.target.value.toUpperCase() })}
                                className="h-[48px] font-mono uppercase"
                                maxLength={10}
                              />
                              <p className="text-[11px] text-[var(--muted-foreground)] ml-1">{t("panHint")}</p>
                            </div>
                          </div>
                        </div>
                      </IOSCard>

                      {/* Bank Details */}
                      <IOSCard className="p-1 sm:p-2">
                        <div className="p-4 sm:p-5 space-y-4">
                          <h3 className="text-[17px] font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                            <Landmark className="h-5 w-5 text-[#5AC8FA]" />
                            {t("bankDetails")}
                          </h3>
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label htmlFor="bankName" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("bankName")}</label>
                              <IOSInput
                                id="bankName"
                                placeholder="State Bank of India"
                                value={companyData.bankName}
                                onChange={(e: any) => setCompanyData({ ...companyData, bankName: e.target.value })}
                                className="h-[48px]"
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="accountNo" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("accountNumber")}</label>
                              <IOSInput
                                id="accountNo"
                                placeholder="1234567890123456"
                                value={companyData.accountNo}
                                onChange={(e: any) => setCompanyData({ ...companyData, accountNo: e.target.value })}
                                className="h-[48px] font-mono tracking-wider"
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="ifsc" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("ifscCode")}</label>
                              <IOSInput
                                id="ifsc"
                                placeholder="SBIN0001234"
                                value={companyData.ifsc}
                                onChange={(e: any) => setCompanyData({ ...companyData, ifsc: e.target.value.toUpperCase() })}
                                className="h-[48px] font-mono uppercase"
                                maxLength={11}
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="upiId" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("upiId")}</label>
                              <IOSInput
                                id="upiId"
                                placeholder="yourcompany@sbi"
                                value={companyData.upiId}
                                onChange={(e: any) => setCompanyData({ ...companyData, upiId: e.target.value })}
                                className="h-[48px]"
                              />
                            </div>
                          </div>
                        </div>
                      </IOSCard>
                    </fieldset>

                    {/* Save Button - Hidden for Staff */}
                    {!isStaff && (
                      <div className="flex justify-end pt-2">
                        <IOSButton
                          type="submit"
                          variant="filled"
                          color="blue"
                          disabled={companySaving}
                          className="px-8 text-[15px] font-semibold h-[44px]"
                        >
                          {companySaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          {t("saveCompanyDetails")}
                        </IOSButton>
                      </div>
                    )}
                  </form>
                )}
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-1.5 mb-6">
                  <h2 className="text-[22px] font-semibold text-[var(--foreground)]">{t("securitySettings")}</h2>
                  <p className="text-[15px] text-[var(--muted-foreground)]">{t("securitySubtitle")}</p>
                </div>

                <IOSCard className="p-1 sm:p-2">
                  <div className="p-4 sm:p-5">
                    <h3 className="text-[17px] font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                      <Lock className="h-5 w-5 text-[#FF3B30]" />
                      {t("authentication")}
                    </h3>

                    <div className="flex flex-col gap-3">
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted)] transition-all cursor-pointer group active:scale-[0.99]">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-[12px] bg-[#007AFF]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Key className="h-5 w-5 text-[#007AFF]" />
                              </div>
                              <div>
                                <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("changePassword")}</p>
                                <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5">{t("changePasswordSubtitle")}</p>
                              </div>
                            </div>
                            <IOSButton variant="gray" className="rounded-full px-4 text-[13px] font-semibold">{tCommon("update")}</IOSButton>
                          </div>
                        </DialogTrigger>
                        <DialogContent fullScreenMobile className="sm:max-w-md bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px] p-0 overflow-hidden">
                          <div className="p-6">
                            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(255,255,255,0.06))", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <KeyRound className="h-[18px] w-[18px] text-[#60a5fa]" />
                              </div>
                              <div>
                                <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>{t("changePassword")}</DialogTitle>
                                <DialogDescription style={{ fontSize: 13, color: "#64748b", lineHeight: "18px", margin: "2px 0 0" }}>{t("enterNewPassword")}</DialogDescription>
                              </div>
                            </div>
                            <div className="space-y-4 py-6">
                              <div className="space-y-1.5">
                                <label htmlFor="new-password" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("newPassword")}</label>
                                <IOSInput
                                  id="new-password"
                                  type="password"
                                  value={passwordData.newPassword}
                                  onChange={(e: any) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                  className="h-[44px]"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label htmlFor="confirm-password" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("confirmNewPassword")}</label>
                                <IOSInput
                                  id="confirm-password"
                                  type="password"
                                  value={passwordData.confirmPassword}
                                  onChange={(e: any) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                  className="h-[44px]"
                                />
                              </div>
                            </div>
                            <DialogFooter className="flex gap-2 pt-2 border-t border-[var(--border)] border-x-[-24px] mx-[-24px] px-6 pb-2">
                              <IOSButton
                                variant="filled"
                                color="blue"
                                onClick={handleUpdatePassword}
                                disabled={updating}
                                className="w-full text-[15px] font-semibold"
                              >
                                {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {updating ? t("updating") : t("updatePassword")}
                              </IOSButton>
                            </DialogFooter>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted)] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-[12px] bg-[#34C759]/10 flex items-center justify-center">
                            <Fingerprint className="h-5 w-5 text-[#34C759]" />
                          </div>
                          <div>
                            <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("twoFactorAuth")}</p>
                            <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5 text-balance">{t("twoFactorAuthSubtitle")}</p>
                          </div>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 pt-0">
                    <IOSButton
                      variant="destructive"
                      className="w-full rounded-[12px] text-[15px] font-semibold h-[48px] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30]"
                      onClick={() => handleLogout(true)}
                    >
                      <LogOut className="mr-2 h-5 w-5" />
                      {t("signOutAllDevices")}
                    </IOSButton>
                  </div>
                </IOSCard>

                <IOSCard className="p-1 sm:p-2 border border-[#007AFF]/30 bg-[#007AFF]/5 dark:bg-[#007AFF]/10">
                  <div className="p-4 sm:p-5">
                    <h3 className="text-[17px] font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                       <Upload className="h-5 w-5 text-[#007AFF]" />
                       {t("dataExport")}
                    </h3>
                    <p className="text-[13px] text-[var(--muted-foreground)] mb-5">{t("dataExportDescription")}</p>
                    <IOSButton 
                       variant="filled" 
                       color="blue" 
                       className="rounded-[12px] font-semibold px-8 h-[44px]"
                       onClick={handleExportAll}
                       disabled={exportingAll}
                    >
                      {exportingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t("exportAllData")}
                    </IOSButton>
                  </div>
                </IOSCard>

                <IOSCard className="border border-[#FF3B30]/30 shadow-none bg-[#FF3B30]/5 dark:bg-[#FF3B30]/10 p-1 sm:p-2">
                  <div className="p-4 sm:p-5">
                    <h3 className="text-[17px] font-semibold text-[#FF3B30] mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Danger Zone
                    </h3>
                    <p className="text-[13px] text-[var(--muted-foreground)] mb-5">{t("dangerZoneDescription")}</p>
                    <IOSButton variant="filled" color="red" className="rounded-[12px] font-semibold px-8 h-[44px]">
                      {t("deleteAccount")}
                    </IOSButton>
                  </div>
                </IOSCard>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-1.5 mb-6">
                  <h2 className="text-[22px] font-semibold text-[var(--foreground)]">{t("notificationsTitle")}</h2>
                  <p className="text-[15px] text-[var(--muted-foreground)]">{t("notificationsSubtitle")}</p>
                </div>

                <IOSCard className="p-1 sm:p-2">
                  <div className="p-4 sm:p-5">
                    <h3 className="text-[17px] font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                      <Bell className="h-5 w-5 text-[#FF9500]" />
                      {t("systemAlerts")}
                    </h3>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
                        <div className="space-y-0.5">
                          <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("stockAlerts")}</p>
                          <p className="text-[13px] text-[var(--muted-foreground)]">{t("stockAlertsDescription")}</p>
                        </div>
                        <Switch
                          checked={preferences.stock_alerts}
                          onCheckedChange={(checked) => handleUpdatePreferences({ stock_alerts: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
                        <div className="space-y-0.5">
                          <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("orderAlerts")}</p>
                          <p className="text-[13px] text-[var(--muted-foreground)]">{t("orderAlertsDescription")}</p>
                        </div>
                        <Switch
                          checked={preferences.order_alerts}
                          onCheckedChange={(checked) => handleUpdatePreferences({ order_alerts: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </IOSCard>

                <IOSCard className="p-1 sm:p-2">
                  <div className="p-4 sm:p-5">
                    <h3 className="text-[17px] font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                      <Mail className="h-5 w-5 text-[#007AFF]" />
                      {t("notificationChannels")}
                    </h3>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
                        <div className="space-y-0.5">
                          <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("emailNotifications")}</p>
                          <p className="text-[13px] text-[var(--muted-foreground)]">{t("emailNotificationsDescription")}</p>
                        </div>
                        <Switch
                          checked={preferences.emailNotifications}
                          onCheckedChange={(checked) => handleUpdatePreferences({ emailNotifications: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)]">
                        <div className="space-y-0.5">
                          <p className="text-[15px] font-semibold text-[var(--foreground)]">{t("pushNotifications")}</p>
                          <p className="text-[13px] text-[var(--muted-foreground)]">{t("pushNotificationsDescription")}</p>
                        </div>
                        <Switch
                          checked={preferences.pushNotifications}
                          onCheckedChange={(checked) => handleUpdatePreferences({ pushNotifications: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </IOSCard>
              </motion.div>
            )}

            {activeTab === "modules" && (
              <motion.div
                key="modules"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-1.5 mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #FF9500, #FF6B00)' }}
                    >
                      <Puzzle size={22} color="white" />
                    </div>
                    <div>
                      <h2 className="text-[22px] font-semibold text-[var(--foreground)]">Modules</h2>
                      <p className="text-[15px] text-[var(--muted-foreground)]">Enable or disable features to customize your workspace</p>
                    </div>
                  </div>
                </div>

                <IOSCard className="p-1 sm:p-2">
                  <div className="p-4 sm:p-5 space-y-3">
                    {/* Toggleable modules */}
                    {(["production", "machines", "inventory", "orders", "billing", "payments", "clients"] as (keyof ModuleConfig)[]).map((key) => {
                      const meta = MODULE_META[key];
                      const IconComponent = MODULE_ICON_MAP[meta.icon];
                      const isEnabled = enabledModules[key];

                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted)] transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-10 h-10 rounded-[12px] flex items-center justify-center"
                              style={{ background: `${meta.color}18` }}
                            >
                              {IconComponent && <IconComponent className="h-5 w-5" style={{ color: meta.color }} />}
                            </div>
                            <div>
                              <p className="text-[15px] font-semibold text-[var(--foreground)]">{meta.label}</p>
                              <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5">{meta.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => {
                              toggleModule(key, checked);
                              toast.success(`${meta.label} ${checked ? 'enabled' : 'disabled'}. Changes reflected in sidebar.`);
                            }}
                          />
                        </div>
                      );
                    })}

                    {/* Divider */}
                    <div className="border-t border-[var(--border)] my-2" />

                    {/* Locked modules */}
                    {(["dashboard", "ai_assistant", "staff_roles"] as (keyof ModuleConfig)[]).map((key) => {
                      const meta = MODULE_META[key];
                      const IconComponent = MODULE_ICON_MAP[meta.icon];

                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)] opacity-60"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-10 h-10 rounded-[12px] flex items-center justify-center"
                              style={{ background: `${meta.color}18` }}
                            >
                              {IconComponent && <IconComponent className="h-5 w-5" style={{ color: meta.color }} />}
                            </div>
                            <div>
                              <p className="text-[15px] font-semibold text-[var(--foreground)]">{meta.label}</p>
                              <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5">{meta.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--muted)] text-[var(--muted-foreground)]">
                              <Lock className="h-3 w-3" />
                              Always included
                            </span>
                            <Switch checked={true} disabled />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </IOSCard>

                {/* Info box */}
                <IOSCard className="p-1 sm:p-2 border border-[#007AFF]/20 bg-[#007AFF]/5 dark:bg-[#007AFF]/8">
                  <div className="p-4 sm:p-5 flex items-start gap-3">
                    <Info className="h-5 w-5 text-[#007AFF] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[14px] font-medium text-[var(--foreground)]">Your data is always safe</p>
                      <p className="text-[13px] text-[var(--muted-foreground)] mt-1">Disabled modules are hidden from the sidebar but no data is deleted. Re-enable a module anytime to access your existing data.</p>
                    </div>
                  </div>
                </IOSCard>
              </motion.div>
            )}

            {activeTab === "audit" && (
              <motion.div
                key="audit"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-1.5 mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, var(--chart-5), var(--chart-4))' }}
                    >
                      <Shield size={22} color="white" />
                    </div>
                    <div>
                      <h2 className="text-[22px] font-semibold text-[var(--foreground)]">{t("auditTrail")}</h2>
                      <p className="text-[15px] text-[var(--muted-foreground)]">{t("auditTrailSubtitle")}</p>
                    </div>
                  </div>
                </div>
                <AuditTrailPanel />
              </motion.div>
            )}
            {activeTab === "integrations" && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-1.5 mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #FF9500, #FF5E3A)' }}
                    >
                      <Link2 size={22} color="white" />
                    </div>
                    <div>
                      <h2 className="text-[22px] font-semibold text-[var(--foreground)]">{tTally("settings.title")}</h2>
                      <p className="text-[15px] text-[var(--muted-foreground)]">{tTally("settings.setupHint")}</p>
                    </div>
                  </div>
                </div>

                {isStaff && (
                  <ReadOnlyBanner feature="Tally Integration" />
                )}

                <fieldset disabled={isStaff} className="space-y-6 border-none p-0 m-0 min-w-0">
                  <IOSCard className="p-1 sm:p-2">
                    <div className="p-4 sm:p-5 space-y-6">
                      <h3 className="text-[17px] font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-[#FF9500]" />
                        {tTally("settings.title")}
                      </h3>

                      {/* Tally Company Name */}
                      <div className="space-y-2">
                        <label htmlFor="tallyCompanyName" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                          {tTally("settings.companyName")}
                        </label>
                        <IOSInput
                          id="tallyCompanyName"
                          placeholder={tTally("settings.companyNamePlaceholder")}
                          value={tallyConfig.tallyCompanyName}
                          onChange={(e: any) => setTallyConfig({ ...tallyConfig, tallyCompanyName: e.target.value })}
                          className="h-[48px]"
                        />
                      </div>

                      {/* Bridge URL */}
                      <div className="space-y-2">
                        <label htmlFor="bridgeUrl" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                          {tTally("settings.bridgeUrl")}
                        </label>
                        <IOSInput
                          id="bridgeUrl"
                          placeholder="http://localhost:4567"
                          value={tallyConfig.bridgeUrl}
                          onChange={(e: any) => setTallyConfig({ ...tallyConfig, bridgeUrl: e.target.value })}
                          className="h-[48px] font-mono"
                        />
                      </div>

                      {/* Auth Token */}
                      <div className="space-y-2">
                        <label htmlFor="authToken" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                          {tTally("settings.authToken")}
                        </label>
                        <div className="relative">
                          <IOSInput
                            id="authToken"
                            type={showAuthToken ? "text" : "password"}
                            placeholder="••••••••"
                            value={tallyConfig.authToken}
                            onChange={(e: any) => setTallyConfig({ ...tallyConfig, authToken: e.target.value })}
                            className="h-[48px] font-mono pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAuthToken(!showAuthToken)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                          >
                            {showAuthToken ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Test Connection */}
                      <div className="flex items-center gap-3 pt-2">
                        <IOSButton
                          type="button"
                          variant="gray"
                          disabled={tallyTesting}
                          className="px-6 text-[13px] font-semibold h-[40px]"
                          onClick={async () => {
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
                          }}
                        >
                          {tallyTesting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Link2 className="mr-2 h-4 w-4" />
                          )}
                          {tallyTesting ? tTally("settings.testing") : tTally("settings.testConnection")}
                        </IOSButton>

                        {tallyConnected === true && (
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle2 size={16} />
                            <span className="text-[13px] font-medium">{tTally("settings.connected")}</span>
                          </div>
                        )}
                        {tallyConnected === false && (
                          <div className="flex items-center gap-1.5 text-red-500">
                            <XCircle size={16} />
                            <span className="text-[13px] font-medium">{tTally("settings.notConnected")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </IOSCard>
                </fieldset>

                {/* Save Button */}
                {!isStaff && (
                  <div className="flex justify-end pt-2">
                    <IOSButton
                      type="button"
                      variant="filled"
                      color="blue"
                      disabled={tallySaving}
                      className="px-8 text-[15px] font-semibold h-[44px]"
                      onClick={async () => {
                        setTallySaving(true);
                        try {
                          const res = await fetch("/api/profile/company", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              tally_company_name: tallyConfig.tallyCompanyName,
                              tally_bridge_url: tallyConfig.bridgeUrl,
                              ...(tallyConfig.authToken ? { tally_auth_token: tallyConfig.authToken } : {}),
                            }),
                          });
                          if (!res.ok) throw new Error("Failed to save");
                          toast.success("Tally settings saved!");
                        } catch (err: any) {
                          toast.error(err.message || "Failed to save Tally settings");
                        } finally {
                          setTallySaving(false);
                        }
                      }}
                    >
                      {tallySaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {tTally("settings.saveTallySettings")}
                    </IOSButton>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "language" && (
              <motion.div
                key="language"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-1.5 mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, var(--primary), var(--chart-3))' }}
                    >
                      <Globe size={22} color="white" />
                    </div>
                    <div>
                      <h2 className="text-[22px] font-semibold text-[var(--foreground)]">{t("languageSection")}</h2>
                      <p className="text-[15px] text-[var(--muted-foreground)]">{t("languageSectionSubtitle")}</p>
                    </div>
                  </div>
                </div>

                <IOSCard className="p-1 sm:p-2">
                  <div className="p-4 sm:p-5">
                    <LanguageSwitcherFull />
                  </div>
                </IOSCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
