"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import "./app-loader.css";

// Flag in memory to track whether the loader has shown during the current window lifecycle
let windowLoaderCycleCompleted = false;

export function AppLoader() {
  const pathname = usePathname();
  // Server-rendered initial state is mounted=true with inline styling so there is no white flash on first paint
  const [mounted, setMounted] = useState(true);
  const [fading, setFading] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const isLoginRedirect =
      typeof window !== "undefined" &&
      sessionStorage.getItem("imLoginRedirect") === "true";

    // Skip showing on in-app client navigation
    if (
      typeof window !== "undefined" &&
      sessionStorage.getItem("imLoaderShown") === "true" &&
      !isLoginRedirect &&
      windowLoaderCycleCompleted
    ) {
      setMounted(false);
      return;
    }

    if (isLoginRedirect) {
      sessionStorage.removeItem("imLoginRedirect");
    }

    // If already hidden in in-app navigation, mount is true for redirect
    setMounted(true);
    setFading(false);
    startTimeRef.current = Date.now();

    let windowLoaded =
      typeof document !== "undefined" && document.readyState === "complete";
    const isDashboard = pathname?.startsWith("/dashboard");
    let authSettled =
      !isDashboard ||
      (typeof window !== "undefined" &&
        (window as any).__imAuthSettled === true);

    const triggerUnmount = () => {
      setFading(true);
      if (typeof window !== "undefined" && (window as any).__imHardMaxTimer) {
        clearTimeout((window as any).__imHardMaxTimer);
      }
      setTimeout(() => {
        setMounted(false);
        windowLoaderCycleCompleted = true;
        try {
          sessionStorage.setItem("imLoaderShown", "true");
        } catch {}
      }, 250); // 250ms opacity fade
    };

    const checkAndTriggerHide = () => {
      if (windowLoaded && authSettled) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, 700 - elapsed); // Minimum 700ms visible
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          triggerUnmount();
        }, remaining);
      }
    };

    // Hard maximum 8s timeout - hide anyway so it can never get stuck
    const hardMaxTimer = setTimeout(() => {
      triggerUnmount();
    }, 8000);

    const onWindowLoad = () => {
      windowLoaded = true;
      checkAndTriggerHide();
    };

    if (!windowLoaded) {
      window.addEventListener("load", onWindowLoad);
    }

    const onAuthSettled = () => {
      authSettled = true;
      checkAndTriggerHide();
    };

    window.addEventListener("im-auth-settled", onAuthSettled);

    // Initial check in case window and auth are already settled
    checkAndTriggerHide();

    return () => {
      window.removeEventListener("load", onWindowLoad);
      window.removeEventListener("im-auth-settled", onAuthSettled);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      clearTimeout(hardMaxTimer);
    };
  }, [pathname]);

  if (!mounted) return null;

  return (
    <div
      id="im-app-loader"
      className={`imload-overlay ${fading ? "imload-fading" : ""}`}
      role="status"
      aria-label="Loading"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgb(38, 29, 32)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              if (window.__imHardMaxTimer) clearTimeout(window.__imHardMaxTimer);
              window.__imHardMaxTimer = setTimeout(function() {
                var el = document.getElementById("im-app-loader");
                if (el && !el.classList.contains("imload-fading")) {
                  el.classList.add("imload-fading");
                  setTimeout(function() {
                    if (el && el.parentNode) el.parentNode.removeChild(el);
                  }, 250);
                }
              }, 8000);
            })();
          `,
        }}
      />
      <div
        className="imload-stage"
        role="img"
        aria-label="iM logo with a turning gear and a rising arrow"
        style={{
          position: "relative",
          width: "min(40vw, 180px)",
          aspectRatio: "737 / 624",
        }}
      >
        <div
          className="imload-gear-window"
          style={{
            position: "absolute",
            inset: 0,
            WebkitMask: "url(/loading/gear-mask.png) center / 100% 100% no-repeat",
            mask: "url(/loading/gear-mask.png) center / 100% 100% no-repeat",
          }}
        >
          <svg
            viewBox="0 0 737 624"
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
            }}
          >
            <g className="imload-gear">
              <path
                fill="#ECEEF3"
                fillRule="evenodd"
                d="M420.40 170.18 L412.18 167.65 L409.01 149.59 L374.41 149.34 L370.98 167.36 L362.73 169.78 L354.64 173.06 L347.04 177.08 L332.02 166.56 L307.39 190.85 L317.71 206.01 L313.58 213.55 L310.18 221.60 L307.65 229.82 L289.59 232.99 L289.34 267.59 L307.36 271.02 L309.78 279.27 L313.06 287.36 L317.08 294.96 L306.56 309.98 L330.85 334.61 L346.01 324.29 L353.55 328.42 L361.60 331.82 L369.82 334.35 L372.99 352.41 L407.59 352.66 L411.02 334.64 L419.27 332.22 L427.36 328.94 L434.96 324.92 L449.98 335.44 L474.61 311.15 L464.29 295.99 L468.42 288.45 L471.82 280.40 L474.35 272.18 L492.41 269.01 L492.66 234.41 L474.64 230.98 L472.22 222.73 L468.94 214.64 L464.92 207.04 L475.44 192.02 L451.15 167.39 L435.99 177.71 L428.45 173.58Z M334 251 a57 57 0 1 0 114 0 a57 57 0 1 0 -114 0Z"
              />
            </g>
          </svg>
        </div>
        <img
          className="imload-layer"
          alt=""
          draggable={false}
          src="/loading/logo.png"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            userSelect: "none",
          }}
        />
        <img
          className="imload-layer imload-swoosh"
          alt=""
          draggable={false}
          src="/loading/swoosh.png"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            userSelect: "none",
          }}
        />
      </div>
    </div>
  );
}
