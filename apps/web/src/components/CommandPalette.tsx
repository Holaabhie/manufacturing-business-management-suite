"use client";

import * as React from "react";
import { useCommandPaletteSearch } from "@/hooks/useCommandPaletteSearch";
import { useRouter } from "next/navigation";
import {
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
    User,
    Crown,
    Clock,
    Search,
    Settings,
    ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Recent items (would be fetched from localStorage/API in production)
const recentItems = [
    { type: "order", id: "ORD-001", name: "Order #001 - ABC Corp", href: "/dashboard/orders", icon: ShoppingCart },
    { type: "client", id: "CLI-002", name: "Acme Industries", href: "/dashboard/clients", icon: Users },
    { type: "inventory", id: "INV-003", name: "Steel Rods - Batch A", href: "/dashboard/inventory", icon: Package },
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
    { name: "New Order", icon: ShoppingCart, href: "/dashboard/orders?new=true" },
    { name: "New Client", icon: Users, href: "/dashboard/clients?new=true" },
    { name: "Add Inventory Item", icon: Package, href: "/dashboard/inventory?new=true" },
    { name: "Generate Report", icon: FileText, href: "/dashboard/assistant" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const {
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        quickActions,
        recentItems,
        navigationItems,
        handleSelect: selectAndNavigate,
    } = useCommandPaletteSearch();

    const handleSelect = (href: string) => {
        selectAndNavigate(href, () => onOpenChange(false));
    };

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
                <CommandInput
                    placeholder="Search orders, clients, inventory..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    className="text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
                <CommandList className="max-h-[400px] bg-[var(--erp-elevated)] border-t border-white/[0.06]">
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
                        <CommandGroup heading="Search Results" className="[&_[cmdk-group-heading]]:text-[var(--muted-foreground)]">
                            {searchResults.map((result) => (
                                <CommandItem
                                    key={`${result.type}-${result.id}`}
                                    onSelect={() => handleSelect(result.href)}
                                    className="flex items-center gap-3 py-3 rounded-[var(--radius-md)] aria-selected:bg-white/[0.05] aria-selected:text-[var(--foreground)] text-[var(--foreground)]"
                                >
                                    <div className="p-2 rounded-[var(--radius-md)] bg-[#2563EB]/10">
                                        <result.icon className="h-4 w-4 text-[var(--muted-foreground)]" />
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
                            <CommandGroup heading="Quick Actions" className="[&_[cmdk-group-heading]]:text-[var(--muted-foreground)]">
                                {quickActions.map((action) => (
                                    <CommandItem
                                        key={action.name}
                                        onSelect={() => handleSelect(action.href)}
                                        className="flex items-center gap-3 py-2.5 rounded-[var(--radius-md)] aria-selected:bg-white/[0.05] aria-selected:text-[var(--foreground)] text-[var(--foreground)]"
                                    >
                                        <div className="p-2 rounded-[var(--radius-md)] bg-[#2563EB]/10">
                                            <action.icon className="h-4 w-4 text-[var(--muted-foreground)]" />
                                        </div>
                                        <span>{action.name}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>

                            <CommandSeparator className="bg-[var(--glass-border)]" />

                            {/* Recent Items */}
                            <CommandGroup heading="Recent" className="[&_[cmdk-group-heading]]:text-[var(--muted-foreground)]">
                                {recentItems.map((item) => (
                                    <CommandItem
                                        key={`${item.type}-${item.id}`}
                                        onSelect={() => handleSelect(item.href)}
                                        className="flex items-center gap-3 py-2.5 rounded-[var(--radius-md)] aria-selected:bg-white/[0.05] aria-selected:text-[var(--foreground)] text-[var(--foreground)]"
                                    >
                                        <item.icon className="h-4 w-4 text-muted-foreground" />
                                        <span className="flex-1 truncate">{item.name}</span>
                                        <Clock className="h-3 w-3 text-muted-foreground opacity-50" />
                                        <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>

                            <CommandSeparator className="bg-[var(--glass-border)]" />

                            {/* Navigation */}
                            <CommandGroup heading="Navigation" className="[&_[cmdk-group-heading]]:text-[var(--muted-foreground)]">
                                {navigationItems.slice(0, 8).map((item) => (
                                    <CommandItem
                                        key={item.name}
                                        onSelect={() => handleSelect(item.href)}
                                        className="flex items-center gap-3 py-2.5 rounded-[var(--radius-md)] aria-selected:bg-white/[0.05] aria-selected:text-[var(--foreground)] text-[var(--foreground)]"
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
        </CommandDialog>
    );
}

export default CommandPalette;
