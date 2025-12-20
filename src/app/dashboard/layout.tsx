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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar for Desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <div className="p-2 bg-zinc-900 rounded-lg mr-2">
              <Factory className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">PlasticPrint</span>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300",
                      "mr-3 flex-shrink-0 h-5 w-5"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-zinc-200 dark:border-zinc-800 p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-zinc-600 dark:text-zinc-400"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-zinc-900 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center">
          <Factory className="h-6 w-6 mr-2" />
          <span className="font-bold">PlasticPrint</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                pathname === item.href ? "bg-zinc-100 dark:bg-zinc-800" : "",
                "flex items-center px-3 py-2 rounded-md text-sm font-medium"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
          <Button variant="ghost" className="w-full justify-start px-3" onClick={handleLogout}>
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
