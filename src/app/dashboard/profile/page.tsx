"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  LogOut, 
  Camera,
  CheckCircle2,
  Calendar,
  Settings,
  Bell,
  Fingerprint,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "settings" | "notifications">("profile");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setFormData({
          full_name: user.user_metadata?.full_name || "",
          email: user.email || "",
        });
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    const { error } = await supabase.auth.updateUser({
      data: { full_name: formData.full_name }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated successfully!");
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      setUser(updatedUser);
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
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) {
        throw updateError;
      }

      toast.success("Avatar updated successfully!");
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      setUser(updatedUser);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
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
        <p className="text-muted-foreground">Manage your profile, settings and notification preferences.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-4">
        {/* Left Column - Navigation & Profile Preview */}
        <div className="md:col-span-1 space-y-6">
          <Card className="overflow-hidden border-none shadow-xl bg-card">
            <div className="h-20 bg-gradient-to-r from-accent to-chart-1" />
            <CardContent className="pt-0 -mt-10 text-center">
              <div className="relative inline-block group">
                <Avatar className="h-20 w-20 border-4 border-background shadow-lg group-hover:opacity-90 transition-all duration-300">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-2xl font-bold">
                    {user?.user_metadata?.full_name?.substring(0, 1).toUpperCase() || user?.email?.substring(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                >
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
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
              <div className="mt-3">
                <h3 className="text-lg font-bold truncate px-2">{formData.full_name || "Admin User"}</h3>
                <p className="text-xs text-muted-foreground truncate px-2">{user?.email}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-1">
            <Button 
              variant={activeTab === "profile" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-3 rounded-xl"
              onClick={() => setActiveTab("profile")}
            >
              <User size={18} className={activeTab === "profile" ? "text-accent" : "text-muted-foreground"} />
              Profile details
            </Button>
            <Button 
              variant={activeTab === "settings" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-3 rounded-xl"
              onClick={() => setActiveTab("settings")}
            >
              <Settings size={18} className={activeTab === "settings" ? "text-accent" : "text-muted-foreground"} />
              Account Settings
            </Button>
            <Button 
              variant={activeTab === "notifications" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-3 rounded-xl"
              onClick={() => setActiveTab("notifications")}
            >
              <Bell size={18} className={activeTab === "notifications" ? "text-accent" : "text-muted-foreground"} />
              Notifications
            </Button>
            <div className="pt-4 mt-4 border-t border-border">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
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
                    <CardDescription>Update your personal details and how others see you.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Full Name</Label>
                          <Input 
                            id="full_name" 
                            placeholder="e.g. John Doe" 
                            value={formData.full_name}
                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                            className="rounded-xl border-border focus-visible:ring-accent"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            disabled 
                            value={formData.email}
                            className="rounded-xl border-border bg-muted/50 cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        disabled={updating}
                        className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8"
                      >
                        {updating ? "Saving..." : "Save Changes"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Shield className="h-5 w-5 text-chart-3" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>Manage your password and security preferences.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-chart-3/10 flex items-center justify-center">
                          <Key className="h-5 w-5 text-chart-3" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Change Password</p>
                          <p className="text-xs text-muted-foreground text-balance">Update your login credentials regularly.</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg">Update</Button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Fingerprint className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Two-Factor Authentication</p>
                          <p className="text-xs text-muted-foreground">Extra layer of security for your account.</p>
                        </div>
                      </div>
                      <Switch />
                    </div>
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
                    <CardTitle className="text-xl">Account Preferences</CardTitle>
                    <CardDescription>Configure how your factory dashboard behaves.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base font-bold">Dark Mode</Label>
                          <p className="text-sm text-muted-foreground">Adjust the interface for low light conditions.</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base font-bold">Auto-refresh Data</Label>
                          <p className="text-sm text-muted-foreground">Automatically update tables every 5 minutes.</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base font-bold">Language</Label>
                          <p className="text-sm text-muted-foreground">Select your preferred display language.</p>
                        </div>
                        <Badge variant="outline">English (US)</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-destructive/20 shadow-md bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="text-xl text-destructive">Danger Zone</CardTitle>
                    <CardDescription>Irreversible actions for your account.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="destructive" className="rounded-xl font-bold">Delete Account</Button>
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
                    <CardTitle className="text-xl">Notification Channels</CardTitle>
                    <CardDescription>Choose how you want to be notified about factory events.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base font-bold">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive order updates and stock alerts via email.</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base font-bold">Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">Browser notifications for critical system alerts.</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-card">
                  <CardHeader>
                    <CardTitle className="text-xl">Alert Preferences</CardTitle>
                    <CardDescription>Specific events you want to track.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {["Low Stock Alerts", "New Order Created", "Payment Received", "Client Added"].map((alert) => (
                      <div key={alert} className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{alert}</Label>
                        <Switch defaultChecked />
                      </div>
                    ))}
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
