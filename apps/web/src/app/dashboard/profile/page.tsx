"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  User,
  Mail,
  Shield,
  Key,
  LogOut,
  Camera,
  Bell,
  Loader2,
  Phone,
  Briefcase,
  AlertTriangle,
  Lock,
  Fingerprint,
  Building2,
  MapPin,
  CreditCard,
  Upload,
  Save,
  Landmark
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
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
import { Separator } from "@/components/ui/separator";
import { ReadOnlyBanner } from "@/components/AccessDenied";

interface CompanyDetails {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  upiId?: string;
}

function ProfileContent() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"profile" | "company" | "settings" | "notifications">("profile");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Company details state
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyDetails>({
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

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "settings" || tab === "notifications" || tab === "company") {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    role: "Admin",
  });

  const isStaff = user?.role === "Staff";

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
        setPreferences(data.notification_preferences || { stock_alerts: true, order_alerts: true, emailNotifications: true, pushNotifications: false });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDetails = async () => {
    setCompanyLoading(true);
    try {
      const res = await fetch("/api/profile/company");
      const data = await res.json();
      if (data.company) {
        setCompanyData(data.company);
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
    } finally {
      setCompanyLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchCompanyDetails();
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

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyData.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    setCompanySaving(true);
    try {
      const res = await fetch("/api/profile/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyData),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Company details saved successfully!");
        setCompanyData(data.company);
      }
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = e.target.files[0];
      // Convert to base64 for now (can be improved with proper file storage later)
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
            fetchProfile();
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = e.target.files[0];
      // Max size check (500KB for logo)
      if (file.size > 500 * 1024) {
        toast.error("Logo must be smaller than 500KB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setCompanyData({ ...companyData, logoUrl: base64String });
        toast.success("Logo uploaded - remember to save changes!");
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLogout = async (allDevices = false) => {
    try {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 pb-12"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">User Account</h1>
        <p className="text-muted-foreground">Manage your profile, company details, and preferences.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-4">
        {/* Left Column - Navigation & Profile Preview */}
        <div className="md:col-span-1 space-y-6">
          <Card className="overflow-hidden border-none shadow-xl bg-card">
            <div className="h-20 bg-gradient-to-r from-accent to-chart-1" />
            <CardContent className="pt-0 -mt-10 text-center">
              <div className="relative inline-block group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg group-hover:opacity-90 transition-all duration-300">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-3xl font-bold">
                    {formData.full_name?.substring(0, 1).toUpperCase() || user?.email?.substring(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform flex items-center justify-center border-2 border-background"
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
              <div className="mt-4">
                <h3 className="text-lg font-bold truncate px-2">{formData.full_name || "Admin User"}</h3>
                <Badge variant="outline" className="mt-1 bg-accent/5 text-accent border-accent/20">
                  {formData.role}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2 truncate px-2">{user?.email}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-1">
            <Button
              variant={activeTab === "profile" ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 rounded-xl px-4 h-11"
              onClick={() => setActiveTab("profile")}
            >
              <User size={18} className={activeTab === "profile" ? "text-accent" : "text-muted-foreground"} />
              Profile details
            </Button>
            <Button
              variant={activeTab === "company" ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 rounded-xl px-4 h-11"
              onClick={() => setActiveTab("company")}
            >
              <Building2 size={18} className={activeTab === "company" ? "text-accent" : "text-muted-foreground"} />
              Company Details
            </Button>
            <Button
              variant={activeTab === "settings" ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 rounded-xl px-4 h-11"
              onClick={() => setActiveTab("settings")}
            >
              <Shield size={18} className={activeTab === "settings" ? "text-accent" : "text-muted-foreground"} />
              Security Settings
            </Button>
            <Button
              variant={activeTab === "notifications" ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 rounded-xl px-4 h-11"
              onClick={() => setActiveTab("notifications")}
            >
              <Bell size={18} className={activeTab === "notifications" ? "text-accent" : "text-muted-foreground"} />
              Notifications
            </Button>
            <div className="pt-4 mt-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 rounded-xl px-4 h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleLogout()}
              >
                <LogOut size={18} />
                Sign Out
              </Button>
            </div>
          </div>
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
                <Card className="border-none shadow-md bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <User className="h-5 w-5 text-accent" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>Update your personal details and contact info.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="full_name"
                              placeholder="e.g. John Doe"
                              value={formData.full_name}
                              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                              className="pl-10 rounded-xl border-border focus-visible:ring-accent"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              disabled
                              value={formData.email}
                              className="pl-10 rounded-xl border-border bg-muted/50 cursor-not-allowed"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone_number" className="text-sm font-medium">Phone Number</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="phone_number"
                              placeholder="+91 9876543210"
                              value={formData.phone_number}
                              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                              className="pl-10 rounded-xl border-border focus-visible:ring-accent"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <select
                              id="role"
                              value={formData.role}
                              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                              className="w-full h-10 pl-10 rounded-xl border border-border bg-background focus:ring-2 focus:ring-accent outline-none text-sm appearance-none"
                            >
                              <option value="Admin">Admin (Owner)</option>
                              <option value="Staff">Staff</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={updating}
                        className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8 h-11"
                      >
                        {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Changes
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "company" && (
              <motion.div
                key="company"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {companyLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <form onSubmit={handleUpdateCompany} className="space-y-6">
                    {isStaff && (
                      <ReadOnlyBanner feature="company settings" />
                    )}
                    <fieldset disabled={isStaff} className="space-y-6 border-none p-0 m-0 min-w-0">
                      {/* Basic Company Information */}
                      <Card className="border-none shadow-md bg-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <Building2 className="h-5 w-5 text-accent" />
                            Business Information
                          </CardTitle>
                          <CardDescription>Your company details used for invoices and bills.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Logo Upload */}
                          <div className="flex items-start gap-6">
                            <div className="flex-shrink-0">
                              <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden group">
                                {companyData.logoUrl ? (
                                  <img
                                    src={companyData.logoUrl}
                                    alt="Company Logo"
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <Building2 className="h-8 w-8 text-muted-foreground" />
                                )}
                                <label
                                  htmlFor="logo-upload"
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                >
                                  <Upload className="h-6 w-6 text-white" />
                                </label>
                                <input
                                  type="file"
                                  id="logo-upload"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleLogoUpload}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-2 text-center">Max 500KB</p>
                            </div>
                            <div className="flex-1 grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="companyName" className="text-sm font-medium">
                                  Company Name <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="companyName"
                                    placeholder="Your Company Name Pvt. Ltd."
                                    value={companyData.companyName}
                                    onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
                                    className="pl-10 rounded-xl border-border focus-visible:ring-accent"
                                    required
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="companyPhone" className="text-sm font-medium">Phone</Label>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="companyPhone"
                                    placeholder="+91 22 1234 5678"
                                    value={companyData.phone}
                                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                                    className="pl-10 rounded-xl border-border focus-visible:ring-accent"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="companyEmail" className="text-sm font-medium">Email</Label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="companyEmail"
                                    type="email"
                                    placeholder="billing@yourcompany.com"
                                    value={companyData.email}
                                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                                    className="pl-10 rounded-xl border-border focus-visible:ring-accent"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="companyAddress" className="text-sm font-medium">Address</Label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Textarea
                                id="companyAddress"
                                placeholder="123 Industrial Area, Sector 5&#10;Mumbai, Maharashtra - 400001"
                                value={companyData.address}
                                onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                className="pl-10 rounded-xl border-border focus-visible:ring-accent min-h-[80px] resize-none"
                                rows={3}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Tax Details */}
                      <Card className="border-none shadow-md bg-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <CreditCard className="h-5 w-5 text-chart-2" />
                            Tax Information
                          </CardTitle>
                          <CardDescription>GST and PAN details for tax invoices.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="gstin" className="text-sm font-medium">GSTIN</Label>
                              <Input
                                id="gstin"
                                placeholder="27AABCU9603R1ZM"
                                value={companyData.gstin}
                                onChange={(e) => setCompanyData({ ...companyData, gstin: e.target.value.toUpperCase() })}
                                className="rounded-xl border-border focus-visible:ring-accent font-mono"
                                maxLength={15}
                              />
                              <p className="text-[10px] text-muted-foreground">15-character GST Identification Number</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="pan" className="text-sm font-medium">PAN</Label>
                              <Input
                                id="pan"
                                placeholder="AABCU9603R"
                                value={companyData.pan}
                                onChange={(e) => setCompanyData({ ...companyData, pan: e.target.value.toUpperCase() })}
                                className="rounded-xl border-border focus-visible:ring-accent font-mono"
                                maxLength={10}
                              />
                              <p className="text-[10px] text-muted-foreground">10-character PAN Card Number</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Bank Details */}
                      <Card className="border-none shadow-md bg-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <Landmark className="h-5 w-5 text-chart-3" />
                            Bank Details
                          </CardTitle>
                          <CardDescription>Bank account for payment collection (shown on invoices).</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="bankName" className="text-sm font-medium">Bank Name</Label>
                              <Input
                                id="bankName"
                                placeholder="State Bank of India"
                                value={companyData.bankName}
                                onChange={(e) => setCompanyData({ ...companyData, bankName: e.target.value })}
                                className="rounded-xl border-border focus-visible:ring-accent"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="accountNo" className="text-sm font-medium">Account Number</Label>
                              <Input
                                id="accountNo"
                                placeholder="1234567890123456"
                                value={companyData.accountNo}
                                onChange={(e) => setCompanyData({ ...companyData, accountNo: e.target.value })}
                                className="rounded-xl border-border focus-visible:ring-accent font-mono"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ifsc" className="text-sm font-medium">IFSC Code</Label>
                              <Input
                                id="ifsc"
                                placeholder="SBIN0001234"
                                value={companyData.ifsc}
                                onChange={(e) => setCompanyData({ ...companyData, ifsc: e.target.value.toUpperCase() })}
                                className="rounded-xl border-border focus-visible:ring-accent font-mono"
                                maxLength={11}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="upiId" className="text-sm font-medium">UPI ID</Label>
                              <Input
                                id="upiId"
                                placeholder="yourcompany@sbi"
                                value={companyData.upiId}
                                onChange={(e) => setCompanyData({ ...companyData, upiId: e.target.value })}
                                className="rounded-xl border-border focus-visible:ring-accent"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Save Button */}

                    </fieldset>

                    {/* Save Button - Hidden for Staff */}
                    {!isStaff && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={companySaving}
                          className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8 h-11"
                        >
                          {companySaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save Company Details
                        </Button>
                      </div>
                    )}
                  </form>
                )}
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="border-none shadow-md bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Lock className="h-5 w-5 text-chart-3" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>Manage your password and session security.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-4">
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all cursor-pointer group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Key className="h-5 w-5 text-chart-3" />
                              </div>
                              <div>
                                <p className="text-sm font-bold">Change Password</p>
                                <p className="text-xs text-muted-foreground">Update your login credentials.</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="rounded-lg">Update</Button>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl">
                          <DialogHeader>
                            <DialogTitle>Change Password</DialogTitle>
                            <DialogDescription>Enter your new password below.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="new-password">New Password</Label>
                              <Input
                                id="new-password"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirm-password">Confirm New Password</Label>
                              <Input
                                id="confirm-password"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="rounded-xl"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={handleUpdatePassword}
                              disabled={updating}
                              className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
                            >
                              {updating ? "Updating..." : "Update Password"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Fingerprint className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">Two-Factor Authentication</p>
                            <p className="text-xs text-muted-foreground text-balance">Extra security layer for your account.</p>
                          </div>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl text-destructive hover:bg-destructive/5 border-destructive/20 h-11"
                      onClick={() => handleLogout(true)}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out from all devices
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border border-destructive/20 shadow-md bg-destructive/[0.02]">
                  <CardHeader>
                    <CardTitle className="text-xl text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>Irreversible actions for your account.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="destructive" className="rounded-xl font-bold px-8 h-10">Delete Account</Button>
                  </CardContent>
                </Card>
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
                <Card className="border-none shadow-md bg-card">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Bell className="h-5 w-5 text-accent" />
                      System Alerts
                    </CardTitle>
                    <CardDescription>Choose critical alerts you want to track.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                        <div className="space-y-1">
                          <Label className="text-base font-bold">Stock Alerts</Label>
                          <p className="text-xs text-muted-foreground">Receive low-stock and out-of-stock warnings.</p>
                        </div>
                        <Switch
                          checked={preferences.stock_alerts}
                          onCheckedChange={(checked) => handleUpdatePreferences({ stock_alerts: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                        <div className="space-y-1">
                          <Label className="text-base font-bold">Order Alerts</Label>
                          <p className="text-xs text-muted-foreground">Get notified about new orders and completions.</p>
                        </div>
                        <Switch
                          checked={preferences.order_alerts}
                          onCheckedChange={(checked) => handleUpdatePreferences({ order_alerts: checked })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-card">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Mail className="h-5 w-5 text-chart-2" />
                      Notification Channels
                    </CardTitle>
                    <CardDescription>Choose how you want to be delivered alerts.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Email Notifications</Label>
                        <p className="text-xs text-muted-foreground">Weekly digests and critical security alerts.</p>
                      </div>
                      <Switch
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => handleUpdatePreferences({ emailNotifications: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between px-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Push Notifications</Label>
                        <p className="text-xs text-muted-foreground">Browser alerts for real-time factory events.</p>
                      </div>
                      <Switch
                        checked={preferences.pushNotifications}
                        onCheckedChange={(checked) => handleUpdatePreferences({ pushNotifications: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div >
    </motion.div >
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
