"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import usePageStateCache from "@/infrastructure/state/pageStateCache";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  LogOut,
  Factory,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  Bell,
  User,
  Zap,
  Receipt,
  Sparkles,
  Search,
  Sun,
  Moon,
  Monitor,
  UsersRound,
  Cog,
  Layers,
  Gauge,
  BarChart3,
  Truck,
  BookOpen,
  Download,
  Plus,
  Archive,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  transitionSidebar,
  variantsSidebarLabel,
  variantsSidebarGroup,
} from "@/lib/motion";
import { PageTransition } from "@/components/ui/PageTransition";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { USER_UPDATED_EVENT } from "@/lib/events";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "@/components/CommandPalette";
import { IOSToastContainer } from "@/components/ui/ios/IOSToast";
import {
  filterNavigationByRole,
  filterMobileNavByRole,
  isRouteAllowed,
  type UserRole,
} from "@/lib/role-permissions";
import { useTranslations } from "next-intl";
import { LanguageSwitcherCompact } from "@/components/LanguageSwitcher";
import { useModules, type ModuleConfig } from "@/hooks/useModules";
import { MoreMenuSheet } from "@/components/MoreMenuSheet";

// Map navigation nameKeys to module config keys
// Items NOT in this map are always shown (e.g., dashboard, machines, folio)
const NAV_MODULE_MAP: Record<string, keyof ModuleConfig> = {
  production: "production",
  machines: "machines",
  inventory: "inventory",
  orders: "orders",
  billing: "billing",
  payments: "payments",
  clients: "clients",
  aiAssistant: "ai_assistant",
  ai: "ai_assistant",
};

// ─── Navigation Structure (keys for translation lookup) ──
const navigationGroups = [
  {
    label: "OPERATIONS",
    labelKey: "operations",
    items: [
      { name: "Dashboard", nameKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Orders", nameKey: "orders", href: "/dashboard/orders", icon: ShoppingCart, badge: 0 },
      { name: "Production", nameKey: "production", href: "/dashboard/production", icon: Layers },
      { name: "Machines", nameKey: "machines", href: "/dashboard/machines", icon: Gauge },
      { name: "Inventory", nameKey: "inventory", href: "/dashboard/inventory", icon: Package },
      { name: "Purchasing", nameKey: "purchasing", href: "/dashboard/purchasing", icon: Truck },
    ],
  },
  {
    label: "FINANCE",
    labelKey: "finance",
    items: [
      { name: "Billing", nameKey: "billing", href: "/dashboard/billing", icon: Receipt },
      { name: "Payments", nameKey: "payments", href: "/dashboard/payments", icon: CreditCard },
    ],
  },
  {
    label: "RELATIONSHIPS",
    labelKey: "relationships",
    items: [
      { name: "Clients", nameKey: "clients", href: "/dashboard/clients", icon: Users },
    ],
  },
  {
    label: "INTELLIGENCE",
    labelKey: "intelligence",
    items: [
      { name: "AI Assistant", nameKey: "aiAssistant", href: "/dashboard/assistant", icon: Sparkles },
      { name: "Analytics", nameKey: "analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { name: "Previous Years", nameKey: "previousYears", href: "/dashboard/reports/previous-years", icon: Archive },
      { name: "Notifications", nameKey: "notifications", href: "/dashboard/notifications", icon: Bell },
    ],
  },
  {
    label: "FOLIO",
    labelKey: "folio",
    items: [
      { name: "Folio", nameKey: "folio", href: "/dashboard/folio", icon: BookOpen },
    ],
  },
  {
    label: "SYSTEM",
    labelKey: "systemGroup",
    items: [
      { name: "Users", nameKey: "users", href: "/dashboard/users", icon: UsersRound },
      { name: "Upgrade", nameKey: "upgrade", href: "/dashboard/upgrade", icon: Zap },
    ],
  },
];

const mobileNavItems = [
  { name: "Dashboard", nameKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", nameKey: "orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Production", nameKey: "production", href: "/dashboard/production", icon: Cog },
  { name: "Inventory", nameKey: "inventory", href: "/dashboard/inventory", icon: Package },
  { name: "More", nameKey: "more", href: "#", icon: Menu, isMore: true },
];

// More sheet grouped modules (Zoho Books style)
const moreSheetSections = [
  {
    label: "FINANCE",
    color: "#16A34A",
    items: [
      { name: "Billing & Invoices", desc: "Create and manage invoices", icon: Receipt, emoji: "🧾", href: "/dashboard/billing" },
      { name: "Payments", desc: "Track incoming payments", icon: CreditCard, emoji: "💳", href: "/dashboard/payments" },
      { name: "Folio", desc: "Credit notes & ledger", icon: BookOpen, emoji: "📁", href: "/dashboard/folio" },
    ],
  },
  {
    label: "PEOPLE",
    color: "#6366F1",
    items: [
      { name: "Clients", desc: "Manage your customers", icon: Users, emoji: "👥", href: "/dashboard/clients" },
      { name: "Team & Users", desc: "Staff roles & access", icon: UsersRound, emoji: "🧑‍💼", href: "/dashboard/users" },
      { name: "Purchasing", desc: "Vendors & purchase orders", icon: Truck, emoji: "🚚", href: "/dashboard/purchasing" },
    ],
  },
  {
    label: "REPORTS",
    color: "#F59E0B",
    items: [
      { name: "Analytics", desc: "Revenue & performance", icon: BarChart3, emoji: "📊", href: "/dashboard/analytics" },
      { name: "Machines", desc: "Equipment & maintenance", icon: Gauge, emoji: "⚙️", href: "/dashboard/machines" },
      { name: "Tally Export", desc: "Export for Tally ERP", icon: Download, emoji: "📤", href: "/dashboard/billing" },
      { name: "Previous Years", desc: "Archived FY data", icon: Archive, emoji: "📦", href: "/dashboard/reports/previous-years" },
    ],
  },
  {
    label: "TOOLS",
    color: "#2563EB",
    items: [
      { name: "AI Assistant", desc: "Smart business insights", icon: Sparkles, emoji: "🤖", href: "/dashboard/assistant" },
      { name: "Notifications", desc: "Alerts & updates", icon: Bell, emoji: "🔔", href: "/dashboard/notifications" },
      { name: "Settings", desc: "Company profile & config", icon: Settings, emoji: "⚙️", href: "/dashboard/settings" },
      { name: "Upgrade", desc: "Unlock premium features", icon: Zap, emoji: "👑", href: "/dashboard/upgrade" },
    ],
  },
];

const quickActions = [
  { label: "New Order", href: "/dashboard/orders/create", icon: ShoppingCart },
  { label: "New Production", href: "/dashboard/production/create", icon: Factory },
  { label: "Add Client", href: "/dashboard/clients", icon: Users },
  { label: "Record Payment", href: "/dashboard/payments", icon: CreditCard },
  { label: "Add Inventory", href: "/dashboard/inventory", icon: Package },
];

const SIDEBAR_STORAGE_KEY = "erp-sidebar-collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const tCommon = useTranslations("common");
  const tSidebar = useTranslations("sidebar");
  const tNav = useTranslations("nav");
  const { modules: enabledModules } = useModules();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "OPERATIONS",
    "FINANCE",
    "INTELLIGENCE",
  ]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (savedState !== null) {
      setIsCollapsed(savedState === "true");
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
      return newState;
    });
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch("/api/auth/me");
      const json = await res.json().catch(() => ({}));
      setUser(json?.user ?? null);
      setRole(json?.user?.role ?? null);

      // Redirect to setup if company setup is explicitly not complete (new users only)
      if (
        json?.user?.role === "Admin" &&
        json?.user?.company_setup_complete === false
      ) {
        router.push("/setup");
      }
    };
    fetchUser();

    const onUserUpdated = () => fetchUser();
    window.addEventListener(USER_UPDATED_EVENT, onUserUpdated);

    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(USER_UPDATED_EVENT, onUserUpdated);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    usePageStateCache.getState().clearAll();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const getPageName = () => {
    const segment = pathname.split("/").pop();
    if (segment === "dashboard") return tNav("dashboard");
    const segmentKeyMap: Record<string, string> = {
      orders: "orders", production: "production", machines: "machines",
      inventory: "inventory", purchasing: "purchasing", billing: "billing",
      payments: "payments", clients: "clients", assistant: "aiAssistant",
      analytics: "analytics", folio: "folio", users: "users", upgrade: "upgrade",
      activity: "activity",
    };
    if (segment && segmentKeyMap[segment]) {
      try { return tNav(segmentKeyMap[segment] as any); } catch { /* fall through */ }
    }
    if (segment === "settings") return tCommon("settings");
    if (segment === "profile") return tCommon("profile");
    return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : tNav("dashboard");
  };

  // ─── Loading Splash ────────────────────────────────────
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary"
          >
            <Factory className="h-5 w-5 text-white" />
          </div>
          <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/10 selection:text-primary">
      {/* ════════════ DESKTOP SIDEBAR ════════════ */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? "72px" : "240px" }}
        transition={transitionSidebar}
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-50 flex-col",
          "bg-[var(--erp-sidebar-bg,var(--sidebar))] border-r border-[var(--sidebar-border)]"
        )}
      >
        <div className="flex flex-col h-full">
          {/* ── Logo ── */}
          <div className="h-[56px] flex items-center px-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div
                className="flex-shrink-0 w-[34px] h-[34px] rounded-lg flex items-center justify-center bg-primary"
              >
                <Factory className="h-[17px] w-[17px] text-white" />
              </div>
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.div
                    key="sidebar-label"
                    variants={variantsSidebarLabel}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="overflow-hidden"
                  >
                    <span className="text-[14px] font-semibold text-foreground whitespace-nowrap">
                      {tSidebar("appName")}
                    </span>
                    <span className="text-[11px] block -mt-0.5 text-muted-foreground">
                      {tSidebar("appSubtitle")}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* ── Navigation ── */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2">
            {filterNavigationByRole(navigationGroups, role).map((group) => ({
              ...group,
              items: group.items.filter((item) => {
                const moduleKey = NAV_MODULE_MAP[item.nameKey];
                if (!moduleKey) return true; // Not module-gated
                return enabledModules[moduleKey];
              }),
            })).filter((group) => group.items.length > 0).map((group) => (
              <div key={group.label} className="mb-1">
                {!isCollapsed ? (
                  <>
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <span>{tSidebar(group.labelKey as any)}</span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform duration-200",
                          expandedGroups.includes(group.label) ? "rotate-0" : "-rotate-90"
                        )}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {expandedGroups.includes(group.label) && (
                        <motion.div
                          key={group.label}
                          variants={variantsSidebarGroup}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="overflow-hidden space-y-0.5"
                        >
                          {group.items.map((item) => {
                            const isActive =
                              item.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname.startsWith(item.href);
                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                  "group relative flex items-center h-[36px] px-3 rounded-lg transition-all duration-150",
                                  isActive
                                    ? "bg-primary/10 text-primary border border-primary/10"
                                    : "text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-foreground"
                                )}
                              >
                                <item.icon
                                  size={18}
                                  strokeWidth={isActive ? 2 : 1.8}
                                  className={cn(
                                    "flex-shrink-0",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                  )}
                                />
                                <span className="ml-3 text-[13px] font-medium">
                                  {tNav(item.nameKey as any)}
                                </span>
                                {item.badge !== undefined && item.badge > 0 && (
                                  <span
                                    className={cn(
                                      "ml-auto min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold",
                                      isActive
                                        ? "bg-primary/20 text-primary"
                                        : "bg-destructive text-white"
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive =
                        item.href === "/dashboard"
                          ? pathname === "/dashboard"
                          : pathname.startsWith(item.href);
                      return (
                        <div key={item.name} className="relative group">
                          <Link
                            href={item.href}
                            className={cn(
                              "relative flex items-center justify-center h-[36px] w-full rounded-lg transition-all duration-150",
                              isActive
                                ? "bg-primary/10 border border-primary/10"
                                : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center justify-center w-9 h-9 rounded-lg",
                                "bg-black/[0.04] dark:bg-white/[0.05]",
                                "border border-black/[0.06] dark:border-white/[0.07]"
                              )}
                            >
                              <item.icon
                                size={18}
                                strokeWidth={isActive ? 2 : 1.8}
                                className={cn(
                                  isActive ? "text-primary" : "text-muted-foreground"
                                )}
                              />
                            </div>
                          </Link>
                          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 border shadow-md">
                            {tNav(item.nameKey as any)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* ── Footer ── */}
          <div className="p-2 mt-auto border-t border-[var(--sidebar-border)] space-y-1">

            {/* Collapse Toggle */}
            <button
              onClick={toggleCollapsed}
              className="hidden md:flex w-full items-center justify-center h-[34px] rounded-md text-muted-foreground hover:bg-[var(--sidebar-accent)] hover:text-foreground transition-all cursor-pointer"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <div className="flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-[12px] font-medium">{tCommon("collapse")}</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ════════════ MAIN CONTENT AREA ════════════ */}
      <div
        className={cn(
          "flex flex-col transition-all duration-200 ease-in-out",
          "md:pl-[240px]",
          isCollapsed && "md:pl-[72px]"
        )}
      >
        {/* ── Enterprise Header ── */}
        <header
          className={cn(
            "sticky top-0 z-40 h-[56px] w-auto flex items-center justify-between px-4 md:px-5 transition-all duration-200",
            scrolled ? "bg-[var(--erp-topbar-bg)] backdrop-blur-sm border-b border-border shadow-sm" : "bg-transparent border-b border-transparent"
          )}
        >
          {/* Left */}
          <div className="flex items-center gap-3">
            {/* Mobile Logo */}
            <div className="md:hidden flex items-center gap-2.5">
              <div
                className="w-[30px] h-[30px] rounded-md flex items-center justify-center bg-primary"
              >
                <Factory className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-[14px] text-foreground">
                {tSidebar("appName")}
              </span>
            </div>

            {/* Desktop Breadcrumbs */}
            <div className="hidden md:flex items-center gap-2 text-[13px]">
              {pathname === "/dashboard" ? (
                <span className="font-medium text-foreground">
                  {tNav("dashboard")}
                </span>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className="text-muted-foreground hover:text-foreground transition-colors duration-150"
                  >
                    {tNav("dashboard")}
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="font-medium text-foreground">
                    {getPageName()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Command Palette Trigger (⌘K) */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className={cn(
                "hidden md:flex items-center gap-2 h-[34px] px-3",
                "bg-muted rounded-md",
                "text-muted-foreground text-[13px]",
                "border border-border",
                "hover:bg-accent/10 hover:border-primary/20 transition-all cursor-pointer"
              )}
            >
              <Search className="h-4 w-4" />
              <span>{tCommon("search")}</span>
              <kbd className="ml-3 inline-flex h-[18px] items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden md:flex h-[34px] px-3 items-center gap-2 text-[12px] font-medium text-muted-foreground rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Quick actions</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-lg p-1">
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {quickActions.map((action) => (
                  <DropdownMenuItem key={action.href} asChild className="rounded-md h-8">
                    <Link href={action.href} className="flex items-center gap-2.5">
                      <action.icon className="h-4 w-4 text-primary" />
                      <span className="text-[13px]">{action.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-[34px] w-[34px] flex items-center justify-center text-muted-foreground rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
                >
                  <Sun className="h-[16px] w-[16px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[16px] w-[16px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">{tCommon("toggleTheme")}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-lg min-w-[150px]">
                <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-md gap-2 text-[13px]">
                  <Sun className="h-4 w-4" /> {tCommon("light")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-md gap-2 text-[13px]">
                  <Moon className="h-4 w-4" /> {tCommon("dark")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-md gap-2 text-[13px]">
                  <Monitor className="h-4 w-4" /> {tCommon("system")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <LanguageSwitcherCompact />

            <NotificationDropdown />

            {/* Mobile Search */}
            <button
              className="md:hidden h-[34px] w-[34px] flex items-center justify-center text-muted-foreground rounded-md border border-border hover:bg-muted transition-colors"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Search className="h-[16px] w-[16px]" />
            </button>

            {/* User Avatar Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer relative">
                    <UserAvatar src={user.avatar_url} name={user.fullName} email={user.email} size="sm" className="ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-150" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[220px] rounded-lg p-0 overflow-hidden"
                  align="end"
                  forceMount
                >
                  {/* Header Section */}
                  <div className="p-3 flex items-center gap-3 border-b border-border">
                    <UserAvatar src={user.avatar_url} name={user.fullName} email={user.email} size="md" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {user.fullName || user.email?.split("@")[0]}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div className="px-3 py-2 border-b border-border">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {role || "User"}
                    </span>
                  </div>

                  {/* Menu Items */}
                  <div className="p-1 flex flex-col gap-0.5">
                    <DropdownMenuItem asChild className="h-[36px] rounded-md flex items-center gap-3 px-3 cursor-pointer">
                      <Link href="/dashboard/profile" className="w-full">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[13px]">{tCommon("profile")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="h-[36px] rounded-md flex items-center gap-3 px-3 cursor-pointer">
                      <Link href="/dashboard/settings" className="w-full">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[13px]">{tCommon("settings")}</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="h-[36px] rounded-md flex items-center gap-3 px-3 text-destructive hover:text-destructive cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-[13px]">{tCommon("logout")}</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* ════════════ MORE MENU — Enterprise Operational Launcher ════════════ */}
        <MoreMenuSheet
          isOpen={isMoreSheetOpen}
          onClose={() => setIsMoreSheetOpen(false)}
          sections={moreSheetSections}
          quickActions={quickActions}
          role={role}
          isRouteAllowed={isRouteAllowed}
        />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          {/* PageTransition: AnimatePresence mode="wait", keyed on full pathname.
               Exit animation plays before new page mounts — prevents double-fetch
               on manual useEffect pages (users/, settings/team/) and keeps
               Suspense fallbacks from appearing mid-transition. */}
          <PageTransition>
            <div className="max-w-[1400px] mx-auto">
              {children}
            </div>
          </PageTransition>
        </main>
      </div>

      {/* ════════════ MOBILE BOTTOM NAVIGATION — Floating Iconbar ════════════ */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Gradient fade — NOT a visible bar */}
        <div className="floating-nav-fade absolute inset-0 pointer-events-none" />

        {/* Floating nav items */}
        <nav
          className="relative flex items-end justify-around px-2 pt-4 pb-2 pointer-events-auto"
        >
          {filterMobileNavByRole(mobileNavItems, role).filter((item) => {
            const moduleKey = NAV_MODULE_MAP[item.nameKey];
            if (!moduleKey) return true;
            return enabledModules[moduleKey];
          }).map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            const IconComponent = item.icon;

            const navContent = (
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 relative px-3 py-1.5 rounded-2xl transition-all duration-200 nav-tap-ripple",
                  isActive && "nav-item-active-pill"
                )}
              >
                {/* Active dot indicator */}
                {isActive && (
                  <div className="nav-active-dot absolute -top-0.5 left-1/2 -translate-x-1/2" />
                )}

                {/* Icon */}
                <div
                  className={cn(
                    "transition-all duration-200",
                    isActive ? "scale-110 -translate-y-0.5" : "opacity-40"
                  )}
                >
                  <IconComponent
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className={cn(
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[10px] transition-all duration-200",
                    isActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground font-medium opacity-40"
                  )}
                >
                  {item.nameKey === "more" ? tCommon("more") : tNav(item.nameKey as any)}
                </span>
              </div>
            );

            if (item.isMore) {
              return (
                <button
                  key={item.name}
                  onClick={() => setIsMoreSheetOpen((prev) => !prev)}
                  className="cursor-pointer"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {navContent}
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {navContent}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Toast Notification Container */}
      <IOSToastContainer />
    </div>
  );
}
