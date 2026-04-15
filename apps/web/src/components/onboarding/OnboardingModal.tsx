"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Building2,
  Sparkles,
  X,
  Loader2,
  Lock,
  Cog,
  Cpu,
  Package,
  ShoppingCart,
  FileText,
  CreditCard,
  Users,
  LayoutDashboard,
  Bot,
  UserCog,
} from "lucide-react";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import {
  useModules,
  MODULE_META,
  LOCKED_MODULES,
  type ModuleConfig,
} from "@/hooks/useModules";

const BUSINESS_TYPES = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "trader", label: "Trader" },
  { value: "both", label: "Both" },
];

// Icon map for module meta
const ICON_MAP: Record<string, any> = {
  Cog,
  Cpu,
  Package,
  ShoppingCart,
  FileText,
  CreditCard,
  Users,
  LayoutDashboard,
  Bot,
  UserCog,
};

export function OnboardingModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0); // 0=Welcome, 1=Company Form, 2=Module Selection, 3=Done
  const [closing, setClosing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Shared company profile hook — single source of truth
  const { updateCompanyProfile } = useCompanyProfile();

  // Module selection hook
  const { modules, updateAllModules } = useModules();

  // Local module state for the form (commit on continue)
  const [localModules, setLocalModules] = useState<ModuleConfig>({ ...modules });

  // Sync local modules when hook modules change (e.g., loaded from localStorage)
  useEffect(() => {
    setLocalModules({ ...modules });
  }, [modules]);

  // Company form state
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      // Check localStorage first (fast)
      const localDone = localStorage.getItem("ind_onboarding_complete");
      if (localDone === "true") return;

      // Legacy key check
      const legacyDone = localStorage.getItem("ind_onboarding_done");
      if (legacyDone === "true") {
        localStorage.setItem("ind_onboarding_complete", "true");
        return;
      }

      // Check DB (authoritative)
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data?.profile?.onboarding_complete || data?.onboarding_complete) {
            localStorage.setItem("ind_onboarding_complete", "true");
            return;
          }
        }
      } catch {
        // If DB check fails, fall back to localStorage
        if (localDone === "true" || legacyDone === "true") return;
      }

      // Also check if company details already exist — skip if so
      try {
        const companyRes = await fetch("/api/profile/company");
        if (companyRes.ok) {
          const companyData = await companyRes.json();
          if (companyData?.company?.companyName) {
            // Company already set up, mark onboarding done
            localStorage.setItem("ind_onboarding_complete", "true");
            return;
          }
        }
      } catch {
        // Non-blocking
      }

      // Show onboarding
      setShow(true);
    };

    // Delay to avoid flash
    const timer = setTimeout(checkOnboarding, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (show && !closing) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [show, closing]);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && show && !closing) {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [show, closing]);

  const completeOnboarding = useCallback(async () => {
    // Save to localStorage immediately
    localStorage.setItem("ind_onboarding_complete", "true");
    // Legacy compat
    localStorage.setItem("ind_onboarding_done", "true");

    // Save to DB
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarding_complete: true }),
      });
    } catch {
      // localStorage is already saved, so this is non-blocking
    }
  }, []);

  const handleSaveCompany = async () => {
    setFormError("");

    if (!companyName.trim()) {
      setFormError("Company name is required");
      return;
    }

    setSaving(true);
    try {
      // Use the shared hook — same endpoint as Settings page
      await updateCompanyProfile({
        companyName: companyName.trim(),
        gstin: gstin.trim().toUpperCase(),
        businessType: businessType,
        address: address.trim(),
        phone: phone.trim(),
      });

      // Success — move to module selection step
      setStep(2);
    } catch (err: any) {
      setFormError(err.message || "Failed to save company details. Please try again.");
      // Do NOT advance on error — user must retry
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      handleSaveCompany();
    } else if (step === 2) {
      // Save module selection before proceeding
      updateAllModules(localModules);
      setStep(3);
    } else {
      // Step 3 — Done
      setClosing(true);
      completeOnboarding();
      setTimeout(() => setShow(false), 400);
    }
  };

  const handleSkip = () => {
    if (step === 1) {
      // Skip company form, go to module selection
      setStep(2);
      return;
    }
    if (step === 2) {
      // Skip module selection with defaults, go to done
      updateAllModules(localModules);
      setStep(3);
      return;
    }
    setClosing(true);
    completeOnboarding();
    setTimeout(() => setShow(false), 400);
  };

  const handleDismiss = () => {
    // Save current module state before dismissing
    updateAllModules(localModules);
    setClosing(true);
    completeOnboarding();
    setTimeout(() => setShow(false), 400);
  };

  const handleToggleModule = (key: keyof ModuleConfig) => {
    if (LOCKED_MODULES.includes(key)) return;
    setLocalModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!show) return null;

  // Input shared styles
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    color: "#f1f5f9",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const totalSteps = 4;

  // Toggleable module keys (non-locked)
  const toggleableModules: (keyof ModuleConfig)[] = [
    "production",
    "machines",
    "inventory",
    "orders",
    "billing",
    "payments",
    "clients",
  ];
  const lockedModuleKeys: (keyof ModuleConfig)[] = [
    "dashboard",
    "ai_assistant",
    "staff_roles",
  ];

  return (
    <AnimatePresence>
      {!closing && (
        /* Full-screen backdrop overlay */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          {/* Modal card — relative inside flex container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "relative",
              zIndex: 51,
              width: "100%",
              maxWidth: step === 1 ? 520 : step === 2 ? 540 : 480,
              background: "linear-gradient(135deg, #0f1729 0%, #0a0f1e 100%)",
              border: "1px solid rgba(167,139,250,0.3)",
              boxShadow:
                "0 0 0 1px rgba(167,139,250,0.1), 0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(167,139,250,0.08)",
              borderRadius: 24,
              padding: "36px 32px",
              maxHeight: "calc(100vh - 100px)",
              overflowY: "auto",
            }}
          >
            {/* Close / Dismiss Button */}
            <button
              onClick={handleDismiss}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: 6,
                cursor: "pointer",
                color: "rgba(255,255,255,0.4)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>

            {/* ── STEP 0: Welcome ── */}
            {step === 0 && (
              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 200 }}
                  style={{ fontSize: 48, marginBottom: 16 }}
                >
                  👋
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#f1f5f9",
                    marginBottom: 8,
                  }}
                >
                  Welcome to IND Manager
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.45)",
                    lineHeight: 1.6,
                    maxWidth: 340,
                  }}
                >
                  Let&apos;s set up your business in 2 minutes. We&apos;ll personalize
                  IND Manager just for you.
                </motion.p>
              </div>
            )}

            {/* ── STEP 1: Company Details Form ── */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #a78bfa33, #7c3aed33)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Building2 style={{ width: 20, height: 20, color: "#a78bfa" }} />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#f1f5f9",
                        margin: 0,
                      }}
                    >
                      Company Details
                    </h2>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.4)",
                        margin: 0,
                      }}
                    >
                      Tell us about your business
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {/* Company Name */}
                  <div>
                    <label style={labelStyle}>
                      Company Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Industries Pvt. Ltd."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      autoFocus
                    />
                  </div>

                  {/* GST Number */}
                  <div>
                    <label style={labelStyle}>GST Number (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AABCU9603R1ZM"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      maxLength={15}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* Business Type */}
                  <div>
                    <label style={labelStyle}>Business Type</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      style={{
                        ...inputStyle,
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: "right 12px center",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "16px",
                        paddingRight: 36,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <option value="" style={{ background: "#0f1729", color: "#94a3b8" }}>
                        Select type...
                      </option>
                      {BUSINESS_TYPES.map((bt) => (
                        <option
                          key={bt.value}
                          value={bt.value}
                          style={{ background: "#0f1729", color: "#f1f5f9" }}
                        >
                          {bt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Address & Phone on same row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Address (optional)</label>
                      <input
                        type="text"
                        placeholder="City, State"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        style={inputStyle}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.1)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone / WhatsApp</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={inputStyle}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.1)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  </div>

                  {/* Form error */}
                  {formError && (
                    <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{formError}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Module Selection ── */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #34c75933, #30d15833)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Sparkles style={{ width: 20, height: 20, color: "#34c759" }} />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#f1f5f9",
                        margin: 0,
                      }}
                    >
                      Here&apos;s what we recommend
                    </h2>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.4)",
                        margin: 0,
                      }}
                    >
                      Toggle the modules you need. You can change this later in Settings.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {/* Toggleable modules */}
                  {toggleableModules.map((key) => {
                    const meta = MODULE_META[key];
                    const IconComponent = ICON_MAP[meta.icon];
                    const isEnabled = localModules[key];

                    return (
                      <button
                        key={key}
                        onClick={() => handleToggleModule(key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          background: isEnabled
                            ? "rgba(167,139,250,0.08)"
                            : "rgba(255,255,255,0.03)",
                          border: `1px solid ${
                            isEnabled
                              ? "rgba(167,139,250,0.25)"
                              : "rgba(255,255,255,0.08)"
                          }`,
                          borderRadius: 14,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "left",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: `${meta.color}18`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {IconComponent && (
                            <IconComponent
                              style={{ width: 17, height: 17, color: meta.color }}
                            />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#f1f5f9",
                              margin: 0,
                            }}
                          >
                            {meta.label}
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              color: "rgba(255,255,255,0.35)",
                              margin: 0,
                              lineHeight: 1.3,
                            }}
                          >
                            {meta.description}
                          </p>
                        </div>
                        {/* Toggle */}
                        <div
                          style={{
                            width: 44,
                            height: 24,
                            borderRadius: 12,
                            background: isEnabled
                              ? "linear-gradient(135deg, #a78bfa, #7c3aed)"
                              : "rgba(255,255,255,0.12)",
                            display: "flex",
                            alignItems: "center",
                            padding: 2,
                            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              background: "white",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                              transform: isEnabled
                                ? "translateX(20px)"
                                : "translateX(0px)",
                              transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}

                  {/* Divider */}
                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.06)",
                      margin: "4px 0",
                    }}
                  />

                  {/* Locked modules */}
                  {lockedModuleKeys.map((key) => {
                    const meta = MODULE_META[key];
                    const IconComponent = ICON_MAP[meta.icon];

                    return (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 14,
                          opacity: 0.6,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: `${meta.color}18`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {IconComponent && (
                            <IconComponent
                              style={{ width: 17, height: 17, color: meta.color }}
                            />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#f1f5f9",
                              margin: 0,
                            }}
                          >
                            {meta.label}
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              color: "rgba(255,255,255,0.35)",
                              margin: 0,
                            }}
                          >
                            {meta.description}
                          </p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            background: "rgba(255,255,255,0.06)",
                            borderRadius: 8,
                            flexShrink: 0,
                          }}
                        >
                          <Lock
                            style={{ width: 11, height: 11, color: "rgba(255,255,255,0.3)" }}
                          />
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: "rgba(255,255,255,0.3)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Always included
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Done ── */}
            {step === 3 && (
              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 200 }}
                  style={{ fontSize: 48, marginBottom: 16 }}
                >
                  🎉
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#f1f5f9",
                    marginBottom: 8,
                  }}
                >
                  You&apos;re All Set!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.45)",
                    lineHeight: 1.6,
                    maxWidth: 340,
                  }}
                >
                  Your workspace is ready. Explore inventory forecasting, analytics,
                  billing, and AI-powered insights.
                </motion.p>

                {companyName && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    style={{
                      marginTop: 12,
                      padding: "8px 16px",
                      background: "rgba(167,139,250,0.1)",
                      border: "1px solid rgba(167,139,250,0.2)",
                      borderRadius: 10,
                      fontSize: 13,
                      color: "#a78bfa",
                      fontWeight: 600,
                    }}
                  >
                    <Building2
                      style={{ width: 14, height: 14, display: "inline", marginRight: 6, verticalAlign: "-2px" }}
                    />
                    {companyName}
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Footer ── */}
            <div className="flex flex-col items-center" style={{ marginTop: 28 }}>
              {/* Progress Dots */}
              <div
                className="flex items-center justify-center gap-2"
                style={{ marginBottom: 16 }}
              >
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === step
                        ? "w-6 bg-[#a78bfa]"
                        : i < step
                        ? "w-1.5 bg-[#a78bfa]/50"
                        : "w-1.5 bg-white/15"
                    )}
                  />
                ))}
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                disabled={saving}
                style={{
                  width: "100%",
                  padding: 14,
                  background: saving
                    ? "rgba(167,139,250,0.4)"
                    : "linear-gradient(135deg, #a78bfa, #7c3aed)",
                  border: "none",
                  borderRadius: 14,
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: saving ? "none" : "0 8px 24px rgba(167,139,250,0.4)",
                  cursor: saving ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <>
                    <Loader2
                      style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }}
                    />
                    Saving...
                  </>
                ) : step === 0 ? (
                  <>
                    Get Started
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </>
                ) : step === 1 ? (
                  <>
                    Save & Continue
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </>
                ) : step === 2 ? (
                  <>
                    Continue
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </>
                ) : (
                  <>
                    Go to Dashboard
                    <Sparkles style={{ width: 16, height: 16 }} />
                  </>
                )}
              </motion.button>

              {/* Skip link */}
              {step < 3 && (
                <button
                  onClick={handleSkip}
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.3)",
                    marginTop: 12,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "rgba(255,255,255,0.6)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(255,255,255,0.3)")
                  }
                >
                  {step === 1
                    ? "Skip — I\u2019ll fill this later in Settings"
                    : step === 2
                    ? "Skip — use defaults"
                    : "Skip onboarding"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
