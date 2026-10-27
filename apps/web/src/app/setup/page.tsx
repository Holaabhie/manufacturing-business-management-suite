"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Lock,
  ArrowRight,
  Building2,
  User,
  Phone,
  MapPin,
  Factory,
  FileText,
  ShoppingCart,
  Package,
  Store,
  Scissors,
  Briefcase,
  Workflow,
  Boxes,
  Receipt,
  Wallet,
  Users,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────
const STATES = [
  "Maharashtra",
  "Gujarat",
  "Rajasthan",
  "Punjab",
  "Uttar Pradesh",
  "Delhi",
  "Tamil Nadu",
  "Karnataka",
  "Other",
];

const INDUSTRIES = [
  "Garments & Textiles",
  "Packaging",
  "Furniture & Wood",
  "Auto Parts",
  "Pharma",
  "Construction Materials",
  "Food & Agro",
  "Jewellery",
  "Printing",
  "Other Manufacturing",
  "Other",
];

const BUSINESS_TYPES = [
  {
    id: "manufacturer",
    icon: Factory,
    name: "Manufacturer",
    desc: "Make products from raw materials",
  },
  {
    id: "trader",
    icon: ShoppingCart,
    name: "Trader",
    desc: "Buy & sell goods",
  },
  {
    id: "wholesaler",
    icon: Package,
    name: "Wholesaler",
    desc: "Bulk supply to resellers",
  },
  {
    id: "retailer",
    icon: Store,
    name: "Retailer",
    desc: "Direct to customers",
  },
  {
    id: "job_worker",
    icon: Scissors,
    name: "Job Worker",
    desc: "Work on client material",
  },
  {
    id: "service_provider",
    icon: Briefcase,
    name: "Service Provider",
    desc: "Custom services",
  },
];

interface ModuleDef {
  id: string;
  name: string;
  desc: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  locked?: boolean;
}

const ALL_MODULES: ModuleDef[] = [
  {
    id: "production",
    name: "Production Management",
    desc: "Track your production orders and workflow stages",
    color: "#3B82F6",
    icon: Workflow,
  },
  {
    id: "inventory",
    name: "Inventory & Materials",
    desc: "Monitor raw material stock and get reorder alerts",
    color: "#10B981",
    icon: Boxes,
  },
  {
    id: "orders",
    name: "Orders Management",
    desc: "Manage client orders end to end",
    color: "#06B6D4",
    icon: FileText,
  },
  {
    id: "billing",
    name: "Billing & Invoices",
    desc: "Create GST invoices instantly",
    color: "#F59E0B",
    icon: Receipt,
  },
  {
    id: "payments",
    name: "Payments Tracking",
    desc: "Track who paid and who hasn't",
    color: "#14B8A6",
    icon: Wallet,
  },
  {
    id: "clients",
    name: "Clients Management",
    desc: "Manage all your business clients",
    color: "#64748B",
    icon: Users,
  },
];

const LOCKED_MODULES: ModuleDef[] = [
  {
    id: "dashboard",
    name: "Dashboard & Analytics",
    desc: "Always available",
    color: "#64748B",
    icon: BarChart3,
    locked: true,
  },
  {
    id: "ai_assistant",
    name: "AI Assistant",
    desc: "Your business intelligence",
    color: "#64748B",
    icon: Sparkles,
    locked: true,
  },
  {
    id: "staff_roles",
    name: "Staff & Roles",
    desc: "Team management",
    color: "#64748B",
    icon: ShieldCheck,
    locked: true,
  },
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

  // ─── Animation variants (150-200ms ease only, no springs) ───
  const slideVariants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 12 : -12 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -12 : 12 }),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Top Bar ───────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <BrandLogo
            variant="full"
            width={120}
            height={30}
            className="h-[26px] w-auto object-contain"
            priority
          />
          <Badge
            variant="default"
            className="bg-primary/10 text-primary hover:bg-primary/15 border-primary/20 text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full"
          >
            Setup
          </Badge>
        </div>
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
          Step {step + 1} of 4
        </span>
      </header>

      {/* ── Stepper ───────────────────────────────────── */}
      <div className="w-full max-w-[640px] mx-auto px-4 pt-6 pb-2">
        <div className="relative flex items-center justify-between">
          {/* Connecting line (background) */}
          <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-muted rounded-full" />
          {/* Active line */}
          <div
            className="absolute top-3.5 left-4 h-0.5 bg-primary rounded-full transition-all duration-300 ease-out"
            style={{
              width: `calc(${(step / 3) * 100}% - ${step === 3 ? 16 : 0}px)`,
            }}
          />

          {STEP_LABELS.map((label, i) => {
            const isCompleted = i < step;
            const isActive = i === step;
            return (
              <div
                key={label}
                className="relative z-10 flex flex-col items-center gap-1.5"
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200",
                    isCompleted &&
                      "bg-primary text-primary-foreground shadow-sm shadow-primary/30",
                    isActive &&
                      "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-md shadow-primary/25",
                    !isCompleted &&
                      !isActive &&
                      "bg-card border border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold tracking-wide transition-colors duration-200",
                    isActive
                      ? "text-primary font-bold"
                      : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground/70"
                  )}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Card ─────────────────────────────────── */}
      <main className="flex-1 flex items-start justify-center px-4 py-6 sm:py-8">
        <Card className="w-full max-w-[640px] p-6 sm:p-8 rounded-2xl border-border bg-card shadow-sm">
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
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Tell us about your business
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    This helps us personalize IND Manager for your workspace
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="companyName"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Company Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          setErrors((prev) => ({ ...prev, companyName: "" }));
                        }}
                        placeholder="Rajesh Textiles Pvt Ltd"
                        className={cn(
                          "pl-9 h-11 bg-background",
                          errors.companyName &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                    </div>
                    {errors.companyName && (
                      <p className="text-xs text-destructive">{errors.companyName}</p>
                    )}
                  </div>

                  {/* Owner Name */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="ownerName"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Owner / Your Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="ownerName"
                        value={ownerName}
                        onChange={(e) => {
                          setOwnerName(e.target.value);
                          setErrors((prev) => ({ ...prev, ownerName: "" }));
                        }}
                        placeholder="Rajesh Kumar"
                        className={cn(
                          "pl-9 h-11 bg-background",
                          errors.ownerName &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                    </div>
                    {errors.ownerName && (
                      <p className="text-xs text-destructive">{errors.ownerName}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="phone"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <div
                      className={cn(
                        "flex rounded-md border border-input bg-background shadow-xs transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/40 overflow-hidden h-11",
                        errors.phone &&
                          "border-destructive focus-within:border-destructive focus-within:ring-destructive"
                      )}
                    >
                      <div className="px-3 bg-muted/60 text-muted-foreground text-xs font-semibold flex items-center justify-center border-r border-input shrink-0 select-none">
                        +91
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10));
                            setErrors((prev) => ({ ...prev, phone: "" }));
                          }}
                          placeholder="98765 43210"
                          maxLength={10}
                          className="pl-9 border-0 shadow-none focus-visible:ring-0 h-full rounded-none"
                        />
                      </div>
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone}</p>
                    )}
                  </div>

                  {/* GST Number */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="gstNumber"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        GST Number
                      </Label>
                      {!gstNumber && (
                        <button
                          type="button"
                          onClick={goNext}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Skip for now →
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="gstNumber"
                        value={gstNumber}
                        onChange={(e) => {
                          setGstNumber(e.target.value.toUpperCase());
                          setErrors((prev) => ({ ...prev, gstNumber: "" }));
                        }}
                        placeholder="27AADCB2230M1ZT"
                        className={cn(
                          "pl-9 h-11 bg-background font-mono uppercase",
                          errors.gstNumber &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                    </div>
                    {errors.gstNumber && (
                      <p className="text-xs text-destructive">{errors.gstNumber}</p>
                    )}
                  </div>

                  {/* City */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="city"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      City <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setErrors((prev) => ({ ...prev, city: "" }));
                        }}
                        placeholder="Surat"
                        className={cn(
                          "pl-9 h-11 bg-background",
                          errors.city &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                    </div>
                    {errors.city && (
                      <p className="text-xs text-destructive">{errors.city}</p>
                    )}
                  </div>

                  {/* State */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="state"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      State <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={state}
                      onValueChange={(val) => {
                        setState(val);
                        setErrors((prev) => ({ ...prev, state: "" }));
                      }}
                    >
                      <SelectTrigger
                        id="state"
                        className={cn(
                          "w-full h-11 bg-background",
                          errors.state &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                      >
                        <SelectValue placeholder="Select state..." />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && (
                      <p className="text-xs text-destructive">{errors.state}</p>
                    )}
                  </div>

                  {/* Industry Type (full width) */}
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <Label
                      htmlFor="industryType"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Industry Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={industryType}
                      onValueChange={(val) => {
                        setIndustryType(val);
                        setErrors((prev) => ({ ...prev, industryType: "" }));
                      }}
                    >
                      <SelectTrigger
                        id="industryType"
                        className={cn(
                          "w-full h-11 bg-background",
                          errors.industryType &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Factory className="w-4 h-4 text-muted-foreground" />
                          <SelectValue placeholder="Select industry..." />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>
                            {ind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.industryType && (
                      <p className="text-xs text-destructive">
                        {errors.industryType}
                      </p>
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
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    What type of business do you run?
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Select all that apply to tailor your operations
                  </p>
                </div>

                {errors.businessTypes && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    {errors.businessTypes}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {BUSINESS_TYPES.map((bt) => {
                    const selected = selectedTypes.includes(bt.id);
                    const Icon = bt.icon;
                    return (
                      <button
                        key={bt.id}
                        type="button"
                        onClick={() => toggleBusinessType(bt.id)}
                        className={cn(
                          "relative flex flex-col items-start gap-2.5 p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer",
                          "hover:-translate-y-0.5",
                          selected
                            ? "border-primary bg-primary/5 shadow-xs shadow-primary/10"
                            : "border-border bg-card/60 hover:border-primary/40"
                        )}
                      >
                        {selected && (
                          <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {bt.name}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                            {bt.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ════════════ STEP 3 — Module Recommendations ════════════ */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Here&apos;s what we recommend for you
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Based on your business type — customize anytime in settings
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Toggleable Modules */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {moduleDisplay.map(({ module: m }) => {
                      const isOn = activeModules.includes(m.id);
                      const Icon = m.icon;
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleModule(m.id)}
                          className={cn(
                            "flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer select-none",
                            isOn
                              ? "border-primary/30 bg-primary/5"
                              : "border-border bg-card/60 hover:border-border/80"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: `${m.color}15`,
                                color: m.color,
                              }}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">
                                {m.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {m.desc}
                              </div>
                            </div>
                          </div>
                          <Switch
                            checked={isOn}
                            onCheckedChange={() => toggleModule(m.id)}
                            className="shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Always Included */}
                  <div className="pt-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Always Included
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {LOCKED_MODULES.map((m) => {
                        const Icon = m.icon;
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border/60 bg-muted/20 opacity-75"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-foreground truncate">
                                  {m.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {m.desc}
                                </div>
                              </div>
                            </div>
                            <Switch checked disabled className="shrink-0 scale-90" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Blue Info Box Callout */}
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Don&apos;t worry — you can enable or disable any module anytime
                      from{" "}
                      <span className="text-foreground font-medium">
                        Settings → Modules
                      </span>
                      .
                    </p>
                  </div>
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
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-6"
              >
                {/* 64px blue circle with check */}
                <div className="text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary shadow-[0_0_24px_rgba(59,130,246,0.35)] mb-3">
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <Check className="w-8 h-8 stroke-[2.5]" />
                    </motion.div>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {companyName || "Your company"} is ready!
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Your workspace has been configured and is ready for production
                  </p>
                </div>

                {/* Summary Card */}
                <Card className="p-4 sm:p-5 border-border bg-card/80">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold text-foreground truncate">
                        {companyName || "Your Company"}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {selectedTypes.map((tid) => {
                          const bName = BUSINESS_TYPES.find((b) => b.id === tid)?.name;
                          return (
                            <Badge
                              key={tid}
                              variant="secondary"
                              className="text-[11px] font-medium py-0 px-2 bg-muted text-muted-foreground"
                            >
                              {bName}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Stat row with dividers */}
                  <div className="grid grid-cols-3 divide-x divide-border pt-3 mt-4 border-t border-border text-center">
                    <div className="px-2">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        State
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-foreground mt-0.5 truncate">
                        {state || "India"}
                      </div>
                    </div>
                    <div className="px-2">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        Modules
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-primary mt-0.5 truncate">
                        {activeModules.length} Active
                      </div>
                    </div>
                    <div className="px-2">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        Plan
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-foreground mt-0.5 truncate">
                        Starter
                      </div>
                    </div>
                  </div>
                </Card>

                {/* What's next */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                    What&apos;s next
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        icon: Users,
                        title: "Add first client",
                        desc: "Clients directory",
                        href: "/dashboard/clients",
                      },
                      {
                        icon: Package,
                        title: "Add first material",
                        desc: "Inventory tracking",
                        href: "/dashboard/inventory",
                      },
                      {
                        icon: Sparkles,
                        title: "Try AI Assistant",
                        desc: "Automated insights",
                        href: "/dashboard/assistant",
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.title}
                          onClick={() => router.push(item.href)}
                          className="group flex flex-col justify-between p-3.5 rounded-xl border border-border bg-card/60 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Go to Dashboard CTA */}
                <Button
                  size="lg"
                  onClick={handleFinish}
                  disabled={saving}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-base"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                      <span>Setting up...</span>
                    </>
                  ) : (
                    <>
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </main>

      {/* ── Bottom Navigation (Steps 0-2 only) ────────── */}
      {step < 3 && (
        <div className="w-full max-w-[640px] mx-auto px-4 py-4 flex items-center justify-between sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border sm:border-0 sm:bg-transparent sm:static z-10">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              className="rounded-xl px-5 h-10 gap-1.5 font-medium border-border hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button
            type="button"
            onClick={goNext}
            className="rounded-xl px-6 h-10 gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
