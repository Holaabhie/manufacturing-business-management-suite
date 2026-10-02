"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Reuses the exact same ThemeToggle pattern from dashboard/layout.tsx:
 *  - useTheme() from next-themes
 *  - DropdownMenu with Light / Dark / System options (Sun/Moon/Monitor icons)
 * No new component library — these components are already used in the dashboard.
 */
export function LandingThemeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-[34px] w-[34px] rounded-md border border-border" />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-[34px] w-[34px] items-center justify-center text-muted-foreground rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          <Sun className="h-[16px] w-[16px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[16px] w-[16px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-lg min-w-[150px]">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="rounded-md gap-2 text-[13px] cursor-pointer"
        >
          <Sun className="h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="rounded-md gap-2 text-[13px] cursor-pointer"
        >
          <Moon className="h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="rounded-md gap-2 text-[13px] cursor-pointer"
        >
          <Monitor className="h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
