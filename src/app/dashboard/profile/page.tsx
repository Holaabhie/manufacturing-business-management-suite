"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  Fingerprint
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
  const [activeTab, setActiveTab] = useState<"profile" | "settings" | "notifications">("profile");
  
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "settings" || tab === "notifications") {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    role: "Admin",
  });

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

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else if (data) {
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        email: user?.email || "",
        phone_number: data.phone_number || "",
        role: data.role || "Admin",
      });
      setPreferences(data.notification_preferences || { stock_alerts: true, order_alerts: true });
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await fetchProfile(user.id);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleUpdatePreferences = async (newPrefs: Partial<typeof preferences>) => {
    const updatedPrefs = { ...preferences, ...newPrefs };
    setPreferences(updatedPrefs);
    
    const { error } = await supabase
      .from("profiles")
      .update({ notification_preferences: updatedPrefs })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update preferences");
    } else {
      toast.success("Preferences updated");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        role: formData.role,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (profileError) {
      toast.error(profileError.message);
    } else {
      // Also update auth metadata for consistency
      await supabase.auth.updateUser({
        data: { 
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          role: formData.role
        }
      });
      toast.success("Profile updated successfully!");
      fetchProfile(user.id);
    }
    setUpdating(false);
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
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    }
    setUpdating(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      toast.success("Avatar updated successfully!");
      fetchProfile(user.id);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async (allDevices = false) => {
    if (allDevices) {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) toast.error(error.message);
      else window.location.href = "/login";
    } else {
      await supabase.auth.signOut();
      window.location.href = "/login";
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
        <p className="text-muted-foreground">Manage your profile, security and notification preferences.</p>
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
                              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
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
                              onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                              className="pl-10 rounded-xl border-border focus-visible:ring-accent"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              id="role" 
                              value={formData.role}
                              onChange={(e) => setFormData({...formData, role: e.target.value})}
                              className="pl-10 rounded-xl border-border focus-visible:ring-accent"
                            />
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
                      <Dialog>
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
                                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                className="rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirm-password">Confirm New Password</Label>
                              <Input 
                                id="confirm-password" 
                                type="password" 
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
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
