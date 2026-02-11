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
  Cog
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CommandPalette } from "@/components/CommandPalette";
import { filterNavigationByRole, filterMobileNavByRole, type UserRole } from "@/lib/role-permissions";

// Grouped navigation structure
const navigationGroups = [
  {
    label: "OPERATIONS",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart, badge: 0 },
      { name: "Production", href: "/dashboard/production", icon: Cog },
      { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { name: "Billing", href: "/dashboard/billing", icon: FileText },
      { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
    ],
  },
  {
    label: "RELATIONSHIPS",
    items: [
      { name: "Clients", href: "/dashboard/clients", icon: Users },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { name: "AI Assistant", href: "/dashboard/assistant", icon: Bot },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { name: "Users", href: "/dashboard/users", icon: UserCog },
      { name: "Profile", href: "/dashboard/profile", icon: User },
      { name: "Upgrade", href: "/dashboard/upgrade", icon: Crown },
    ],
  },
];

// Flatten for mobile nav (only show primary items)
const mobileNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Production", href: "/dashboard/production", icon: Cog },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "AI", href: "/dashboard/assistant", icon: Bot },
  { name: "More", href: "#", icon: Menu, isMore: true },
];

const SIDEBAR_STORAGE_KEY = "ind-manager-sidebar-collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["OPERATIONS", "INTELLIGENCE"]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (savedState !== null) {
      setIsCollapsed(savedState === "true");
    }
  }, []);

  // Save sidebar state to localStorage
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
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
    };
    fetchUser();

    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);

    // Command palette keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
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
    setExpandedGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  // Theme toggle component
  const ThemeToggle = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Show loading skeleton during SSR
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center animate-pulse">
            <Factory className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background selection:bg-accent/20 selection:text-accent-foreground">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: isCollapsed ? "72px" : "260px" }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={cn(
            "hidden md:flex fixed inset-y-0 left-0 z-50 flex-col bg-sidebar border-r border-sidebar-border",
            "shadow-xl"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo Section */}
            <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/30">
                  <Factory className="h-5 w-5 text-accent-foreground" />
                </div>
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden"
                    >
                      <span className="text-lg font-bold tracking-tight text-sidebar-foreground whitespace-nowrap">
                        IND Manager
                      </span>
                      <span className="text-[10px] text-sidebar-foreground/50 block -mt-0.5">
                        Enterprise Suite
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            </div>

            {/* Navigation Groups - Filtered by Role */}
            <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2">
              {filterNavigationByRole(navigationGroups, role).map((group) => (
                <div key={group.label} className="mb-4">
                  {!isCollapsed ? (
                    <Collapsible
                      open={expandedGroups.includes(group.label)}
                      onOpenChange={() => toggleGroup(group.label)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors">
                        <span>{group.label}</span>
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 transition-transform duration-200",
                            expandedGroups.includes(group.label) ? "rotate-0" : "-rotate-90"
                          )}
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 mt-1">
                        {group.items.map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={cn(
                                "group relative flex items-center h-10 px-3 rounded-lg transition-all duration-200",
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                              )}
                            >
                              {isActive && (
                                <motion.div
                                  layoutId="sidebar-active"
                                  className="absolute left-0 w-1 h-5 bg-accent rounded-r-full"
                                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                              )}
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              <span className="ml-3 text-sm font-medium">{item.name}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <Badge className="ml-auto h-5 min-w-5 px-1.5 text-[10px] bg-accent text-accent-foreground">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    // Collapsed state - icons only with tooltips
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Tooltip key={item.name}>
                            <TooltipTrigger asChild>
                              <Link
                                href={item.href}
                                className={cn(
                                  "group relative flex items-center justify-center h-10 w-full rounded-lg transition-all duration-200",
                                  isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                )}
                              >
                                {isActive && (
                                  <motion.div
                                    layoutId="sidebar-active-collapsed"
                                    className="absolute left-0 w-1 h-5 bg-accent rounded-r-full"
                                  />
                                )}
                                <item.icon className="h-4 w-4" />
                                {item.badge !== undefined && item.badge > 0 && (
                                  <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
                                )}
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-medium">
                              {item.name}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Footer Section */}
            <div className="p-3 mt-auto border-t border-sidebar-border space-y-2">
              {/* User Info */}
              <AnimatePresence mode="wait">
                {user && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <Link
                      href="/dashboard/profile"
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-sidebar-accent/50",
                        isCollapsed ? "justify-center" : "bg-sidebar-accent/30"
                      )}
                    >
                      <Avatar className={cn("border-2 border-accent/30 transition-all", isCollapsed ? "h-9 w-9" : "h-8 w-8")}>
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-accent text-accent-foreground text-sm font-bold">
                          {user.email?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {!isCollapsed && (
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate text-sidebar-foreground">
                              {user.user_metadata?.full_name || user.email?.split('@')[0]}
                            </span>
                          </div>
                          <span className="text-[10px] text-sidebar-foreground/50 truncate">
                            {role || "User"}
                          </span>
                        </div>
                      )}
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapse Toggle */}
              <button
                onClick={toggleCollapsed}
                className="hidden md:flex w-full items-center justify-center h-9 rounded-lg hover:bg-sidebar-accent/50 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <div className="flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-xs font-medium">Collapse</span>
                  </div>
                )}
              </button>

              {/* Logout Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full text-sidebar-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-all",
                      isCollapsed ? "justify-center px-0" : "justify-start"
                    )}
                    onClick={handleLogout}
                  >
                    <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                    {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">Logout</TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <div className={cn(
          "flex flex-col transition-all duration-200 ease-in-out pb-16 md:pb-0",
          "md:pl-[260px]",
          isCollapsed && "md:pl-[72px]"
        )}>
          {/* Top Header Bar */}
          <header className={cn(
            "sticky top-0 z-40 w-full h-16 flex items-center justify-between px-4 md:px-6 transition-all duration-200",
            scrolled
              ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm"
              : "bg-background border-b border-transparent"
          )}>
            {/* Left Section - Mobile Logo / Breadcrumbs */}
            <div className="flex items-center gap-3">
              {/* Mobile Logo */}
              <div className="md:hidden flex items-center gap-2">
                <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                  <Factory className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-base">IND Manager</span>
              </div>

              {/* Desktop Breadcrumbs */}
              <div className="hidden md:flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
                <span className="text-muted-foreground/50">/</span>
                <span className="font-medium text-foreground capitalize">
                  {pathname.split("/").pop() === "dashboard" ? "Overview" : pathname.split("/").pop()}
                </span>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2">
              {/* Command Palette Trigger */}
              <Button
                variant="outline"
                className="hidden md:flex items-center gap-2 h-9 px-3 text-muted-foreground hover:text-foreground bg-muted/50"
                onClick={() => setCommandPaletteOpen(true)}
              >
                <Search className="h-4 w-4" />
                <span className="text-sm">Search...</span>
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>

              {/* Mobile Search */}
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 text-muted-foreground">
                <Search className="h-4 w-4" />
              </Button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <NotificationDropdown />

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 text-muted-foreground"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>

              {/* User Dropdown */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-9 w-9 ring-2 ring-border cursor-pointer hover:ring-accent transition-all">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                        {user.email?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.user_metadata?.full_name || user.email?.split('@')[0]}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <User className="mr-2 h-4 w-4" />
                        <span>Role: {role || "User"}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>
                          <Crown className="mr-2 h-4 w-4 text-amber-500" />
                          Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <User className="mr-2 h-4 w-4 text-blue-500" />
                          Manager
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="mr-2 h-4 w-4 text-slate-500" />
                          Operator
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile" className="cursor-pointer w-full">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile?tab=settings" className="cursor-pointer w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
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
                className="md:hidden fixed inset-x-0 top-16 z-40 bg-background border-b border-border shadow-xl max-h-[70vh] overflow-y-auto"
              >
                <nav className="p-4 space-y-4">
                  {filterNavigationByRole(navigationGroups, role).map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">
                        {group.label}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center h-11 px-3 rounded-xl transition-all",
                              pathname === item.href
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground/70 hover:bg-muted"
                            )}
                          >
                            <item.icon className="mr-3 h-5 w-5" />
                            <span className="font-medium">{item.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-11 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      <span className="font-medium">Logout</span>
                    </Button>
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
          <nav className="flex items-center justify-around h-16 px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {filterMobileNavByRole(mobileNavItems, role).map((item) => {
              const isActive = pathname === item.href;
              if (item.isMore) {
                return (
                  <button
                    key={item.name}
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="flex flex-col items-center justify-center py-2 px-3 text-muted-foreground"
                  >
                    <item.icon className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-medium">{item.name}</span>
                  </button>
                );
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-3 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Command Palette */}
        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      </div>
    </TooltipProvider>
  );
}
