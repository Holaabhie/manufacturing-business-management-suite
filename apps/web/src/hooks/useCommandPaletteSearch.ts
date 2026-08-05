"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  FileText,
  Bot,
  User,
  Crown,
  Settings,
} from "lucide-react";

export interface SearchResultItem {
  type: "order" | "client" | "inventory";
  id: string | number;
  name: string;
  description: string;
  href: string;
  icon: any;
}

export interface QuickActionItem {
  name: string;
  icon: any;
  href: string;
}

export interface RecentItem {
  type: string;
  id: string;
  name: string;
  href: string;
  icon: any;
}

export interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  shortcut?: string;
}

// Static/default data sources
export const recentItems: RecentItem[] = [
  { type: "order", id: "ORD-001", name: "Order #001 - ABC Corp", href: "/dashboard/orders", icon: ShoppingCart },
  { type: "client", id: "CLI-002", name: "Acme Industries", href: "/dashboard/clients", icon: Users },
  { type: "inventory", id: "INV-003", name: "Steel Rods - Batch A", href: "/dashboard/inventory", icon: Package },
];

export const navigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "D" },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart, shortcut: "O" },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package, shortcut: "I" },
  { name: "Clients", href: "/dashboard/clients", icon: Users, shortcut: "C" },
  { name: "Billing", href: "/dashboard/billing", icon: FileText, shortcut: "B" },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "AI Assistant", href: "/dashboard/assistant", icon: Bot, shortcut: "A" },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Settings", href: "/dashboard/profile?tab=settings", icon: Settings },
  { name: "Upgrade", href: "/dashboard/upgrade", icon: Crown },
];

export const quickActions: QuickActionItem[] = [
  { name: "New Order", icon: ShoppingCart, href: "/dashboard/orders?new=true" },
  { name: "New Client", icon: Users, href: "/dashboard/clients?new=true" },
  { name: "Add Inventory Item", icon: Package, href: "/dashboard/inventory?new=true" },
  { name: "Generate Report", icon: FileText, href: "/dashboard/assistant" },
];

export function useCommandPaletteSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  const performSearch = React.useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const [ordersRes, clientsRes, inventoryRes] = await Promise.allSettled([
        fetch(`/api/orders?search=${encodeURIComponent(query)}&limit=3`).then((r) => r.json()),
        fetch(`/api/clients?search=${encodeURIComponent(query)}&limit=3`).then((r) => r.json()),
        fetch(`/api/inventory?search=${encodeURIComponent(query)}&limit=3`).then((r) => r.json()),
      ]);

      const results: SearchResultItem[] = [];

      // Process orders
      if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
        ordersRes.value.slice(0, 3).forEach((order: any) => {
          results.push({
            type: "order",
            id: order.id,
            name: `Order #${order.id} - ${order.product_name || "Unknown"}`,
            description: order.clients?.name || "No client",
            href: `/dashboard/orders?id=${order.id}`,
            icon: ShoppingCart,
          });
        });
      }

      // Process clients
      if (clientsRes.status === "fulfilled" && Array.isArray(clientsRes.value)) {
        clientsRes.value.slice(0, 3).forEach((client: any) => {
          results.push({
            type: "client",
            id: client.id,
            name: client.name,
            description: client.email || client.company || "",
            href: `/dashboard/clients?id=${client.id}`,
            icon: Users,
          });
        });
      }

      // Process inventory
      if (inventoryRes.status === "fulfilled" && Array.isArray(inventoryRes.value)) {
        inventoryRes.value.slice(0, 3).forEach((item: any) => {
          results.push({
            type: "inventory",
            id: item.id,
            name: item.name,
            description: `${item.quantity} ${item.unit} in stock`,
            href: `/dashboard/inventory?id=${item.id}`,
            icon: Package,
          });
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const clearSearch = React.useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  const handleSelect = React.useCallback(
    (href: string, onDone?: () => void) => {
      if (onDone) onDone();
      clearSearch();
      router.push(href);
    },
    [clearSearch, router]
  );

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    quickActions,
    recentItems,
    navigationItems,
    handleSelect,
    clearSearch,
  };
}
