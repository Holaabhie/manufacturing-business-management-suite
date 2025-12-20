"use client";

import { useState, useEffect } from "react";
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
  Fingerprint
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
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
    }
    setUpdating(false);
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">User Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Column - Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <Card className="overflow-hidden border-none shadow-xl bg-card">
            <div className="h-24 bg-gradient-to-r from-accent to-chart-1" />
            <CardContent className="pt-0 -mt-12 text-center">
              <div className="relative inline-block group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg group-hover:opacity-90 transition-opacity">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-3xl font-bold">
                    {user?.email?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={14} />
                </button>
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-bold">{formData.full_name || "Admin User"}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">Administrator</Badge>
                  <Badge variant="outline" className="border-chart-2 text-chart-2">Active</Badge>
                </div>
              </div>
            </CardContent>
            <div className="p-4 border-t bg-muted/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Joined {new Date(user?.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield size={12} className="text-accent" />
                  <span>Verified</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 rounded-xl border-border hover:bg-muted"
            >
              <Settings size={18} className="text-muted-foreground" />
              Account Settings
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 rounded-xl border-border hover:bg-muted"
            >
              <Bell size={18} className="text-muted-foreground" />
              Notifications
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 rounded-xl border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-md bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
                  className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
                >
                  {updating ? "Saving Changes..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-chart-3" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your password and security preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-chart-3/10 flex items-center justify-center">
                    <Key className="h-5 w-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Change Password</p>
                    <p className="text-xs text-muted-foreground">Last changed 3 months ago</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg">Update</Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Fingerprint className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">Disabled</Badge>
              </div>

              <div className="p-4 rounded-2xl border border-chart-3/20 bg-chart-3/5">
                <div className="flex items-start gap-3">
                  <Shield size={18} className="text-chart-3 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-chart-3">Session Management</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You are currently logged in on this device. You can log out of all other active sessions to ensure your account is secure.
                    </p>
                    <Button variant="link" className="p-0 h-auto text-xs text-chart-3 font-bold hover:no-underline underline-offset-4">Log out from all devices</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
