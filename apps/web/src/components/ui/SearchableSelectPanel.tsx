"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface SearchableSelectPanelProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  align?: "left" | "right";
  minWidth?: number;
  width?: number;
}

export function SearchableSelectPanel({
  open,
  onClose,
  triggerRef,
  children,
  className,
  style,
  align = "left",
  minWidth,
  width,
}: SearchableSelectPanelProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  }>({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) return;

    // If trigger element has scrolled completely off-screen, close the panel
    if (rect.bottom < -40 || rect.top > window.innerHeight + 40) {
      onClose();
      return;
    }

    const viewportWidth = window.innerWidth;
    const targetWidth =
      typeof width === "number"
        ? width
        : Math.max(minWidth ?? 0, rect.width);
    const panelWidth = Math.min(targetWidth, viewportWidth - 16);

    let left = align === "right" ? rect.right - panelWidth : rect.left;
    left = Math.max(8, Math.min(left, viewportWidth - panelWidth - 8));

    const top = rect.bottom + 4;

    setCoords((prev) => {
      if (
        Math.abs(prev.top - top) < 0.5 &&
        Math.abs(prev.left - left) < 0.5 &&
        Math.abs(prev.width - panelWidth) < 0.5
      ) {
        return prev;
      }
      return { top, left, width: panelWidth };
    });
  }, [triggerRef, onClose, align, minWidth, width]);

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, updatePosition]);

  // Recalculate on scroll (any parent scroll container via capture) and window resize
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", updatePosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  // Outside click listener
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (panelRef.current && panelRef.current.contains(target)) {
        return;
      }
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open, onClose, triggerRef]);

  // Search input auto-focus support
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => {
        const input = panelRef.current?.querySelector("input");
        if (input && document.activeElement !== input) {
          input.focus();
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  // Immediate fallback calculation for first paint if coords not yet set
  let currentCoords = coords;
  if (currentCoords.width === 0 && triggerRef.current) {
    const rect = triggerRef.current.getBoundingClientRect();
    if (rect.width > 0) {
      const viewportWidth = window.innerWidth;
      const targetWidth =
        typeof width === "number"
          ? width
          : Math.max(minWidth ?? 0, rect.width);
      const panelWidth = Math.min(targetWidth, viewportWidth - 16);
      let left = align === "right" ? rect.right - panelWidth : rect.left;
      left = Math.max(8, Math.min(left, viewportWidth - panelWidth - 8));
      currentCoords = {
        top: rect.bottom + 4,
        left,
        width: panelWidth,
      };
    }
  }

  return createPortal(
    <div
      ref={panelRef}
      style={{
        top: `${currentCoords.top}px`,
        left: `${currentCoords.left}px`,
        width: `${currentCoords.width}px`,
        scrollbarColor: "var(--border) transparent",
        ...style,
      }}
      className={cn(
        "fixed z-[1100] bg-[var(--surface-popover)] border border-[var(--surface-popover-border)] rounded-xl shadow-xl max-h-[min(240px,40vh)] overflow-y-auto p-1",
        "scrollbar-thin [scrollbar-width:thin]",
        "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:bg-[var(--border)] dark:[&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.18)] [&::-webkit-scrollbar-thumb]:rounded-full",
        "hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(15,23,42,0.24)] dark:hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.28)]",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}
