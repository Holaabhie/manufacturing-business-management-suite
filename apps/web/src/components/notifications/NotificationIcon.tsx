'use client';

import { useEffect, useState } from 'react';
import { getNotificationIcon } from './notificationIconMap';

interface NotificationIconProps {
  type: string;
  size?: number;
  className?: string;
}

/**
 * NotificationIcon — Renders a type-aware icon inside a tinted container.
 *
 * Adapts automatically to light/dark mode by observing the `dark`
 * class on `<html>`. Uses inline styles for bg/border (Tailwind JIT
 * cannot handle dynamic color values) and Tailwind for layout/transitions.
 */
export function NotificationIcon({
  type,
  size = 18,
  className,
}: NotificationIconProps) {
  const config = getNotificationIcon(type);
  const Icon = config.icon;

  // ── Dark mode detection ──
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () =>
      setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`
        flex-shrink-0 flex items-center justify-center
        w-10 h-10 rounded-2xl
        transition-all duration-200
        group-hover:scale-105
        ${className ?? ''}
      `}
      style={{
        backgroundColor: isDark ? config.bgDark : config.bgLight,
        border: `1px solid ${isDark ? config.borderDark : config.borderLight}`,
      }}
      aria-label={config.label}
      role="img"
    >
      <Icon
        size={size}
        strokeWidth={1.8}
        style={{ color: config.color }}
        aria-hidden="true"
      />
    </div>
  );
}
