"use client";

import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-[34px] w-[34px]",
  md: "h-[38px] w-[38px]",
  lg: "h-16 w-16",
} as const;

function getInitials(name?: string, email?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (email?.slice(0, 2) ?? "?").toUpperCase();
}

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  email?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Single source of truth for rendering a user avatar with an initials fallback.
 * Used in the navbar trigger, dropdown header, and anywhere else a user avatar is shown.
 */
export function UserAvatar({ src, name, email, size = "sm", className }: UserAvatarProps) {
  return (
    <Avatar className={cn(SIZES[size], className)}>
      {src ? <AvatarImage src={src} alt={name ?? email ?? "User"} /> : null}
      <AvatarFallback className="text-white font-bold bg-primary text-[12px]">
        {getInitials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
