import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompanyProfile } from "@/models/CompanyProfile";
import { User } from "@/models/User";
import { seedCompanyDefaults } from "@/modules/company/domain/seeder";
import { z } from "zod";
import { AuditLog } from "@/models/AuditLog";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";

// Step logic based on 1.4 Smart Flow
const companySetupSchema = z.object({
    company_name: z.string().min(1),
    trade_name: z.string().optional(),
    logo_url: z.string().optional(),
    phone: z.string().min(1),
    email: z.string().email(),

    business_type: z.enum(['Manufacturer', 'Trader', 'Service', 'Retailer', 'Wholesaler', 'Distributor', 'Other']),
    industry_type: z.string().min(1),
    gst_number: z.string().optional(),
    tax_regime: z.enum(['Regular', 'Composition', 'Unregistered']).default('Regular'),
    pan_number: z.string().optional(),
    msme_category: z.enum(['Micro', 'Small', 'Medium', 'Large']).optional(),
    financial_year_start: z.enum(['January', 'April']).default('April'),

    reg_address_line_1: z.string().min(1),
    reg_address_line_2: z.string().optional(),
    reg_city: z.string().min(1),
    reg_state: z.string().min(1),
    reg_pincode: z.string().min(1),

    bank_name: z.string().optional(),
    bank_account_number: z.string().optional(),
    bank_ifsc: z.string().optional(),
    upi_id: z.string().optional(),

    invoice_prefix: z.string().default('INV-'),
    order_prefix: z.string().default('ORD-'),

    brand_primary_color: z.string().default('#2563EB'),
    brand_secondary_color: z.string().default('#1E40AF'),
});

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const userId = sessionUser._id.toString();
        const organizationId = getDataOwnerId(sessionUser);

        const data = await req.json();
        const parsed = companySetupSchema.parse(data);

        // Upsert CompanyProfile
        const profile = await CompanyProfile.findOneAndUpdate(
            { organizationId },
            {
                $set: {
                    company_name: parsed.company_name,
                    trade_name: parsed.trade_name,
                    logo_url: parsed.logo_url,
                    primary_phone: parsed.phone,
                    primary_email: parsed.email,
                    business_type: parsed.business_type,
                    industry_type: parsed.industry_type,
                    gst_number: parsed.gst_number,
                    tax_regime: parsed.tax_regime,
                    pan_number: parsed.pan_number,
                    msme_category: parsed.msme_category as 'Micro' | 'Small' | 'Medium' | 'Large',
                    financial_year_start: parsed.financial_year_start,
                    reg_address_line_1: parsed.reg_address_line_1,
                    reg_address_line_2: parsed.reg_address_line_2,
                    reg_city: parsed.reg_city,
                    reg_state: parsed.reg_state,
                    reg_pincode: parsed.reg_pincode,
                    bank_name: parsed.bank_name,
                    bank_account_number: parsed.bank_account_number,
                    bank_ifsc: parsed.bank_ifsc,
                    upi_id: parsed.upi_id,
                    invoice_prefix: parsed.invoice_prefix || 'INV-',
                    order_prefix: parsed.order_prefix || 'ORD-',
                    brand_primary_color: parsed.brand_primary_color,
                    brand_secondary_color: parsed.brand_secondary_color,
                    is_onboarding_complete: true,
                    onboarding_step: 5,
                    completed_by_user_id: userId,
                }
            },
            { upsert: true, new: true }
        );

        // Generate defaults
        await seedCompanyDefaults(organizationId);

        // Log Activity
        await AuditLog.create({
            organizationId,
            userId,
            userName: "System User",
            userRole: "Admin",
            action: "Company profile created and onboarding completed",
            actionType: 'system',
            module: 'company',
            resourceId: profile._id.toString()
        });

        return NextResponse.json({ success: true, profile });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
