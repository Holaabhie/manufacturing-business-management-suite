"use client";

import { useState, useEffect } from "react";
import { 
  Bell, 
  Package, 
  ShoppingCart, 
  AlertCircle, 
  CheckCircle2, 
  History,
  X,
  Circle
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("realtime_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
          toast(newNotification.title, {
            description: newNotification.message,
            icon: <Bell className="h-4 w-4 text-accent" />,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "stock_low":
      case "out_of_stock":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "restock":
      case "order_completed":
        return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
      case "new_order":
        return <ShoppingCart className="h-4 w-4 text-accent" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground border-2 border-background translate-x-1/2 -translate-y-1/2">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0 overflow-hidden rounded-2xl shadow-2xl border-border">
        <div className="flex flex-col h-[500px]">
          <div className="flex items-center justify-between px-4 py-4 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-accent/10 text-accent border-none text-[10px]">
                  {unreadCount} New
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-[11px] font-medium hover:bg-accent/10 hover:text-accent"
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="flex flex-col divide-y divide-border/50">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={cn(
                      "group relative flex gap-4 p-4 transition-all hover:bg-muted/50 cursor-pointer",
                      !notification.read && "bg-accent/[0.02]"
                    )}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className={cn(
                      "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50",
                      notification.type === "stock_low" ? "bg-destructive/5 text-destructive" :
                      notification.type === "restock" ? "bg-chart-2/5 text-chart-2" :
                      "bg-accent/5 text-accent"
                    )}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-sm font-semibold truncate",
                          !notification.read ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Circle className="h-2 w-2 fill-accent text-accent animate-pulse" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <History className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground px-4 mt-1">We'll alert you about inventory updates and order changes.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-border bg-muted/20">
            <Button variant="outline" className="w-full text-xs font-bold rounded-xl h-9 hover:bg-accent hover:text-accent-foreground" onClick={fetchNotifications}>
              Refresh Feed
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
