"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Share, SquarePlus, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "im_ios_install_hint_dismissed";

export function IosInstallHint() {
  const t = useTranslations("iosInstall");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check if previously dismissed
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") {
        return;
      }
    } catch {
      // ignore storage access errors
    }

    // 2. Check standalone mode (PWA already installed or standalone display mode)
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches ||
      new URLSearchParams(window.location.search).get("mode") === "standalone";
    if (isStandalone) return;

    // 3. Check Capacitor native app
    const isCapacitor =
      typeof (window as any).Capacitor !== "undefined" &&
      typeof (window as any).Capacitor.isNativePlatform === "function" &&
      (window as any).Capacitor.isNativePlatform();
    if (isCapacitor) return;

    // 4. Check User Agent
    const ua = window.navigator.userAgent || "";

    // Must be iOS (iPhone/iPad/iPod or iPadOS desktop emulation)
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    if (!isIos) return;

    // Must NOT be an in-app browser (Instagram, WhatsApp, Facebook, Line)
    const isInAppBrowser = /FBAN|FBAV|Instagram|Line|WhatsApp/i.test(ua);
    if (isInAppBrowser) return;

    setShow(true);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="md:hidden fixed left-4 right-4 z-40 pointer-events-auto select-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
          aria-label={t("title")}
          role="region"
        >
          <div className="relative flex items-center gap-3 p-3 rounded-[20px] bg-card/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border border-border shadow-2xl shadow-black/15 dark:shadow-black/50">
            {/* App Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-[12px] bg-background border border-border/60 p-1 flex items-center justify-center shadow-sm">
              <BrandLogo variant="icon" width={32} height={32} className="w-full h-full object-contain" />
            </div>

            {/* Instruction Text */}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-[13px] font-semibold text-foreground tracking-tight leading-snug">
                {t("title")}
              </h4>
              <p className="text-[11px] leading-[15px] text-muted-foreground mt-0.5">
                {t.rich("instruction", {
                  shareIcon: () => (
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-primary/10 text-primary mx-0.5 align-middle">
                      <Share className="w-3 h-3" />
                    </span>
                  ),
                  plusIcon: () => (
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-muted text-foreground mx-0.5 align-middle">
                      <SquarePlus className="w-3 h-3" />
                    </span>
                  ),
                })}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              aria-label={t("dismiss")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
