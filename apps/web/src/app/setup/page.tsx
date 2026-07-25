"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, ChevronLeft, Lock, Factory, ArrowRight } from "lucide-react";

// ─── Constants ───────────────────────────────────────────
const STATES = [
  "Maharashtra", "Gujarat", "Rajasthan", "Punjab",
  "Uttar Pradesh", "Delhi", "Tamil Nadu", "Karnataka", "Other",
];

const INDUSTRIES = [
  "Garments & Textiles", "Packaging", "Furniture & Wood",
  "Auto Parts", "Pharma", "Construction Materials",
  "Food & Agro", "Jewellery", "Printing",
  "Other Manufacturing", "Other",
];

const BUSINESS_TYPES = [
  { id: "manufacturer", emoji: "🏭", name: "Manufacturer", desc: "Make products from raw materials" },
  { id: "trader", emoji: "🛒", name: "Trader", desc: "Buy & sell goods" },
  { id: "wholesaler", emoji: "📦", name: "Wholesaler", desc: "Bulk supply to resellers" },
  { id: "retailer", emoji: "🏪", name: "Retailer", desc: "Direct to customers" },
  { id: "job_worker", emoji: "🧵", name: "Job Worker", desc: "Work on client material" },
  { id: "service_provider", emoji: "📋", name: "Service Provider", desc: "Custom services" },
];

interface ModuleDef {
  id: string;
  name: string;
  desc: string;
  color: string;
  locked?: boolean;
}

const ALL_MODULES: ModuleDef[] = [
  { id: "production", name: "Production Management", desc: "Track your production orders and workflow stages", color: "#a78bfa" },
  { id: "inventory", name: "Inventory & Materials", desc: "Monitor raw material stock and get reorder alerts", color: "#34d399" },
  { id: "orders", name: "Orders Management", desc: "Manage client orders end to end", color: "#60a5fa" },
  { id: "billing", name: "Billing & Invoices", desc: "Create GST invoices instantly", color: "#fbbf24" },
  { id: "payments", name: "Payments Tracking", desc: "Track who paid and who hasn't", color: "#f87171" },
  { id: "clients", name: "Clients Management", desc: "Manage all your business clients", color: "#818cf8" },
];

const LOCKED_MODULES: ModuleDef[] = [
  { id: "dashboard", name: "Dashboard & Analytics", desc: "Always available", color: "#64748b", locked: true },
  { id: "ai_assistant", name: "AI Assistant", desc: "Your business intelligence", color: "#64748b", locked: true },
  { id: "staff_roles", name: "Staff & Roles", desc: "Team management", color: "#64748b", locked: true },
];

const STEP_LABELS = ["Company", "Business", "Modules", "Ready"];

// ─── Validation Helpers ──────────────────────────────────
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^[1-9][0-9]{9}$/;

// ─── Module Suggestion Logic ─────────────────────────────
function getSuggestedModules(selectedTypes: string[]): string[] {
  const modules = new Set<string>();

  const hasManufacturer = selectedTypes.includes("manufacturer");
  const hasJobWorker = selectedTypes.includes("job_worker");
  const hasTrader = selectedTypes.includes("trader");
  const hasWholesaler = selectedTypes.includes("wholesaler");
  const hasRetailer = selectedTypes.includes("retailer");
  const hasService = selectedTypes.includes("service_provider");

  if (hasManufacturer || hasJobWorker) {
    modules.add("production");
    modules.add("inventory");
    modules.add("orders");
  }

  if (hasTrader || hasWholesaler || hasRetailer) {
    modules.add("orders");
    modules.add("billing");
    modules.add("payments");
  }

  if (hasService) {
    modules.add("billing");
    modules.add("clients");
    modules.add("payments");
  }

  return Array.from(modules);
}

// ═══════════════════════════════════════════════════════════
// SETUP PAGE COMPONENT
// ═══════════════════════════════════════════════════════════
export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1=forward, -1=back
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Step 1 Form Data ──────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  // ─── Step 2 Data ───────────────────────────────────────
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // ─── Step 3 Data ───────────────────────────────────────
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [modulesInitialized, setModulesInitialized] = useState(false);

  // ─── Auth check — redirect if already complete ─────────
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        if (data.user.company_setup_complete === true) {
          router.replace("/dashboard");
        }
        // Pre-fill owner name from session
        if (data.user.fullName) {
          setOwnerName(data.user.fullName);
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // ─── Auto-select modules when entering Step 3 ─────────
  useEffect(() => {
    if (step === 2 && !modulesInitialized) {
      const suggested = getSuggestedModules(selectedTypes);
      setActiveModules(suggested);
      setModulesInitialized(true);
    }
  }, [step, selectedTypes, modulesInitialized]);

  // Reset modules initialization when going back to step 2 (business type)
  useEffect(() => {
    if (step < 2) {
      setModulesInitialized(false);
    }
  }, [step]);

  // ─── Validation ────────────────────────────────────────
  const validateStep0 = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!companyName.trim()) e.companyName = "Company name is required";
    if (!ownerName.trim()) e.ownerName = "Your name is required";
    if (!phone.trim()) {
      e.phone = "Phone number is required";
    } else if (!PHONE_REGEX.test(phone.replace(/\s/g, ""))) {
      e.phone = "Enter 10 digits (cannot start with 0)";
    }
    if (!city.trim()) e.city = "City is required";
    if (!state) e.state = "Please select a state";
    if (!industryType) e.industryType = "Please select an industry";
    if (gstNumber.trim() && !GST_REGEX.test(gstNumber.trim().toUpperCase())) {
      e.gstNumber = "Invalid GST format";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [companyName, ownerName, phone, city, state, industryType, gstNumber]);

  const validateStep1 = useCallback((): boolean => {
    if (selectedTypes.length === 0) {
      setErrors({ businessTypes: "Select at least one business type" });
      return false;
    }
    setErrors({});
    return true;
  }, [selectedTypes]);

  // ─── Navigation ────────────────────────────────────────
  const goNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setErrors({});
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  // ─── Toggle business type ─────────────────────────────
  const toggleBusinessType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
    setErrors({});
  };

  // ─── Toggle module ────────────────────────────────────
  const toggleModule = (id: string) => {
    setActiveModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // ─── Module visibility logic for Step 3 ────────────────
  const moduleDisplay = useMemo(() => {
    const suggested = getSuggestedModules(selectedTypes);
    const display: { module: ModuleDef; autoOn: boolean }[] = [];

    // Show all modules, marking which were auto-suggested
    ALL_MODULES.forEach((m) => {
      display.push({ module: m, autoOn: suggested.includes(m.id) });
    });

    return display;
  }, [selectedTypes]);

  // ─── Submit ────────────────────────────────────────────
  const handleFinish = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim(),
          owner_name: ownerName.trim(),
          phone: "+91" + phone.replace(/\s/g, ""),
          city: city.trim(),
          state,
          industry_type: industryType,
          gst_number: gstNumber.trim().toUpperCase() || undefined,
          business_types: selectedTypes,
          active_modules: activeModules,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Setup error:", data);
        setSaving(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      console.error("Setup failed:", err);
      setSaving(false);
    }
  };

  // ─── Computed summary values ──────────────────────────
  const businessTypeLabels = selectedTypes
    .map((id) => BUSINESS_TYPES.find((b) => b.id === id)?.name)
    .filter(Boolean)
    .join(" · ");

  // ─── Animation variants ────────────────────────────────
  const slideVariants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 20 : -20 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -20 : 20 }),
  };

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Top Bar ───────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Factory style={{ width: 16, height: 16, color: "#fff" }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>
            IND Manager
          </span>
          <span
            style={{
              fontSize: 11, fontWeight: 600, color: "rgba(167,139,250,0.7)",
              textTransform: "uppercase", letterSpacing: 1,
              marginLeft: 8, padding: "2px 8px",
              background: "rgba(167,139,250,0.1)",
              borderRadius: 6,
            }}
          >
            Setup
          </span>
        </div>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
          Step {step + 1} of 4
        </span>
      </header>

      {/* ── Progress Bar ──────────────────────────────── */}
      <div style={{ padding: "28px 24px 0", maxWidth: 560, width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          {/* Connecting line (background) */}
          <div
            style={{
              position: "absolute", top: 12, left: 12, right: 12, height: 2,
              background: "rgba(255,255,255,0.08)", borderRadius: 1,
            }}
          />
          {/* Active line */}
          <div
            style={{
              position: "absolute", top: 12, left: 12, height: 2,
              width: `calc(${(step / 3) * 100}% - ${step === 3 ? 12 : 0}px)`,
              background: "linear-gradient(90deg, #a78bfa, #7c3aed)",
              borderRadius: 1, transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          {STEP_LABELS.map((label, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 1 }}>
              <div
                style={{
                  width: 24, height: 24, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                  transition: "all 0.3s ease",
                  ...(i < step
                    ? {
                        background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                        color: "#fff",
                        boxShadow: "0 0 12px rgba(167,139,250,0.4)",
                      }
                    : i === step
                    ? {
                        background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                        color: "#fff",
                        boxShadow: "0 0 16px rgba(167,139,250,0.5), 0 0 0 4px rgba(167,139,250,0.15)",
                      }
                    : {
                        background: "transparent",
                        border: "2px solid rgba(255,255,255,0.15)",
                        color: "rgba(255,255,255,0.3)",
                      }),
                }}
              >
                {i < step ? <Check style={{ width: 12, height: 12 }} /> : i + 1}
              </div>
              <span
                className="setup-step-label"
                style={{
                  fontSize: 11, fontWeight: 600,
                  color: i <= step ? "rgba(167,139,250,0.85)" : "rgba(255,255,255,0.25)",
                  transition: "color 0.3s ease",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Card ─────────────────────────────────── */}
      <div
        style={{
          flex: 1, display: "flex", alignItems: "flex-start",
          justifyContent: "center", padding: "28px 16px 40px",
        }}
      >
        <div
          style={{
            width: "100%", maxWidth: 560,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: "40px",
            position: "relative",
            overflow: "hidden",
            minHeight: 400,
          }}
          className="setup-card"
        >
          <AnimatePresence mode="wait" custom={direction}>
            {/* ════════════ STEP 1 — Company Info ════════════ */}
            {step === 0 && (
              <motion.div
                key="step0"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
                  Tell us about your business
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 28 }}>
                  This helps us personalize IND Manager for you
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Company Name */}
                  <InputField
                    label="COMPANY NAME"
                    value={companyName}
                    onChange={setCompanyName}
                    placeholder="Rajesh Textiles Pvt Ltd"
                    error={errors.companyName}
                    required
                  />

                  {/* Owner Name */}
                  <InputField
                    label="OWNER / YOUR NAME"
                    value={ownerName}
                    onChange={setOwnerName}
                    placeholder="Rajesh Kumar"
                    error={errors.ownerName}
                    required
                  />

                  {/* Phone */}
                  <div>
                    <label style={labelStyle}>
                      PHONE NUMBER <span style={{ color: "#a78bfa" }}>*</span>
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div
                        style={{
                          ...inputBaseStyle,
                          width: 60, flexShrink: 0,
                          textAlign: "center",
                          color: "rgba(255,255,255,0.5)",
                          cursor: "default",
                        }}
                      >
                        +91
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10));
                          setErrors((prev) => ({ ...prev, phone: "" }));
                        }}
                        placeholder="98765 43210"
                        maxLength={10}
                        style={{
                          ...inputBaseStyle,
                          flex: 1,
                          ...(errors.phone ? errorBorderStyle : {}),
                        }}
                        onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                        onBlur={(e) => Object.assign(e.target.style, { borderColor: errors.phone ? "#f87171" : "rgba(255,255,255,0.08)", boxShadow: "none" })}
                      />
                    </div>
                    {errors.phone && <span style={errorTextStyle}>{errors.phone}</span>}
                  </div>

                  {/* City & State row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <InputField
                      label="CITY"
                      value={city}
                      onChange={setCity}
                      placeholder="Surat"
                      error={errors.city}
                      required
                    />
                    <SelectField
                      label="STATE"
                      value={state}
                      onChange={setState}
                      options={STATES}
                      placeholder="Select state..."
                      error={errors.state}
                      required
                    />
                  </div>

                  {/* Industry Type */}
                  <SelectField
                    label="INDUSTRY TYPE"
                    value={industryType}
                    onChange={setIndustryType}
                    options={INDUSTRIES}
                    placeholder="Select industry..."
                    error={errors.industryType}
                    required
                  />

                  {/* GST Number */}
                  <div>
                    <InputField
                      label="GST NUMBER"
                      value={gstNumber}
                      onChange={(v) => setGstNumber(v.toUpperCase())}
                      placeholder="27AADCB2230M1ZT"
                      error={errors.gstNumber}
                      mono
                    />
                    {!gstNumber && (
                      <button
                        onClick={goNext}
                        style={{
                          fontSize: 12, color: "rgba(167,139,250,0.6)",
                          background: "none", border: "none", cursor: "pointer",
                          marginTop: 4, padding: 0,
                        }}
                      >
                        Skip for now →
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════════ STEP 2 — Business Type ════════════ */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
                  What type of business do you run?
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
                  Select all that apply
                </p>

                {errors.businessTypes && (
                  <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>
                    {errors.businessTypes}
                  </div>
                )}

                <div
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
                  className="setup-business-grid"
                >
                  {BUSINESS_TYPES.map((bt) => {
                    const selected = selectedTypes.includes(bt.id);
                    return (
                      <motion.button
                        key={bt.id}
                        onClick={() => toggleBusinessType(bt.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          position: "relative",
                          display: "flex", flexDirection: "column",
                          alignItems: "flex-start", gap: 8,
                          padding: 20,
                          background: selected
                            ? "rgba(167,139,250,0.08)"
                            : "rgba(255,255,255,0.02)",
                          border: selected
                            ? "1.5px solid rgba(167,139,250,0.5)"
                            : "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 16,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s ease",
                          boxShadow: selected
                            ? "0 0 20px rgba(167,139,250,0.12)"
                            : "none",
                        }}
                        className="setup-btype-card"
                      >
                        {/* Checkmark */}
                        {selected && (
                          <div
                            style={{
                              position: "absolute", top: 10, right: 10,
                              width: 20, height: 20, borderRadius: "50%",
                              background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Check style={{ width: 12, height: 12, color: "#fff" }} />
                          </div>
                        )}
                        <span style={{ fontSize: 28 }} className="setup-btype-emoji">{bt.emoji}</span>
                        <span
                          style={{
                            fontSize: 14, fontWeight: 700,
                            color: selected ? "#e2d6ff" : "#f1f5f9",
                          }}
                          className="setup-btype-name"
                        >
                          {bt.name}
                        </span>
                        <span
                          style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}
                          className="setup-btype-desc"
                        >
                          {bt.desc}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ════════════ STEP 3 — Module Suggestions ════════════ */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
                  Here&apos;s what we recommend for you
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
                  Based on your business type — customize anytime in settings
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Toggleable modules */}
                  {moduleDisplay.map(({ module: m, autoOn }) => {
                    const isOn = activeModules.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleModule(m.id)}
                        style={{
                          display: "flex", alignItems: "center",
                          gap: 14, padding: "14px 16px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 14, cursor: "pointer",
                          borderLeft: isOn ? "3px solid rgba(167,139,250,0.6)" : "3px solid transparent",
                          transition: "all 0.2s ease",
                          textAlign: "left", width: "100%",
                        }}
                      >
                        {/* Color dot */}
                        <div
                          style={{
                            width: 10, height: 10, borderRadius: "50%",
                            background: m.color, flexShrink: 0, opacity: isOn ? 1 : 0.3,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                            {m.desc}
                          </div>
                        </div>
                        {/* Toggle */}
                        <div
                          style={{
                            width: 42, height: 24, borderRadius: 12,
                            background: isOn
                              ? "linear-gradient(135deg, #a78bfa, #7c3aed)"
                              : "rgba(255,255,255,0.1)",
                            flexShrink: 0, position: "relative",
                            transition: "background 0.2s ease",
                          }}
                        >
                          <div
                            style={{
                              width: 18, height: 18, borderRadius: "50%",
                              background: "var(--background)", position: "absolute",
                              top: 3,
                              left: isOn ? 21 : 3,
                              transition: "left 0.2s ease",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}

                  {/* Locked modules */}
                  {LOCKED_MODULES.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex", alignItems: "center",
                        gap: 14, padding: "14px 16px",
                        background: "rgba(255,255,255,0.015)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: 14, opacity: 0.6,
                        borderLeft: "3px solid rgba(100,116,139,0.3)",
                      }}
                    >
                      <Lock style={{ width: 14, height: 14, color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                          Always included
                        </div>
                      </div>
                      {/* Disabled toggle */}
                      <div
                        style={{
                          width: 42, height: 24, borderRadius: 12,
                          background: "rgba(255,255,255,0.06)", flexShrink: 0,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: 18, height: 18, borderRadius: "50%",
                            background: "rgba(255,255,255,0.2)", position: "absolute",
                            top: 3, left: 21,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Callout */}
                <div
                  style={{
                    marginTop: 20, padding: "14px 16px",
                    background: "rgba(167,139,250,0.06)",
                    border: "1px solid rgba(167,139,250,0.12)",
                    borderRadius: 12,
                    display: "flex", alignItems: "flex-start", gap: 10,
                  }}
                >
                  <span style={{ fontSize: 16 }}>💡</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                    Don&apos;t worry — you can enable or disable any module anytime from Settings → Modules
                  </span>
                </div>
              </motion.div>
            )}

            {/* ════════════ STEP 4 — All Set! ════════════ */}
            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
                    {companyName || "Your company"} is ready!
                  </h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    Your workspace has been configured
                  </p>
                </div>

                {/* Summary Card */}
                <div
                  style={{
                    padding: "20px",
                    background: "rgba(167,139,250,0.06)",
                    border: "1px solid rgba(167,139,250,0.15)",
                    borderRadius: 16, marginBottom: 24,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>
                    {selectedTypes.some((t) => ["manufacturer", "job_worker"].includes(t)) ? "🏭 " : "🏢 "}
                    {companyName}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                    {businessTypeLabels} · {state}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(167,139,250,0.7)", marginTop: 4, fontWeight: 600 }}>
                    {activeModules.length} modules activated
                  </div>
                </div>

                {/* What's next cards */}
                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                  What&apos;s next
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 28 }} className="setup-whatsnext-grid">
                  {[
                    { emoji: "➕", title: "Add your first client", sub: "→ Clients", href: "/dashboard/clients" },
                    { emoji: "📦", title: "Add first material", sub: "→ Inventory", href: "/dashboard/inventory" },
                    { emoji: "🤖", title: "Try AI Assistant", sub: "→ Assistant", href: "/dashboard/assistant" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      style={{
                        padding: "16px 12px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 14, textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{item.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.3, marginBottom: 4 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(167,139,250,0.6)" }}>
                        {item.sub}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleFinish}
                  disabled={saving}
                  style={{
                    width: "100%", height: 56, borderRadius: 16,
                    background: saving
                      ? "rgba(167,139,250,0.3)"
                      : "linear-gradient(135deg, #a78bfa, #7c3aed)",
                    border: "none", color: "#fff",
                    fontWeight: 800, fontSize: 16,
                    cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: "0 8px 32px rgba(167,139,250,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontFamily: "'Open Sans', sans-serif",
                  }}
                >
                  {saving ? (
                    <>
                      <div
                        style={{
                          width: 18, height: 18, borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.2)",
                          borderTopColor: "#fff",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                      <ArrowRight style={{ width: 18, height: 18 }} />
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom Navigation (Steps 0-2 only) ────────── */}
      {step < 3 && (
        <div
          style={{
            maxWidth: 560, width: "100%", margin: "0 auto",
            padding: "0 16px 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          {step > 0 ? (
            <button
              onClick={goBack}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "12px 24px", borderRadius: 12,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                fontFamily: "'Open Sans', sans-serif",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                e.currentTarget.style.color = "rgba(255,255,255,0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
              }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              Back
            </button>
          ) : (
            <div />
          )}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={goNext}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "12px 24px", borderRadius: 12,
              background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
              border: "none", color: "#fff",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(167,139,250,0.3)",
              fontFamily: "'Open Sans', sans-serif",
            }}
          >
            Continue
            <ChevronRight style={{ width: 16, height: 16 }} />
          </motion.button>
        </div>
      )}

      {/* ── Responsive + animation CSS ────────────────── */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 400px) {
          .setup-step-label {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .setup-card {
            padding: 24px !important;
          }
          .setup-btype-card {
            padding: 16px !important;
          }
          .setup-btype-emoji {
            font-size: 28px !important;
          }
          .setup-btype-name {
            font-size: 13px !important;
          }
          .setup-btype-desc {
            font-size: 11px !important;
          }
          .setup-whatsnext-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Reusable Styled Components
// ═══════════════════════════════════════════════════════════

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11, fontWeight: 600,
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
};

const inputBaseStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  color: "#f1f5f9",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  fontFamily: "'Open Sans', sans-serif",
};

const focusStyle = {
  borderColor: "rgba(167,139,250,0.5)",
  boxShadow: "0 0 0 3px rgba(167,139,250,0.1)",
};

const errorBorderStyle: React.CSSProperties = {
  borderColor: "#f87171",
};

const errorTextStyle: React.CSSProperties = {
  fontSize: 11, color: "#f87171", marginTop: 4, display: "block",
};

function InputField({
  label, value, onChange, placeholder, error, required, mono,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string; required?: boolean; mono?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: "#a78bfa" }}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...inputBaseStyle,
          ...(mono ? { fontFamily: "var(--font-dm-mono), monospace" } : {}),
          ...(error ? errorBorderStyle : {}),
        }}
        onFocus={(e) => Object.assign(e.target.style, focusStyle)}
        onBlur={(e) =>
          Object.assign(e.target.style, {
            borderColor: error ? "#f87171" : "rgba(255,255,255,0.08)",
            boxShadow: "none",
          })
        }
      />
      {error && <span style={errorTextStyle}>{error}</span>}
    </div>
  );
}

function SelectField({
  label, value, onChange, options, placeholder, error, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; error?: string; required?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: "#a78bfa" }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputBaseStyle,
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 16px center",
          paddingRight: 40,
          ...(error ? errorBorderStyle : {}),
          ...(!value ? { color: "rgba(255,255,255,0.3)" } : {}),
        }}
        onFocus={(e) => Object.assign(e.target.style, focusStyle)}
        onBlur={(e) =>
          Object.assign(e.target.style, {
            borderColor: error ? "#f87171" : "rgba(255,255,255,0.08)",
            boxShadow: "none",
          })
        }
      >
        <option value="" style={{ background: "#0f1729", color: "rgba(255,255,255,0.3)" }}>
          {placeholder || "Select..."}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} style={{ background: "#0f1729", color: "#f1f5f9" }}>
            {opt}
          </option>
        ))}
      </select>
      {error && <span style={errorTextStyle}>{error}</span>}
    </div>
  );
}
