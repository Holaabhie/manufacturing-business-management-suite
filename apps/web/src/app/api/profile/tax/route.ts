import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const VALID_GST_RATES = [0, 5, 12, 18, 28];
const VALID_REGIMES = ["Regular", "Composition", "Unregistered"];

// GET - Fetch tax and compliance settings
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const orgId = (user as any).organizationId || String(user._id);

    const profile = await db.collection("companyprofiles").findOne({ organizationId: orgId });
    const userDoc = await db.collection("users").findOne({ _id: user._id as any });

    const taxSettings = {
      gstin: profile?.gst_number || userDoc?.company_details?.gstin || "",
      pan: profile?.pan_number || profile?.pan || userDoc?.company_details?.pan || "",
      default_tax_rate: typeof profile?.default_tax_rate === "number" ? profile.default_tax_rate : 18,
      default_hsn_code: profile?.default_hsn_code || "",
      show_tax_breakdown: profile?.show_tax_breakdown !== undefined ? Boolean(profile.show_tax_breakdown) : true,
      tax_regime: profile?.tax_regime || "Regular",
      tds_applicable: Boolean(profile?.tds_applicable),
      tcs_applicable: Boolean(profile?.tcs_applicable),
      reverse_charge_liable: Boolean(profile?.reverse_charge_liable),
    };

    return NextResponse.json({ tax: taxSettings });
  } catch (error: any) {
    console.error("Error fetching tax settings:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch tax settings" }, { status: 500 });
  }
}

// PATCH - Update tax and compliance settings
export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const cleanGstin = body.gstin ? String(body.gstin).trim().toUpperCase() : "";
    const cleanPan = body.pan ? String(body.pan).trim().toUpperCase() : "";

    // Validation
    if (cleanGstin && !GSTIN_REGEX.test(cleanGstin)) {
      return NextResponse.json({ error: "Invalid GSTIN format (e.g. 27AABCU9603R1ZM)" }, { status: 400 });
    }

    if (cleanPan && !PAN_REGEX.test(cleanPan)) {
      return NextResponse.json({ error: "Invalid PAN format (e.g. AABCU9603R)" }, { status: 400 });
    }

    const defaultTaxRate = typeof body.default_tax_rate === "number" ? body.default_tax_rate : Number(body.default_tax_rate ?? 18);
    if (!VALID_GST_RATES.includes(defaultTaxRate)) {
      return NextResponse.json({ error: "Invalid default GST rate. Supported values: 0, 5, 12, 18, 28" }, { status: 400 });
    }

    const taxRegime = body.tax_regime && VALID_REGIMES.includes(body.tax_regime) ? body.tax_regime : "Regular";
    const defaultHsnCode = body.default_hsn_code ? String(body.default_hsn_code).trim() : "";
    const showTaxBreakdown = body.show_tax_breakdown !== undefined ? Boolean(body.show_tax_breakdown) : true;
    const tdsApplicable = Boolean(body.tds_applicable);
    const tcsApplicable = Boolean(body.tcs_applicable);
    const reverseChargeLiable = Boolean(body.reverse_charge_liable);

    const db = await getDb();
    const orgId = (user as any).organizationId || String(user._id);
    const now = new Date();

    const updateFields = {
      gst_number: cleanGstin,
      pan_number: cleanPan,
      pan: cleanPan,
      default_tax_rate: defaultTaxRate,
      default_hsn_code: defaultHsnCode,
      show_tax_breakdown: showTaxBreakdown,
      tax_regime: taxRegime,
      tds_applicable: tdsApplicable,
      tcs_applicable: tcsApplicable,
      reverse_charge_liable: reverseChargeLiable,
      updatedAt: now,
    };

    await db.collection("companyprofiles").updateOne(
      { organizationId: orgId },
      { $set: updateFields },
      { upsert: true }
    );

    // Keep legacy users.company_details in sync
    await db.collection("users").updateOne(
      { _id: user._id as any },
      {
        $set: {
          "company_details.gstin": cleanGstin,
          "company_details.pan": cleanPan,
          updatedAt: now,
        },
      }
    );

    return NextResponse.json({
      success: true,
      tax: {
        gstin: cleanGstin,
        pan: cleanPan,
        default_tax_rate: defaultTaxRate,
        default_hsn_code: defaultHsnCode,
        show_tax_breakdown: showTaxBreakdown,
        tax_regime: taxRegime,
        tds_applicable: tdsApplicable,
        tcs_applicable: tcsApplicable,
        reverse_charge_liable: reverseChargeLiable,
      },
    });
  } catch (error: any) {
    console.error("Error updating tax settings:", error);
    return NextResponse.json({ error: error.message || "Failed to update tax settings" }, { status: 500 });
  }
}
