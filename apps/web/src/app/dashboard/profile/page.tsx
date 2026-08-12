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
  Check
} from "lucide-react";
import {
  IOSCard,
  IOSButton,
  IOSBadge,
  IOSInput
} from "@/components/ui/ios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { variantsFadeUp } from "@/lib/motion";
import { toast } from "sonner";
import usePageStateCache from "@/infrastructure/state/pageStateCache";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

function ProfileContent() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile">("profile");

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
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      toast.error("Failed to logout");
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
        <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--foreground)]">Profile</h1>
        <p className="text-[15px] sm:text-[17px] text-[var(--muted-foreground)]">Manage your account and personal details.</p>
      </div>

      <div className="grid gap-6 sm:gap-8 md:grid-cols-4">
        {/* Left Column - Navigation & Profile Preview */}
        <div className="md:col-span-1 space-y-4 sm:space-y-6">
          <IOSCard variant="elevated" className="overflow-hidden border-none p-0">
            <div className="h-24 sm:h-20 bg-gradient-to-br from-[#007AFF]/20 to-[#5AC8FA]/20 dark:from-[#0A84FF]/20 dark:to-[#5AC8FA]/20" />
            <div className="px-4 pb-5 pt-0 -mt-10 sm:-mt-12 text-center">
              <div className="relative inline-block group mb-3">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-white dark:border-[#1C1C1E] shadow-[var(--shadow-sm)] group-hover:opacity-90 transition-all duration-300">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-[var(--muted)] text-[var(--foreground)] text-3xl font-bold">
                    {formData.full_name?.substring(0, 1).toUpperCase() || user?.email?.substring(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-[#007AFF] text-white rounded-full shadow-[var(--shadow-sm)] cursor-pointer hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border-2 border-white dark:border-[#1C1C1E] z-10"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </label>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-[17px] font-semibold text-[var(--foreground)] truncate px-2">{formData.full_name || "Admin User"}</h3>
                <div className="pt-1">
                  <IOSBadge variant="blue" className="bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#5AC8FA]">
                    {formData.role}
                  </IOSBadge>
                </div>
                <p className="text-[13px] text-[var(--muted-foreground)] pt-1 truncate px-2">{user?.email}</p>
              </div>
            </div>
          </IOSCard>

          <IOSCard className="p-2 sm:p-2.5">
            <div className="space-y-1">
              <button
                className={`w-full flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-medium transition-colors ${activeTab === "profile" ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}
                onClick={() => setActiveTab("profile")}
              >
                <User size={18} className={activeTab === "profile" ? "text-[#007AFF]" : "opacity-70"} />
                Profile details
              </button>

              <div className="pt-2 mt-2 border-t border-[var(--border)]">
                <button
                  className="w-full flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-medium text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
                  onClick={() => handleLogout()}
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </div>
          </IOSCard>
        </div>

        {/* Right Column - Content */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-1.5 mb-6">
                  <h2 className="text-[22px] font-semibold text-[var(--foreground)]">Personal Information</h2>
                  <p className="text-[15px] text-[var(--muted-foreground)]">Update your personal details and contact info.</p>
                </div>

                <IOSCard className="p-1 sm:p-2">
                  <form onSubmit={handleUpdateProfile} className="p-4 sm:p-5">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="full_name" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                          <IOSInput
                            id="full_name"
                            placeholder="e.g. John Doe"
                            value={formData.full_name}
                            onChange={(e: any) => setFormData({ ...formData, full_name: e.target.value })}
                            className="pl-11 h-[48px]"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                          <IOSInput
                            id="email"
                            type="email"
                            disabled
                            value={formData.email}
                            className="pl-11 h-[48px] bg-[var(--muted)] opacity-60 cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="phone_number" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                          <IOSInput
                            id="phone_number"
                            placeholder="+91 9876543210"
                            value={formData.phone_number}
                            onChange={(e: any) => setFormData({ ...formData, phone_number: e.target.value })}
                            className="pl-11 h-[48px]"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="role" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Role</label>
                        <div className="relative">
                          <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)] pointer-events-none" />
                          <select
                            id="role"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full h-[48px] pl-11 pr-4 rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-[var(--border)] text-[17px] text-[var(--foreground)] focus:ring-[3px] focus:ring-[#007AFF]/30 focus:border-[#007AFF] outline-none transition-all appearance-none"
                          >
                            <option value="Admin">Admin (Owner)</option>
                            <option value="Staff">Staff</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                      <IOSButton
                        type="submit"
                        variant="filled"
                        color="blue"
                        disabled={updating}
                        className="px-8 text-[15px] font-semibold h-[44px]"
                      >
                        {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Changes
                      </IOSButton>
                    </div>
                  </form>
                </IOSCard>

                {/* ── Account Management Section ── */}
                <div className="flex flex-col gap-1.5 mb-6 mt-8">
                  <h2 className="text-[22px] font-semibold text-[var(--foreground)]">Account Management</h2>
                  <p className="text-[15px] text-[var(--muted-foreground)]">Add or switch between linked accounts.</p>
                </div>

                <IOSCard className="p-1 sm:p-2">
                  <div className="p-4 sm:p-5 flex flex-col gap-3">
                    {/* Add Account */}
                    <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                      <DialogTrigger asChild>
                        <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted)] transition-all cursor-pointer group active:scale-[0.99]">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[12px] bg-[#34C759]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <UserPlus className="h-5 w-5 text-[#34C759]" />
                            </div>
                            <div>
                              <p className="text-[15px] font-semibold text-[var(--foreground)]">Add Account</p>
                              <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5">Link a new account to switch between.</p>
                            </div>
                          </div>
                          <IOSButton variant="gray" className="rounded-full px-4 text-[13px] font-semibold">Add</IOSButton>
                        </div>
                      </DialogTrigger>
                      <DialogContent fullScreenMobile className="sm:max-w-md bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px] p-0 overflow-hidden">
                        <div className="p-6">
                          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(255,255,255,0.06))", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <UserPlus className="h-[18px] w-[18px] text-[#60a5fa]" />
                            </div>
                            <div>
                              <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>Add Account</DialogTitle>
                              <DialogDescription style={{ fontSize: 13, color: "#64748b", lineHeight: "18px", margin: "2px 0 0" }}>Link a new account for quick switching</DialogDescription>
                            </div>
                          </div>
                          <div className="space-y-4 py-6">
                            <div className="space-y-1.5">
                              <label htmlFor="add-email" className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Email Address</label>
                              <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
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
                                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
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
                                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)] pointer-events-none" />
                                <select
                                  id="add-role"
                                  value={addAccountData.role}
                                  onChange={(e) => setAddAccountData({ ...addAccountData, role: e.target.value })}
                                  className="w-full h-[44px] pl-11 pr-4 rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-[var(--border)] text-[15px] text-[var(--foreground)] focus:ring-[3px] focus:ring-[#007AFF]/30 focus:border-[#007AFF] outline-none transition-all appearance-none"
                                >
                                  <option value="Admin">Admin</option>
                                  <option value="Staff">Staff</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="flex gap-2 pt-2 border-t border-[var(--border)] border-x-[-24px] mx-[-24px] px-6 pb-2">
                            <IOSButton
                              variant="filled"
                              color="blue"
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
                        <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted)] transition-all cursor-pointer group active:scale-[0.99]">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[12px] bg-[#5856D6]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <ArrowLeftRight className="h-5 w-5 text-[#5856D6]" />
                            </div>
                            <div>
                              <p className="text-[15px] font-semibold text-[var(--foreground)]">Switch Account</p>
                              <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5">Switch between your linked accounts.</p>
                            </div>
                          </div>
                          <IOSButton variant="gray" className="rounded-full px-4 text-[13px] font-semibold">Switch</IOSButton>
                        </div>
                      </DialogTrigger>
                      <DialogContent fullScreenMobile className="sm:max-w-md bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px] p-0 overflow-hidden">
                        <div className="p-6">
                          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(168,85,247,0.4), rgba(255,255,255,0.06))", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Users className="h-[18px] w-[18px] text-[#c084fc]" />
                            </div>
                            <div>
                              <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>Switch Account</DialogTitle>
                              <DialogDescription style={{ fontSize: 13, color: "#64748b", lineHeight: "18px", margin: "2px 0 0" }}>Select an account to switch to</DialogDescription>
                            </div>
                          </div>
                          <div className="py-6 space-y-2">
                            {/* Current account */}
                            <div className="flex items-center justify-between p-3.5 rounded-[14px] bg-[#007AFF]/5 border border-[#007AFF]/20">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={profile?.avatar_url} />
                                  <AvatarFallback className="bg-[var(--muted)] text-[var(--foreground)] text-sm font-bold">
                                    {formData.full_name?.substring(0, 1).toUpperCase() || user?.email?.substring(0, 1).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-[15px] font-semibold text-[var(--foreground)]">{formData.full_name || user?.email?.split("@")[0]}</p>
                                  <p className="text-[12px] text-[var(--muted-foreground)]">{user?.email}</p>
                                </div>
                              </div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#34C759]/10 text-[#34C759]">
                                <Check className="h-3 w-3" /> Active
                              </span>
                            </div>

                            {/* Linked accounts */}
                            {linkedAccounts.length === 0 ? (
                              <div className="text-center py-8">
                                <Users className="mx-auto h-10 w-10 text-[var(--muted-foreground)] mb-3" />
                                <p className="text-[15px] font-medium text-[var(--muted-foreground)]">No linked accounts yet</p>
                                <p className="text-[13px] text-[var(--muted-foreground)] mt-1">Use "Add Account" to link additional accounts.</p>
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
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-10 w-10">
                                        {account.avatar_url ? (
                                          <AvatarImage src={account.avatar_url} />
                                        ) : null}
                                        <AvatarFallback className="bg-gradient-to-br from-[#5856D6] to-[#AF52DE] text-white text-sm font-bold">
                                          {account.email.substring(0, 1).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="text-left">
                                        <p className="text-[15px] font-semibold text-[var(--foreground)]">{account.fullName || account.email}</p>
                                        <p className="text-[12px] text-[var(--muted-foreground)]">{account.email} · {account.role}</p>
                                      </div>
                                    </div>
                                    {isSwitching ? (
                                      <Loader2 className="h-4 w-4 text-[#007AFF] animate-spin" />
                                    ) : (
                                      <ArrowLeftRight className="h-4 w-4 text-[var(--muted-foreground)]" />
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
          </AnimatePresence>
        </div>
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
