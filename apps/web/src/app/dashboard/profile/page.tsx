"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { USER_UPDATED_EVENT } from "@/lib/events";
import {
  User,
  Mail,
  Key,
  LogOut,
  Camera,
  Loader2,
  Phone,
  Briefcase,
  UserPlus,
  Users,
  ArrowLeftRight,
  Check,
  Calendar,
  Clock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  IOSCard,
  IOSButton,
  IOSBadge,
  IOSInput,
} from "@/components/ui/ios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { variantsFadeUp } from "@/lib/motion";
import { toast } from "sonner";
import usePageStateCache from "@/infrastructure/state/pageStateCache";
import { clearAllDrafts } from "@/hooks/useDraftPersistence";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

/* ── Circuit Pattern SVG ──────────────────────────── */
function CircuitPattern() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-[var(--primary)]"
      style={{ opacity: 0.12 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="circuit-profile"
          width="80"
          height="80"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 40 H30 V10 H80 M40 0 V30 H80 M40 80 V50 H80"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <circle cx="30" cy="10" r="2.5" fill="currentColor" />
          <circle cx="40" cy="30" r="2.5" fill="currentColor" />
          <circle cx="40" cy="50" r="2.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuit-profile)" />
    </svg>
  );
}

/* ── Stat Pill ────────────────────────────────────── */
function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-[12px] text-[var(--muted-foreground)]">
      {icon} {text}
    </span>
  );
}

/* ── Summary Row ──────────────────────────────────── */
function SummaryRow({
  label,
  value,
  valueClass = "text-[var(--foreground)]",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[var(--muted-foreground)]">{label}</dt>
      <dd className={`font-medium ${valueClass}`}>{value}</dd>
    </div>
  );
}

/* ── Empty Tab State ──────────────────────────────── */
function EmptyTabState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--border)] py-16 text-center">
      <X className="h-6 w-6 text-[var(--muted-foreground)]" style={{ opacity: 0.4 }} />
      <h4 className="mt-3 font-medium text-[var(--foreground)]">{title}</h4>
      <p className="mt-1 max-w-xs text-[13px] text-[var(--muted-foreground)]">{desc}</p>
    </div>
  );
}

function ProfileContent() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"personal" | "security" | "preferences">("personal");

  // Account management state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);
  const [addAccountData, setAddAccountData] = useState({ email: "", password: "", role: "Staff" });
  const [addingAccount, setAddingAccount] = useState(false);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<Array<{ id: string; email: string; role: string; fullName?: string; avatar_url?: string }>>([]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    role: "Admin",
  });

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.error) {
        console.error("Error fetching profile:", data.error);
      } else {
        setProfile(data);
        setUser(data);
        setFormData({
          full_name: data.full_name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          role: data.role || "Admin",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch linked accounts from API
  const fetchLinkedAccounts = async () => {
    try {
      const res = await fetch("/api/auth/linked-accounts");
      const data = await res.json();
      if (data.accounts) {
        setLinkedAccounts(data.accounts);
      }
    } catch (error) {
      console.error("Error fetching linked accounts:", error);
    }
  };

  // Switch to a linked account
  const handleSwitchAccount = async (targetUserId: string, targetEmail: string, targetRole: string) => {
    setSwitchingAccountId(targetUserId);
    try {
      const res = await fetch("/api/auth/switch-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to switch account");
        if (res.status === 401) {
          // Session invalid — redirect to login
          window.location.href = "/login";
        }
        return;
      }

      toast.success(`Switched to ${targetRole} Account (${targetEmail})`);
      setIsSwitchAccountOpen(false);

      // Full page reload to refresh all contexts (session, nav, role)
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error("Failed to switch account. Please try again.");
      console.error("Switch account error:", error);
    } finally {
      setSwitchingAccountId(null);
    }
  };

  // Handle linking a new account
  const handleLinkAccount = async () => {
    setAddingAccount(true);
    try {
      const res = await fetch("/api/auth/linked-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addAccountData.email,
          password: addAccountData.password,
          loginType: addAccountData.role === "Staff" ? "staff" : "admin",
          employeeId: addAccountData.role === "Staff" ? addAccountData.email : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to link account");
        return;
      }

      setLinkedAccounts((prev) => [...prev, data.account]);
      toast.success(`Account ${data.account.email} linked successfully!`);
      setAddAccountData({ email: "", password: "", role: "Staff" });
      setIsAddAccountOpen(false);
    } catch (error) {
      toast.error("Failed to link account. Please try again.");
      console.error("Link account error:", error);
    } finally {
      setAddingAccount(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchLinkedAccounts();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          role: formData.role,
        }),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Profile updated successfully!");
        fetchProfile();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        try {
          const res = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatar_url: base64String }),
          });
          const data = await res.json();

          if (data.error) {
            toast.error(data.error);
          } else {
            toast.success("Avatar updated successfully!");
            await fetchProfile();
            window.dispatchEvent(new CustomEvent(USER_UPDATED_EVENT));
          }
        } catch (error: any) {
          toast.error(error.message || "Failed to update avatar");
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(error.message);
      setUploading(false);
    }
  };

  const handleLogout = async (allDevices = false) => {
    try {
      usePageStateCache.getState().clearAll();
      clearAllDrafts();
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const getInitials = () => {
    if (formData.full_name) {
      return formData.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.substring(0, 1).toUpperCase() || "U";
  };

  const getMemberSinceDate = () => {
    if (profile?.created_at) {
      return new Date(profile.created_at).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
    }
    return "Jan 2024";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const tabs = [
    { id: "personal" as const, label: "Personal Info" },
    { id: "security" as const, label: "Security" },
    { id: "preferences" as const, label: "Preferences" },
  ];

  return (
    <motion.div
      variants={variantsFadeUp}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto pb-12 px-4 sm:px-6 overflow-x-hidden min-w-0"
    >
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1.5 pt-4 sm:pt-6">
        <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--foreground)]">Profile</h1>
        <p className="text-[15px] sm:text-[17px] text-[var(--muted-foreground)]">Manage your account and personal details.</p>
      </div>

      {/* ── Hero / Cover Card ── */}
      <IOSCard variant="elevated" className="mt-6 sm:mt-8 overflow-hidden border-none p-0">
        {/* Cover gradient with circuit pattern */}
        <div className="relative h-28 sm:h-40 bg-gradient-to-br from-[var(--muted)] via-[var(--muted)] to-[rgba(0,122,255,0.08)] dark:from-[#1C1C1E] dark:via-[#1C1C1E] dark:to-[rgba(10,132,255,0.15)]">
          <CircuitPattern />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--card)]/60 to-transparent" />
        </div>

        {/* Profile info below cover */}
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col items-start gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {/* Avatar with camera button */}
              <div className="relative group">
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-[var(--card)] shadow-[var(--shadow-sm)] group-hover:opacity-90 transition-all duration-300">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[#5856D6] text-white text-2xl sm:text-3xl font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload-hero"
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-md ring-2 ring-[var(--card)] cursor-pointer hover:scale-105 active:scale-95 transition-transform z-10"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </label>
                <input
                  type="file"
                  id="avatar-upload-hero"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>

              {/* Name + role + email */}
              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[20px] sm:text-[22px] font-semibold text-[var(--foreground)]">
                    {formData.full_name || "Admin User"}
                  </h2>
                  <IOSBadge color="blue" variant="tinted" size="small" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> {formData.role}
                  </IOSBadge>
                </div>
                <p className="text-[13px] sm:text-[14px] text-[var(--muted-foreground)] mt-0.5">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Stat pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Pill icon={<Calendar className="h-3.5 w-3.5" />} text={`Member since ${getMemberSinceDate()}`} />
            <Pill icon={<Clock className="h-3.5 w-3.5" />} text="Last login 2h ago" />
            <Pill icon={<Check className="h-3.5 w-3.5 text-[var(--erp-success)]" />} text="Account verified" />
          </div>
        </div>
      </IOSCard>

      {/* ── Tabs ── */}
      <div className="mt-6 sm:mt-8 inline-flex rounded-[12px] border border-[var(--border)] bg-[var(--muted)] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`rounded-[8px] px-3.5 sm:px-4 py-1.5 text-[13px] sm:text-[14px] font-medium transition-all cursor-pointer ${
              activeTab === t.id
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content Grid ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3 min-w-0 overflow-hidden">
        {/* Left sidebar — Account Summary */}
        <aside className="order-2 lg:order-1 min-w-0 w-full overflow-hidden">
          <IOSCard variant="elevated" className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--foreground)]">
              <Sparkles className="h-4 w-4 text-[var(--primary)]" /> Account summary
            </div>
            <dl className="mt-4 space-y-3.5 text-[13px]">
              <SummaryRow label="Plan" value="Owner (full access)" />
              <SummaryRow
                label="Status"
                value="Active"
                valueClass="text-[var(--erp-success)]"
              />
              <SummaryRow label="Workspace" value={profile?.company_name || "My Workspace"} />
              <SummaryRow label="Joined" value={getMemberSinceDate()} />
            </dl>
            <IOSButton
              variant="gray"
              fullWidth
              size="medium"
              className="mt-5 text-[13px]"
              onClick={() => {}}
            >
              View activity log
            </IOSButton>
          </IOSCard>

          {/* Logout button in sidebar */}
          <IOSCard variant="elevated" className="mt-4 p-2 sm:p-2.5">
            <button
              className="w-full flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-medium text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors cursor-pointer"
              onClick={() => handleLogout()}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </IOSCard>
        </aside>

        {/* Right content area */}
        <section className="order-1 lg:order-2 lg:col-span-2 min-w-0 w-full overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "personal" && (
              <motion.div
                key="personal"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Personal Information Form */}
                <IOSCard variant="elevated" className="p-5 sm:p-6">
                  <h3 className="text-[18px] font-semibold text-[var(--foreground)]">Personal Information</h3>
                  <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
                    Update your personal details and contact info.
                  </p>

                  <form onSubmit={handleUpdateProfile} className="mt-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="full_name" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                          <IOSInput
                            id="full_name"
                            placeholder="e.g. John Doe"
                            value={formData.full_name}
                            onChange={(e: any) => setFormData({ ...formData, full_name: e.target.value })}
                            className="pl-11 h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="email" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                          <IOSInput
                            id="email"
                            type="email"
                            disabled
                            value={formData.email}
                            className="pl-11 h-[44px] bg-[var(--muted)] opacity-60 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="phone_number" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                          <IOSInput
                            id="phone_number"
                            placeholder="+91 9876543210"
                            value={formData.phone_number}
                            onChange={(e: any) => setFormData({ ...formData, phone_number: e.target.value })}
                            className="pl-11 h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="role" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                          Role
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
                          <select
                            id="role"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full h-[44px] pl-11 pr-4 rounded-[10px] bg-[var(--muted)] border-none text-[15px] text-[var(--foreground)] focus:ring-[3px] focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none transition-all appearance-none"
                          >
                            <option value="Admin">Admin (Owner)</option>
                            <option value="Staff">Staff</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t border-[var(--border)] pt-6">
                      <IOSButton variant="gray" type="button" size="medium">
                        Cancel
                      </IOSButton>
                      <IOSButton
                        type="submit"
                        variant="filled"
                        size="medium"
                        disabled={updating}
                        className="px-6"
                      >
                        {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save changes
                      </IOSButton>
                    </div>
                  </form>
                </IOSCard>

                {/* Account Management Section */}
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[18px] font-semibold text-[var(--foreground)]">Account Management</h3>
                  <p className="text-[13px] text-[var(--muted-foreground)]">Add or switch between linked accounts.</p>
                </div>

                <IOSCard variant="elevated" className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3">
                    {/* Add Account */}
                    <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                      <DialogTrigger asChild>
                        <div className="flex items-center justify-between p-4 rounded-[14px] bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted)] transition-all cursor-pointer group active:scale-[0.99]">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-[12px] bg-[rgba(52,199,89,0.1)] dark:bg-[rgba(48,209,88,0.15)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                              <UserPlus className="h-5 w-5 text-[var(--erp-success)]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[15px] font-semibold text-[var(--foreground)]">Add Account</p>
                              <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5 truncate">Link a new account to switch between.</p>
                            </div>
                          </div>
                          <IOSButton variant="gray" className="rounded-full px-4 text-[13px] font-semibold flex-shrink-0 ml-3">Add</IOSButton>
                        </div>
                      </DialogTrigger>
                      <DialogContent fullScreenMobile className="sm:max-w-md bg-[var(--card)]/80 backdrop-blur-[40px] border border-[var(--border)] shadow-[var(--shadow-lg)] rounded-[24px] p-0 overflow-hidden">
                        <div className="p-6">
                          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-[var(--border)]">
                            <div className="w-10 h-10 rounded-[12px] bg-[rgba(0,122,255,0.1)] dark:bg-[rgba(10,132,255,0.15)] border border-[var(--border)] flex items-center justify-center">
                              <UserPlus className="h-[18px] w-[18px] text-[var(--primary)]" />
                            </div>
                            <div>
                              <DialogTitle className="text-[18px] font-bold text-[var(--foreground)] leading-[22px] m-0">Add Account</DialogTitle>
                              <DialogDescription className="text-[13px] text-[var(--muted-foreground)] leading-[18px] mt-0.5">Link a new account for quick switching</DialogDescription>
                            </div>
                          </div>
                          <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                              <label htmlFor="add-email" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Email Address</label>
                              <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                                <IOSInput
                                  id="add-email"
                                  type="email"
                                  placeholder="newaccount@company.com"
                                  value={addAccountData.email}
                                  onChange={(e: any) => setAddAccountData({ ...addAccountData, email: e.target.value })}
                                  className="pl-11 h-[44px]"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label htmlFor="add-password" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Password</label>
                              <div className="relative">
                                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                                <IOSInput
                                  id="add-password"
                                  type="password"
                                  placeholder="••••••••"
                                  value={addAccountData.password}
                                  onChange={(e: any) => setAddAccountData({ ...addAccountData, password: e.target.value })}
                                  className="pl-11 h-[44px]"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label htmlFor="add-role" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Role</label>
                              <div className="relative">
                                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
                                <select
                                  id="add-role"
                                  value={addAccountData.role}
                                  onChange={(e) => setAddAccountData({ ...addAccountData, role: e.target.value })}
                                  className="w-full h-[44px] pl-11 pr-4 rounded-[10px] bg-[var(--muted)] border-none text-[15px] text-[var(--foreground)] focus:ring-[3px] focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none transition-all appearance-none"
                                >
                                  <option value="Admin">Admin</option>
                                  <option value="Staff">Staff</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="flex gap-2 pt-2 border-t border-[var(--border)] mx-[-24px] px-6 pb-2">
                            <IOSButton
                              variant="filled"
                              disabled={addingAccount || !addAccountData.email || !addAccountData.password}
                              onClick={handleLinkAccount}
                              className="w-full text-[15px] font-semibold"
                            >
                              {addingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                              {addingAccount ? "Linking..." : "Link Account"}
                            </IOSButton>
                          </DialogFooter>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Switch Account */}
                    <Dialog open={isSwitchAccountOpen} onOpenChange={setIsSwitchAccountOpen}>
                      <DialogTrigger asChild>
                        <div className="flex items-center justify-between p-4 rounded-[14px] bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted)] transition-all cursor-pointer group active:scale-[0.99]">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-[12px] bg-[rgba(88,86,214,0.1)] dark:bg-[rgba(88,86,214,0.15)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                              <ArrowLeftRight className="h-5 w-5 text-[#5856D6]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[15px] font-semibold text-[var(--foreground)]">Switch Account</p>
                              <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5 truncate">Switch between your linked accounts.</p>
                            </div>
                          </div>
                          <IOSButton variant="gray" className="rounded-full px-4 text-[13px] font-semibold flex-shrink-0 ml-3">Switch</IOSButton>
                        </div>
                      </DialogTrigger>
                      <DialogContent fullScreenMobile className="sm:max-w-md bg-[var(--card)]/80 backdrop-blur-[40px] border border-[var(--border)] shadow-[var(--shadow-lg)] rounded-[24px] p-0 overflow-hidden">
                        <div className="p-6">
                          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-[var(--border)]">
                            <div className="w-10 h-10 rounded-[12px] bg-[rgba(88,86,214,0.1)] dark:bg-[rgba(191,90,242,0.15)] border border-[var(--border)] flex items-center justify-center">
                              <Users className="h-[18px] w-[18px] text-[#5856D6] dark:text-[#BF5AF2]" />
                            </div>
                            <div>
                              <DialogTitle className="text-[18px] font-bold text-[var(--foreground)] leading-[22px] m-0">Switch Account</DialogTitle>
                              <DialogDescription className="text-[13px] text-[var(--muted-foreground)] leading-[18px] mt-0.5">Select an account to switch to</DialogDescription>
                            </div>
                          </div>
                          <div className="py-4 space-y-2">
                            {/* Current account */}
                            <div className="flex items-center justify-between p-3.5 rounded-[14px] bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                  <AvatarImage src={profile?.avatar_url} />
                                  <AvatarFallback className="bg-[var(--muted)] text-[var(--foreground)] text-sm font-bold">
                                    {getInitials()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-[15px] font-semibold text-[var(--foreground)] truncate">{formData.full_name || user?.email?.split("@")[0]}</p>
                                  <p className="text-[12px] text-[var(--muted-foreground)] truncate">{user?.email}</p>
                                </div>
                              </div>
                              <IOSBadge color="green" variant="tinted" size="small" dot className="flex-shrink-0 ml-2">
                                Active
                              </IOSBadge>
                            </div>

                            {/* Linked accounts */}
                            {linkedAccounts.length === 0 ? (
                              <div className="text-center py-8">
                                <Users className="mx-auto h-10 w-10 text-[var(--muted-foreground)] mb-3" style={{ opacity: 0.5 }} />
                                <p className="text-[15px] font-medium text-[var(--muted-foreground)]">No linked accounts yet</p>
                                <p className="text-[13px] text-[var(--muted-foreground)] mt-1">Use &quot;Add Account&quot; to link additional accounts.</p>
                              </div>
                            ) : (
                              linkedAccounts.map((account) => {
                                const isSwitching = switchingAccountId === account.id;
                                return (
                                  <button
                                    key={account.id}
                                    disabled={switchingAccountId !== null}
                                    onClick={() => handleSwitchAccount(account.id, account.email, account.role)}
                                    className="w-full flex items-center justify-between p-3.5 rounded-[14px] bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted)] transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <Avatar className="h-10 w-10 flex-shrink-0">
                                        {account.avatar_url ? (
                                          <AvatarImage src={account.avatar_url} />
                                        ) : null}
                                        <AvatarFallback className="bg-gradient-to-br from-[#5856D6] to-[#AF52DE] text-white text-sm font-bold">
                                          {account.email.substring(0, 1).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="text-left min-w-0">
                                        <p className="text-[15px] font-semibold text-[var(--foreground)] truncate">{account.fullName || account.email}</p>
                                        <p className="text-[12px] text-[var(--muted-foreground)] truncate">{account.email} · {account.role}</p>
                                      </div>
                                    </div>
                                    {isSwitching ? (
                                      <Loader2 className="h-4 w-4 text-[var(--primary)] animate-spin flex-shrink-0" />
                                    ) : (
                                      <ArrowLeftRight className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </IOSCard>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <IOSCard variant="elevated" className="p-5 sm:p-6">
                  <EmptyTabState
                    title="Security settings"
                    desc="Password, two-factor auth and active sessions will show up here."
                  />
                </IOSCard>
              </motion.div>
            )}

            {activeTab === "preferences" && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <IOSCard variant="elevated" className="p-5 sm:p-6">
                  <EmptyTabState
                    title="Preferences"
                    desc="Notification and workspace preferences will show up here."
                  />
                </IOSCard>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </motion.div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
