"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Crown,
  FileText,
  Bot,
  Search,
  Sun,
  Moon,
  Monitor,
  UserCog,
  Cog,
  Cpu,
  BarChart3,
  Shield,
  Truck,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
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
  type UserRole,
} from "@/lib/role-permissions";
import { useTranslations } from "next-intl";
import { LanguageSwitcherCompact } from "@/components/LanguageSwitcher";
import { useModules, type ModuleConfig } from "@/hooks/useModules";

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
      { name: "Production", nameKey: "production", href: "/dashboard/production", icon: Cog },
      { name: "Machines", nameKey: "machines", href: "/dashboard/machines", icon: Cpu },
      { name: "Inventory", nameKey: "inventory", href: "/dashboard/inventory", icon: Package },
      { name: "Purchasing", nameKey: "purchasing", href: "/dashboard/purchasing", icon: Truck },
    ],
  },
  {
    label: "FINANCE",
    labelKey: "finance",
    items: [
      { name: "Billing", nameKey: "billing", href: "/dashboard/billing", icon: FileText },
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
      { name: "AI Assistant", nameKey: "aiAssistant", href: "/dashboard/assistant", icon: Bot },
      { name: "Analytics", nameKey: "analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { name: "Notifications", nameKey: "notifications", href: "/dashboard/notifications", icon: Bell },
    ],
  },
  {
    label: "FOLIO",
    labelKey: "folio",
    items: [
      { name: "Folio", nameKey: "folio", href: "/dashboard/folio", icon: Briefcase },
    ],
  },
  {
    label: "SYSTEM",
    labelKey: "systemGroup",
    items: [
      { name: "Users", nameKey: "users", href: "/dashboard/users", icon: UserCog },
      { name: "Upgrade", nameKey: "upgrade", href: "/dashboard/upgrade", icon: Crown },
    ],
  },
];

const mobileNavItems = [
  { name: "Dashboard", nameKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", nameKey: "orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Production", nameKey: "production", href: "/dashboard/production", icon: Cog },
  { name: "Inventory", nameKey: "inventory", href: "/dashboard/inventory", icon: Package },
  { name: "AI", nameKey: "ai", href: "/dashboard/assistant", icon: Bot },
  { name: "More", nameKey: "more", href: "#", icon: Menu, isMore: true },
];

const SIDEBAR_STORAGE_KEY = "ios-sidebar-collapsed";

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
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
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
      <div className="min-h-screen bg-[#f1f5f9] dark:bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))",
              boxShadow: "0 4px 20px rgba(0, 122, 255, 0.3)",
            }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Factory className="h-6 w-6 text-white" />
          </motion.div>
          <div className="h-1 w-32 bg-[var(--fill-tertiary)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--ios-blue)" }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-[var(--bg-page)] selection:bg-[var(--ios-blue)]/10 selection:text-[var(--ios-blue)]">
      {/* ════════════ DESKTOP SIDEBAR (Glassmorphism) ════════════ */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? "72px" : "240px" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-50 flex-col",
          "glass border-r border-[var(--border-card)]"
        )}
      >
        <div className="flex flex-col h-full">
          {/* ── Logo ── */}
          <div className="h-[60px] flex items-center px-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <motion.div
                className="flex-shrink-0 w-[36px] h-[36px] rounded-[10px] flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))",
                  boxShadow: "0 4px 14px rgba(0, 122, 255, 0.30), 0 0 0 1px rgba(255,255,255,0.1)",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Factory className="h-[18px] w-[18px] text-white" />
              </motion.div>
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <span className="text-[17px] font-semibold text-[var(--label-primary)] whitespace-nowrap tracking-[-0.41px]">
                      {tSidebar("appName")}
                    </span>
                    <span className="text-[11px] block -mt-0.5 text-[var(--label-tertiary)]">
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
                      className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--label-tertiary)] hover:text-[var(--label-secondary)] transition-colors cursor-pointer"
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
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
                                  "group relative flex items-center h-[40px] px-3 rounded-[8px] transition-all duration-200",
                                  isActive
                                    ? "text-white shadow-[0_2px_10px_rgba(0,122,255,0.35),0_0_0_1px_rgba(255,255,255,0.08)]"
                                    : "text-[var(--label-secondary)] hover:bg-[var(--fill-quaternary)] hover:text-[var(--label-primary)]"
                                )}
                                style={isActive ? {
                                  background: "linear-gradient(135deg, var(--ios-blue) 0%, var(--ios-indigo) 100%)"
                                } : undefined}
                              >
                                <item.icon className="h-[20px] w-[20px] flex-shrink-0" />
                                <span className="ml-3 text-[15px] font-medium leading-[20px]">
                                  {tNav(item.nameKey as any)}
                                </span>
                                {item.badge !== undefined && item.badge > 0 && (
                                  <span
                                    className={cn(
                                      "ml-auto min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full text-[11px] font-bold",
                                      isActive
                                        ? "bg-white/25 text-white"
                                        : "bg-[var(--ios-red)] text-white"
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
                              "relative flex items-center justify-center h-[40px] w-full rounded-[8px] transition-all duration-200",
                              isActive
                                ? "text-white shadow-[0_2px_10px_rgba(0,122,255,0.35)]"
                                : "text-[var(--label-secondary)] hover:bg-[var(--fill-quaternary)]"
                            )}
                            style={isActive ? {
                              background: "linear-gradient(135deg, var(--ios-blue) 0%, var(--ios-indigo) 100%)"
                            } : undefined}
                          >
                            <item.icon className="h-[20px] w-[20px]" />
                          </Link>
                          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[rgba(15,20,32,0.95)] text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 border border-white/10 shadow-lg backdrop-blur-sm">
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
          <div className="p-2 mt-auto border-t border-[var(--border-card)] space-y-1">

            {/* Collapse Toggle */}
            <motion.button
              onClick={toggleCollapsed}
              className="hidden md:flex w-full items-center justify-center h-[36px] rounded-[8px] text-[var(--label-tertiary)] hover:bg-[var(--fill-quaternary)] hover:text-[var(--label-secondary)] transition-all cursor-pointer"
              whileTap={{ scale: 0.95 }}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <div className="flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-[13px] font-medium">{tCommon("collapse")}</span>
                </div>
              )}
            </motion.button>
          </div>
        </div>
      </motion.aside>

      {/* ════════════ MAIN CONTENT AREA ════════════ */}
      <div
        className={cn(
          "flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pb-20 md:pb-0",
          "md:pl-[240px]",
          isCollapsed && "md:pl-[72px]"
        )}
        style={{ backgroundColor: theme === 'light' ? '#f0f4f8' : undefined }}
      >
        {/* ── Glassmorphic Header ── */}
        <header
          className={cn(
            "sticky top-0 z-40 w-full h-[60px] flex items-center justify-between px-4 md:px-6 transition-all duration-300",
            scrolled ? "glass-header shadow-sm" : "bg-transparent"
          )}
        >
          {/* Left */}
          <div className="flex items-center gap-3">
            {/* Mobile Logo */}
            <div className="md:hidden flex items-center gap-2.5">
              <div
                className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))",
                }}
              >
                <Factory className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-[17px] text-[var(--label-primary)] tracking-[-0.41px]">
                {tSidebar("appName")}
              </span>
            </div>

            {/* Desktop Breadcrumbs */}
            <div className="hidden md:flex items-center gap-2 text-[15px]">
              {pathname === "/dashboard" ? (
                <span className="font-medium text-[var(--label-primary)]">
                  {tNav("dashboard")}
                </span>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className="text-[var(--label-secondary)] hover:text-[var(--label-primary)] transition-colors duration-200"
                  >
                    {tNav("dashboard")}
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--label-quaternary)]" />
                  <span className="font-medium text-[var(--label-primary)]">
                    {getPageName()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Command Palette Trigger (⌘K) */}
            <motion.button
              onClick={() => setCommandPaletteOpen(true)}
              className={cn(
                "hidden md:flex items-center gap-2 h-[36px] px-3",
                "bg-[var(--fill-tertiary)] rounded-[10px]",
                "text-[var(--label-tertiary)] text-[15px]",
                "border border-[var(--border-card)] ring-1 ring-transparent",
                "hover:bg-[var(--fill-secondary)] hover:ring-[var(--ios-blue)]/20 focus-within:ring-[var(--ios-blue)]/40 transition-all cursor-pointer"
              )}
              whileTap={{ scale: 0.97 }}
            >
              <Search className="h-4 w-4" />
              <span>{tCommon("search")}</span>
              <kbd className="ml-3 inline-flex h-[20px] items-center gap-0.5 rounded-[4px] border border-[var(--border-card)] bg-[var(--bg-card)] px-1.5 font-mono text-[11px] text-[var(--label-tertiary)]">
                ⌘K
              </kbd>
            </motion.button>

            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center text-[var(--label-secondary)] hover:bg-[var(--fill-quaternary)] transition-colors cursor-pointer"
                  whileTap={{ scale: 0.9 }}
                >
                  <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">{tCommon("toggleTheme")}</span>
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-[12px] min-w-[160px]">
                <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-[8px] gap-2">
                  <Sun className="h-4 w-4" /> {tCommon("light")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-[8px] gap-2">
                  <Moon className="h-4 w-4" /> {tCommon("dark")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-[8px] gap-2">
                  <Monitor className="h-4 w-4" /> {tCommon("system")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <LanguageSwitcherCompact />

            <NotificationDropdown />

            {/* Mobile Search */}
            <button
              className="md:hidden h-[36px] w-[36px] rounded-[10px] flex items-center justify-center text-[var(--label-secondary)] hover:bg-[var(--fill-quaternary)] transition-colors"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            {/* User Avatar Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="cursor-pointer"
                  >
                    <Avatar className="h-[36px] w-[36px] ring-2 ring-[var(--border-card)] hover:ring-[var(--ios-blue)]/30 transition-all">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback
                        className="text-white text-[13px] font-bold"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))",
                        }}
                      >
                        {user.email?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-[12px] p-1" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal px-3 py-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-[15px] font-semibold leading-none text-[var(--label-primary)]">
                        {user.user_metadata?.full_name || user.email?.split("@")[0]}
                      </p>
                      <p className="text-[13px] leading-none text-[var(--label-secondary)]">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]">
                      <Shield className="h-3 w-3" />
                      {role || "User"}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-[8px]">
                    <Link href="/dashboard/profile" className="cursor-pointer w-full">
                      <User className="mr-2 h-4 w-4" /> {tCommon("profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-[8px]">
                    <Link href="/dashboard/settings" className="cursor-pointer w-full">
                      <Settings className="mr-2 h-4 w-4" /> {tCommon("settings")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-[var(--ios-red)] focus:text-[var(--ios-red)] cursor-pointer rounded-[8px]"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> {tCommon("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden fixed inset-x-0 top-[60px] z-40 glass max-h-[70vh] overflow-y-auto rounded-b-[16px] shadow-[var(--shadow-xl)]"
            >
              <nav className="p-4 space-y-4">
                {filterNavigationByRole(navigationGroups, role).map((group) => ({
                  ...group,
                  items: group.items.filter((item) => {
                    const moduleKey = NAV_MODULE_MAP[item.nameKey];
                    if (!moduleKey) return true;
                    return enabledModules[moduleKey];
                  }),
                })).filter((group) => group.items.length > 0).map((group) => (
                  <div key={group.label}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--label-tertiary)] px-2 mb-2">
                      {tSidebar(group.labelKey as any)}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isActive =
                          item.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname.startsWith(item.href);
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center h-[44px] px-3 rounded-[10px] transition-all duration-200",
                              isActive
                                ? "bg-[var(--ios-blue)] text-white"
                                : "text-[var(--label-primary)] hover:bg-[var(--fill-quaternary)]"
                            )}
                          >
                            <item.icon className="mr-3 h-[20px] w-[20px]" />
                            <span className="font-medium text-[17px]">{tNav(item.nameKey as any)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-[var(--border-card)]">
                  <button
                    className="w-full flex items-center h-[44px] px-3 rounded-[10px] text-[var(--ios-red)] hover:bg-[rgba(255,59,48,0.08)] transition-colors cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-[20px] w-[20px]" />
                    <span className="font-medium text-[17px]">{tCommon("logout")}</span>
                  </button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8" style={{ backgroundColor: theme === 'light' ? '#f0f4f8' : undefined }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[1400px] mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ════════════ MOBILE BOTTOM NAVIGATION (iOS Tab Bar) ════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-header">
        <nav
          className="flex items-center justify-around h-[56px] px-1"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
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

            if (item.isMore) {
              return (
                <button
                  key={item.name}
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="flex flex-col items-center justify-center min-w-[56px] py-2 px-1 text-[var(--ios-gray)] transition-colors cursor-pointer gap-1"
                >
                  <item.icon className="w-[20px] h-[20px]" />
                  <span className="text-[9px] font-semibold whitespace-nowrap tracking-[0.2px]">{item.nameKey === "more" ? tCommon("more") : tNav(item.nameKey as any)}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[56px] py-2 px-1 transition-all duration-200 gap-1",
                  isActive ? "text-[#a78bfa]" : "text-[var(--ios-gray)]"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center transition-all duration-200",
                  isActive ? "bg-[rgba(167,139,250,0.15)] rounded-[10px] px-3 py-1" : ""
                )}>
                  <item.icon className="w-[20px] h-[20px]" />
                </div>
                <span
                  className={cn(
                    "text-[9px] whitespace-nowrap tracking-[0.2px]",
                    isActive ? "font-bold" : "font-semibold"
                  )}
                >
                  {item.nameKey === "more" ? tCommon("more") : tNav(item.nameKey as any)}
                </span>
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
