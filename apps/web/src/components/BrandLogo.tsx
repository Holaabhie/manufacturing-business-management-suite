"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  variant?: "full" | "icon";
  className?: string;
  priority?: boolean;
  alt?: string;
  width?: number;
  height?: number;
}

export function BrandLogo({
  variant = "full",
  className,
  priority = false,
  alt = "IND Manager",
  width,
  height,
}: BrandLogoProps) {
  const isIcon = variant === "icon";

  const lightSrc = isIcon
    ? "/brand/ind-manager-icon-light-theme.png"
    : "/brand/ind-manager-logo-full-light-theme.png";

  const darkSrc = isIcon
    ? "/brand/ind-manager-icon-dark-theme.png"
    : "/brand/ind-manager-logo-full-dark-theme.png";

  const defaultWidth = isIcon ? 40 : 160;
  const defaultHeight = isIcon ? 40 : 38;

  const w = width ?? defaultWidth;
  const h = height ?? defaultHeight;

  return (
    <>
      {/* Light theme logo — shown in light mode, hidden in dark mode */}
      <Image
        src={lightSrc}
        alt={alt}
        width={w}
        height={h}
        priority={priority}
        className={cn("dark:hidden object-contain", className)}
      />
      {/* Dark theme logo — hidden in light mode, shown in dark mode */}
      <Image
        src={darkSrc}
        alt={alt}
        width={w}
        height={h}
        priority={priority}
        className={cn("hidden dark:block object-contain", className)}
      />
    </>
  );
}

export default BrandLogo;
