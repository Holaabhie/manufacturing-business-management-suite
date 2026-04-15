import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

// ─── Validation Constants ───────────────────────────────
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^\+91[1-9][0-9]{9}$/;

const VALID_STATES = [
  "Maharashtra", "Gujarat", "Rajasthan", "Punjab",
  "Uttar Pradesh", "Delhi", "Tamil Nadu", "Karnataka", "Other",
];

const VALID_INDUSTRIES = [
  "Garments & Textiles", "Packaging", "Furniture & Wood",
  "Auto Parts", "Pharma", "Construction Materials",
  "Food & Agro", "Jewellery", "Printing",
  "Other Manufacturing", "Other",
];

const VALID_BUSINESS_TYPES = [
  "manufacturer", "trader", "wholesaler",
  "retailer", "job_worker", "service_provider",
];

const VALID_MODULES = [
  "production", "inventory", "orders",
  "billing", "payments", "clients",
];

export async function POST(req: Request) {
  try {
    // ─── Auth Check ──────────────────────────────────────
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── Role Check — admin only ─────────────────────────
    if (user.role !== "Admin") {
      return NextResponse.json(
        { error: "Only admin users can complete company setup" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // ─── Extract & Validate Fields ───────────────────────
    const {
      company_name,
      owner_name,
      phone,
      city,
      state,
      industry_type,
      gst_number,
      business_types,
      active_modules,
    } = body;

    const errors: Record<string, string> = {};

    // Required string fields
    if (!company_name || typeof company_name !== "string" || !company_name.trim()) {
      errors.company_name = "Company name is required";
    }
    if (!owner_name || typeof owner_name !== "string" || !owner_name.trim()) {
      errors.owner_name = "Owner name is required";
    }
    if (!city || typeof city !== "string" || !city.trim()) {
      errors.city = "City is required";
    }

    // State validation
    if (!state || !VALID_STATES.includes(state)) {
      errors.state = "Please select a valid state";
    }

    // Industry validation
    if (!industry_type || !VALID_INDUSTRIES.includes(industry_type)) {
      errors.industry_type = "Please select a valid industry";
    }

    // Phone validation: +91 followed by 10 digits, first digit not 0
    if (!phone || typeof phone !== "string") {
      errors.phone = "Phone number is required";
    } else if (!PHONE_REGEX.test(phone.replace(/\s/g, ""))) {
      errors.phone = "Phone must be +91 followed by 10 digits (cannot start with 0)";
    }

    // GST validation (optional, but must be valid format if provided)
    if (gst_number && typeof gst_number === "string" && gst_number.trim()) {
      if (!GST_REGEX.test(gst_number.trim().toUpperCase())) {
        errors.gst_number = "Invalid GST format";
      }
    }

    // Business types validation
    if (!Array.isArray(business_types) || business_types.length === 0) {
      errors.business_types = "Select at least one business type";
    } else {
      const invalidTypes = business_types.filter(
        (t: string) => !VALID_BUSINESS_TYPES.includes(t)
      );
      if (invalidTypes.length > 0) {
        errors.business_types = `Invalid business types: ${invalidTypes.join(", ")}`;
      }
    }

    // Active modules validation
    if (!Array.isArray(active_modules)) {
      errors.active_modules = "Modules must be an array";
    } else {
      const invalidModules = active_modules.filter(
        (m: string) => !VALID_MODULES.includes(m)
      );
      if (invalidModules.length > 0) {
        errors.active_modules = `Invalid modules: ${invalidModules.join(", ")}`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    // ─── Save to Database ────────────────────────────────
    const db = await getDb();
    const userId = String(user._id);
    const now = new Date();

    // Upsert company profile (using userId as organizationId for single-user orgs)
    const orgId = user.organizationId || userId;

    await db.collection("companyprofiles").updateOne(
      { organizationId: orgId },
      {
        $set: {
          company_name: company_name.trim(),
          trade_name: company_name.trim(),
          primary_phone: phone.replace(/\s/g, ""),
          reg_city: city.trim(),
          reg_state: state,
          industry_type,
          gst_number: gst_number?.trim().toUpperCase() || undefined,
          business_type: business_types[0] || "Manufacturer",
          business_types: business_types,
          active_modules: active_modules,
          is_onboarding_complete: true,
          onboarding_step: 4,
          completed_by_user_id: userId,
          updatedAt: now,
        },
        $setOnInsert: {
          organizationId: orgId,
          default_currency: "INR",
          financial_year_start: "April",
          tax_regime: "Regular",
          default_tax_rate: 18.0,
          tds_applicable: false,
          tcs_applicable: false,
          reverse_charge_liable: false,
          brand_primary_color: "#2563EB",
          brand_secondary_color: "#1E40AF",
          brand_accent_color: "#F59E0B",
          invoice_prefix: "INV-",
          order_prefix: "ORD-",
          purchase_prefix: "PO-",
          quotation_prefix: "QTN-",
          default_payment_terms: 30,
          reg_country: "India",
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // Update user profile — mark setup complete + save owner name
    await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          company_setup_complete: true,
          fullName: owner_name.trim(),
          phone: phone.replace(/\s/g, ""),
          organizationId: orgId,
          updatedAt: now,
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[setup] Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Setup failed" },
      { status: 500 }
    );
  }
}
