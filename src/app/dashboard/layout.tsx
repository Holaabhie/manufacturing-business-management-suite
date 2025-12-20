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
  Settings,
  Bell,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "Profile", href: "/dashboard/profile", icon: User },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background selection:bg-accent/30 selection:text-accent-foreground">
      {/* Sidebar for Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? "80px" : "260px" }}
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-50 flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
          "shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="h-20 flex items-center px-6 mb-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
                <Factory className="h-5 w-5 text-accent-foreground" />
              </div>
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-xl font-bold tracking-tight text-sidebar-foreground whitespace-nowrap"
                  >
                    PlasticPrint
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center h-11 px-3 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-accent text-accent-foreground shadow-md shadow-accent/20" 
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "" : "group-hover:scale-110 transition-transform")} />
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="ml-3 font-medium whitespace-nowrap"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && !isCollapsed && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute left-0 w-1 h-6 bg-accent-foreground rounded-r-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

            {/* Footer Section */}
            <div className="p-4 mt-auto border-t border-sidebar-border space-y-2">
              <AnimatePresence mode="wait">
                {!isCollapsed && user && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center gap-3 p-2 rounded-xl bg-sidebar-accent/50 mb-2"
                  >
                    <Avatar className="h-9 w-9 border-2 border-accent/20">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-accent text-accent-foreground font-bold">
                        {user.email?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold truncate text-sidebar-foreground">
                        {user.user_metadata?.full_name || user.email?.split('@')[0]}
                      </span>
                      <span className="text-[10px] text-sidebar-foreground/50 truncate">
                        {user.email}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex w-full items-center justify-center h-10 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              >
                {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <div className="flex items-center gap-2"><ChevronLeft className="h-5 w-5" /> <span className="text-sm font-medium">Collapse</span></div>}
              </button>
              
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all",
                  isCollapsed && "justify-center"
                )}
                onClick={handleLogout}
              >
                <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && <span className="font-medium">Logout</span>}
              </Button>
            </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex flex-col transition-all duration-300 ease-in-out",
        "md:pl-[260px]",
        isCollapsed && "md:pl-[80px]"
      )}>
        {/* Header */}
        <header className={cn(
          "sticky top-0 z-40 w-full h-20 flex items-center justify-between px-6 transition-all duration-200",
          scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm" : "bg-transparent"
        )}>
          <div className="md:hidden flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <Factory className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-bold text-lg">PlasticPrint</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span>Admin Dashboard</span>
            <span className="opacity-30">/</span>
            <span className="text-foreground capitalize">{pathname.split("/").pop() || "Overview"}</span>
          </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-chart-3 rounded-full border-2 border-background" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              {user && (
                <Link href="/dashboard/profile">
                  <Avatar className="h-10 w-10 ring-2 ring-accent/20 cursor-pointer hover:ring-accent transition-all">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-accent to-chart-1 text-accent-foreground font-bold">
                      {user.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
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
              className="md:hidden fixed inset-x-0 top-20 z-40 bg-background border-b border-border p-4 shadow-2xl"
            >
              <nav className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center h-12 px-4 rounded-xl transition-all",
                      pathname === item.href ? "bg-accent text-accent-foreground" : "text-foreground/60 hover:bg-muted"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-12 px-4 text-foreground/60 hover:text-destructive hover:bg-destructive/10 mt-4" 
                  onClick={handleLogout}
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  <span className="font-medium">Logout</span>
                </Button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
