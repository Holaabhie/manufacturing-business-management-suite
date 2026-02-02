"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    CreditCard,
    FileText,
    Bot,
    BarChart3,
    TrendingUp,
    User,
    Crown,
    Plus,
    Clock,
    Search,
    Settings,
    Factory,
    ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Recent items (would be fetched from localStorage/API in production)
const recentItems = [
    { type: "order", id: "ORD-001", name: "Order #001 - ABC Corp", href: "/dashboard/orders" },
    { type: "client", id: "CLI-002", name: "Acme Industries", href: "/dashboard/clients" },
    { type: "inventory", id: "INV-003", name: "Steel Rods - Batch A", href: "/dashboard/inventory" },
];

// Navigation items
const navigationItems = [
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

// Quick actions
const quickActions = [
    { name: "New Order", icon: ShoppingCart, href: "/dashboard/orders?new=true", color: "text-blue-500" },
    { name: "New Client", icon: Users, href: "/dashboard/clients?new=true", color: "text-emerald-500" },
    { name: "Add Inventory Item", icon: Package, href: "/dashboard/inventory?new=true", color: "text-amber-500" },
    { name: "Generate Report", icon: FileText, href: "/dashboard/assistant", color: "text-purple-500" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = React.useState("");
    const [searchResults, setSearchResults] = React.useState<any[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);

    // Search across orders, clients, inventory
    const performSearch = React.useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // Parallel search across all entities
            const [ordersRes, clientsRes, inventoryRes] = await Promise.allSettled([
                fetch(`/api/orders?search=${encodeURIComponent(query)}&limit=3`).then(r => r.json()),
                fetch(`/api/clients?search=${encodeURIComponent(query)}&limit=3`).then(r => r.json()),
                fetch(`/api/inventory?search=${encodeURIComponent(query)}&limit=3`).then(r => r.json()),
            ]);

            const results: any[] = [];

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

    // Debounced search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, performSearch]);

    const handleSelect = (href: string) => {
        onOpenChange(false);
        setSearchQuery("");
        router.push(href);
    };

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <Command className="rounded-lg border shadow-2xl">
                <CommandInput
                    placeholder="Search orders, clients, inventory..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                />
                <CommandList className="max-h-[400px]">
                    <CommandEmpty>
                        {isSearching ? (
                            <div className="flex items-center justify-center py-6 gap-2">
                                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-muted-foreground">Searching...</span>
                            </div>
                        ) : (
                            <div className="py-6 text-center">
                                <Search className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                                <p className="text-muted-foreground">No results found.</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    Try searching for an order ID, client name, or product.
                                </p>
                            </div>
                        )}
                    </CommandEmpty>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <CommandGroup heading="Search Results">
                            {searchResults.map((result) => (
                                <CommandItem
                                    key={`${result.type}-${result.id}`}
                                    onSelect={() => handleSelect(result.href)}
                                    className="flex items-center gap-3 py-3"
                                >
                                    <div className={`p-2 rounded-lg ${result.type === "order" ? "bg-blue-500/10 text-blue-500" :
                                        result.type === "client" ? "bg-emerald-500/10 text-emerald-500" :
                                            "bg-amber-500/10 text-amber-500"
                                        }`}>
                                        <result.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="font-medium truncate">{result.name}</span>
                                        <span className="text-xs text-muted-foreground truncate">{result.description}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] uppercase">
                                        {result.type}
                                    </Badge>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {/* Quick Actions - Only show when not searching */}
                    {!searchQuery && (
                        <>
                            <CommandGroup heading="Quick Actions">
                                {quickActions.map((action) => (
                                    <CommandItem
                                        key={action.name}
                                        onSelect={() => handleSelect(action.href)}
                                        className="flex items-center gap-3 py-2"
                                    >
                                        <div className={`p-1.5 rounded-md bg-muted ${action.color}`}>
                                            <Plus className="h-3 w-3" />
                                        </div>
                                        <span>{action.name}</span>
                                        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                                    </CommandItem>
                                ))}
                            </CommandGroup>

                            <CommandSeparator />

                            {/* Recent Items */}
                            <CommandGroup heading="Recent">
                                {recentItems.map((item) => (
                                    <CommandItem
                                        key={`${item.type}-${item.id}`}
                                        onSelect={() => handleSelect(item.href)}
                                        className="flex items-center gap-3 py-2"
                                    >
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="flex-1 truncate">{item.name}</span>
                                        <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>

                            <CommandSeparator />

                            {/* Navigation */}
                            <CommandGroup heading="Navigation">
                                {navigationItems.slice(0, 8).map((item) => (
                                    <CommandItem
                                        key={item.name}
                                        onSelect={() => handleSelect(item.href)}
                                        className="flex items-center gap-3 py-2"
                                    >
                                        <item.icon className="h-4 w-4 text-muted-foreground" />
                                        <span>{item.name}</span>
                                        {item.shortcut && (
                                            <CommandShortcut className="ml-auto">
                                                ⌘{item.shortcut}
                                            </CommandShortcut>
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </>
                    )}
                </CommandList>
            </Command>
        </CommandDialog>
    );
}

export default CommandPalette;
