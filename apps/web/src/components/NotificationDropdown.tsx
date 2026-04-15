"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Bell, 
  Package, 
  ShoppingCart, 
  AlertCircle, 
  CheckCircle2, 
  History,
  Clock,
  Circle,
  IndianRupee,
  Factory,
  CheckCheck,
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface Notification {
  id: string;
  type: "overdue" | "low_stock" | "payment_pending" | "completed" | "production_stuck";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  icon: string;
  borderColor: string;
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load read state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ind_notification_read_ids");
      if (saved) setReadIds(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const [ordersRes, inventoryRes, paymentsRes] = await Promise.all([
        fetch("/api/orders").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/v1/inventory").then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
        fetch("/api/payments").then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      const orders = Array.isArray(ordersRes) ? ordersRes : ordersRes?.orders || [];
      const inventory = Array.isArray(inventoryRes?.data) ? inventoryRes.data : (Array.isArray(inventoryRes) ? inventoryRes : []);
      const payments = Array.isArray(paymentsRes) ? paymentsRes : paymentsRes?.payments || [];

      const generated: Notification[] = [];
      const now = new Date();

      // Overdue orders (past due date)
      orders.forEach((o: any) => {
        const dueDate = o.due_date || o.dueDate || o.delivery_date;
        if (dueDate && new Date(dueDate) < now && o.status !== "completed" && o.status !== "delivered") {
          generated.push({
            id: `overdue-${o.id}`,
            type: "overdue",
            title: `🔴 Order ${(o.id || "").slice(-6).toUpperCase()} is overdue`,
            message: `${o.product_name || "Order"} for ${o.clients?.name || o.client_name || "client"} — was due ${new Date(dueDate).toLocaleDateString("en-IN")}`,
            read: false,
            created_at: dueDate,
            icon: "⚠️",
            borderColor: "border-l-red-500",
          });
        }

        // Production stuck > 3 days
        if (o.status === "production" || o.status === "in_production") {
          const startDate = o.production_start_date || o.updatedAt || o.createdAt;
          if (startDate) {
            const days = Math.floor((now.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
            if (days > 3) {
              generated.push({
                id: `stuck-${o.id}`,
                type: "production_stuck",
                title: `⏱️ ${o.product_name || "Order"} stuck in production`,
                message: `In production for ${days} days — ${o.clients?.name || o.client_name || "client"}`,
                read: false,
                created_at: startDate,
                icon: "⏱️",
                borderColor: "border-l-orange-500",
              });
            }
          }
        }

        // Completed orders
        if (o.status === "completed" || o.status === "delivered") {
          generated.push({
            id: `completed-${o.id}`,
            type: "completed",
            title: `✅ ${o.product_name || "Order"} completed`,
            message: `Order for ${o.clients?.name || o.client_name || "client"} — ${o.quantity || 0} units`,
            read: false,
            created_at: o.updatedAt || o.createdAt || now.toISOString(),
            icon: "✅",
            borderColor: "border-l-green-500",
          });
        }
      });

      // Low stock materials
      inventory.forEach((item: any) => {
        if (item.quantity <= item.min_stock_level) {
          generated.push({
            id: `lowstock-${item.id}`,
            type: "low_stock",
            title: `📦 ${item.name} is running low`,
            message: `Current: ${item.quantity} ${item.unit} — Min: ${item.min_stock_level} ${item.unit}`,
            read: false,
            created_at: item.updatedAt || now.toISOString(),
            icon: "📦",
            borderColor: "border-l-amber-500",
          });
        }
      });

      // Unpaid payments
      payments.forEach((p: any) => {
        if (p.status === "pending" || p.status === "overdue") {
          generated.push({
            id: `payment-${p.id}`,
            type: "payment_pending",
            title: `💰 Payment pending from ${p.clients?.name || p.client_name || "client"}`,
            message: `₹${Number(p.amount || 0).toLocaleString("en-IN")} — ${p.payment_method || "—"}`,
            read: false,
            created_at: p.due_date || p.createdAt || now.toISOString(),
            icon: "💰",
            borderColor: "border-l-blue-500",
          });
        }
      });

      // Sort by date (newest first), limit to 20
      generated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const limited = generated.slice(0, 20);

      // Apply read state from localStorage
      const withReadState = limited.map(n => ({
        ...n,
        read: readIds.has(n.id),
      }));

      setNotifications(withReadState);
      setUnreadCount(withReadState.filter(n => !n.read).length);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [readIds]);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = (id: string) => {
    const newReadIds = new Set(readIds);
    newReadIds.add(id);
    setReadIds(newReadIds);
    localStorage.setItem("ind_notification_read_ids", JSON.stringify([...newReadIds]));
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    const newReadIds = new Set(readIds);
    notifications.forEach(n => newReadIds.add(n.id));
    setReadIds(newReadIds);
    localStorage.setItem("ind_notification_read_ids", JSON.stringify([...newReadIds]));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    toast.success("All notifications marked as read");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "overdue": return <AlertCircle className="h-4 w-4 text-red-400" />;
      case "low_stock": return <Package className="h-4 w-4 text-amber-400" />;
      case "payment_pending": return <IndianRupee className="h-4 w-4 text-blue-400" />;
      case "completed": return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "production_stuck": return <Clock className="h-4 w-4 text-orange-400" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch { return "—"; }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-[36px] w-[36px] rounded-[10px] flex items-center justify-center text-[var(--label-secondary)] hover:bg-[var(--fill-quaternary)] transition-colors cursor-pointer">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 shadow-lg shadow-red-500/30">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[340px] p-0 overflow-hidden rounded-[16px] shadow-2xl"
        style={{
          background: "#0f1420",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex flex-col max-h-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(167,139,250,0.15)] text-[#a78bfa]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                className="text-[11px] font-medium text-[#a78bfa] hover:text-[#c4b5fd] transition-colors flex items-center gap-1 cursor-pointer"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1 max-h-[300px]">
            <div className="flex flex-col">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-all hover:bg-white/[0.03] cursor-pointer border-l-2",
                      notification.borderColor,
                      !notification.read && "bg-white/[0.02]"
                    )}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.05]">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-[13px] font-semibold leading-tight",
                          !notification.read ? "text-white" : "text-white/50"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <Circle className="h-2 w-2 fill-[#a78bfa] text-[#a78bfa] flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-white/35 leading-relaxed line-clamp-1">
                        {notification.message}
                      </p>
                      <span className="text-[10px] text-white/25 mt-0.5">
                        {timeAgo(notification.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="h-12 w-12 rounded-full bg-white/[0.05] flex items-center justify-center mb-3">
                    <Bell className="h-5 w-5 text-white/20" />
                  </div>
                  <p className="text-sm font-medium text-white/60">All clear!</p>
                  <p className="text-[11px] text-white/30 mt-1">No alerts right now. We&apos;ll notify you about important updates.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/[0.07]">
              <Link 
                href="/dashboard/notifications" 
                className="text-[12px] font-semibold text-[#a78bfa] hover:text-[#c4b5fd] transition-colors cursor-pointer"
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
