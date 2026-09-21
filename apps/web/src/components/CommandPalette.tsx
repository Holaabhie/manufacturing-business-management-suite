"use client";

import * as React from "react";
import { useCommandPaletteSearch } from "@/hooks/useCommandPaletteSearch";
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
    Sparkles,
    Layers,
    BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// ── Sidebar category definitions ──────────────────────────
type CategoryKey = "all" | "quick-actions" | "orders" | "clients" | "inventory" | "reports";

const sidebarCategories: { key: CategoryKey; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "All", icon: Layers },
    { key: "quick-actions", label: "Quick actions", icon: Sparkles },
    { key: "orders", label: "Orders", icon: ShoppingCart },
    { key: "clients", label: "Clients", icon: Users },
    { key: "inventory", label: "Inventory", icon: Package },
    { key: "reports", label: "Reports", icon: BarChart3 },
];

// Map category keys to recent item type values
const categoryTypeMap: Record<CategoryKey, string | null> = {
    all: null,
    "quick-actions": null,
    orders: "order",
    clients: "client",
    inventory: "inventory",
    reports: null,
};

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

    const isMobile = useIsMobile();
    const [activeCategory, setActiveCategory] = React.useState<CategoryKey>("all");

    // Reset category when modal opens/closes
    React.useEffect(() => {
        if (!open) setActiveCategory("all");
    }, [open]);

    const handleSelect = (href: string) => {
        selectAndNavigate(href, () => onOpenChange(false));
    };

    // ── Filtered data ──────────────────────────────
    const filteredRecentItems = React.useMemo(() => {
        const typeFilter = categoryTypeMap[activeCategory];
        if (typeFilter === null) return recentItems;
        return recentItems.filter((item) => item.type === typeFilter);
    }, [recentItems, activeCategory]);

    const showQuickActions = activeCategory === "all" || activeCategory === "quick-actions";
    const showRecent = activeCategory !== "quick-actions";
    const showNavigation = activeCategory === "all";

    // ── Desktop sidebar ──────────────────────────────
    const desktopSidebar = !isMobile ? (
        <div
            className="hidden md:flex flex-col w-[200px] shrink-0 border-r py-2 px-2 gap-0.5"
            style={{ borderColor: "var(--glass-border)" }}
        >
            {sidebarCategories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.key;
                return (
                    <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-[var(--radius-md)] text-[13px] font-medium transition-colors text-left cursor-pointer ${
                            isActive
                                ? "bg-[var(--overlay-active)] text-[var(--foreground)]"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--overlay-hover)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{cat.label}</span>
                    </button>
                );
            })}
        </div>
    ) : null;

    // ── Desktop footer with keyboard hints ───────────
    const desktopFooter = !isMobile ? (
        <div
            className="hidden md:flex items-center gap-4 px-4 py-2.5 text-[11px] border-t shrink-0"
            style={{
                borderColor: "var(--glass-border)",
                background: "var(--overlay-subtle-bg)",
                color: "var(--overlay-text-muted)",
            }}
        >
            <span className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded bg-[var(--overlay-faint-bg)] border text-[10px] font-mono" style={{ borderColor: "var(--glass-border)" }}>↑</kbd>
                <kbd className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded bg-[var(--overlay-faint-bg)] border text-[10px] font-mono" style={{ borderColor: "var(--glass-border)" }}>↓</kbd>
                <span>navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded bg-[var(--overlay-faint-bg)] border text-[10px] font-mono" style={{ borderColor: "var(--glass-border)" }}>↵</kbd>
                <span>select</span>
            </span>
            <span className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded bg-[var(--overlay-faint-bg)] border text-[10px] font-mono" style={{ borderColor: "var(--glass-border)" }}>esc</kbd>
                <span>close</span>
            </span>
        </div>
    ) : null;

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            className="md:max-w-[860px]"
        >
                <CommandInput
                    placeholder="Search orders, clients, inventory..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    className="text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />

                {/* ── Desktop: sidebar + content row ── */}
                <div className="flex flex-1 min-h-0">
                    {desktopSidebar}

                    <div className="flex-1 flex flex-col min-w-0">
                        <CommandList className="max-h-[400px] md:max-h-[420px] bg-[var(--erp-elevated)] border-t border-white/[0.06] flex-1">
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
                                <CommandGroup heading="Search results" className="[&_[cmdk-group-heading]]:text-[var(--muted-foreground)]">
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
                                            <Badge variant="secondary" className="text-[10px] capitalize">
                                                {result.type}
                                            </Badge>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {/* Quick Actions - Only show when not searching */}
                            {!searchQuery && showQuickActions && (
                                <>
                                    <CommandGroup heading="Quick actions" className="[&_[cmdk-group-heading]]:text-[var(--muted-foreground)]">
                                        {/* Desktop: 2-column grid */}
                                        <div className="hidden md:grid grid-cols-2 gap-2 px-1 pb-1">
                                            {quickActions.map((action) => (
                                                <CommandItem
                                                    key={action.name}
                                                    onSelect={() => handleSelect(action.href)}
                                                    className="flex items-center gap-3 py-3 px-3 rounded-[var(--radius-md)] border text-[var(--foreground)] cursor-pointer transition-colors"
                                                    style={{ borderColor: "var(--glass-border)" }}
                                                >
                                                    <div className="p-2 rounded-[var(--radius-md)] bg-[#2563EB]/10 shrink-0">
                                                        <action.icon className="h-4 w-4 text-[var(--muted-foreground)]" />
                                                    </div>
                                                    <span className="text-[13px] font-medium truncate">{action.name}</span>
                                                </CommandItem>
                                            ))}
                                        </div>
                                        {/* Mobile: stacked list (unchanged) */}
                                        <div className="md:hidden">
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
                                        </div>
                                    </CommandGroup>

                                    {showRecent && <CommandSeparator className="bg-[var(--glass-border)]" />}
                                </>
                            )}

                            {/* Recent Items */}
                            {!searchQuery && showRecent && filteredRecentItems.length > 0 && (
                                <>
                                    <CommandGroup heading="Recent" className="[&_[cmdk-group-heading]]:text-[var(--muted-foreground)]">
                                        {filteredRecentItems.map((item) => (
                                            <CommandItem
                                                key={`${item.type}-${item.id}`}
                                                onSelect={() => handleSelect(item.href)}
                                                className="flex items-center gap-3 py-2.5 rounded-[var(--radius-md)] aria-selected:bg-white/[0.05] aria-selected:text-[var(--foreground)] text-[var(--foreground)]"
                                            >
                                                <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <span className="flex-1 truncate">{item.name}</span>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] capitalize shrink-0"
                                                >
                                                    {item.type}
                                                </Badge>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>

                                    {showNavigation && <CommandSeparator className="bg-[var(--glass-border)]" />}
                                </>
                            )}

                            {/* Navigation */}
                            {!searchQuery && showNavigation && (
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
                            )}
                        </CommandList>

                        {desktopFooter}
                    </div>
                </div>
        </CommandDialog>
    );
}

export default CommandPalette;
