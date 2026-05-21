/**
 * Tally XML Generation API — POST /api/tally/generate-xml
 * ─────────────────────────────────────────────────────────
 * Generates Tally Prime XML for a given invoice.
 * Returns ledger XML (party + sales + GST) and voucher XML.
 *
 * Auth: Admin only.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDataOwnerId } from "@/lib/auth-session";
import { getBillingService } from "@/modules/billing";
import { CompanyProfile } from "@/models/CompanyProfile";
import { connectToDatabase } from "@/lib/mongodb";
import {
    generatePartyLedgerXml,
    generateSalesLedgerXml,
    generateGSTLedgerXml,
    generateBatchStockItemXml,
    generateSalesVoucherXml,
    billToVoucherPayload,
} from "@/services/tally";

export const POST = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const body = await request.json();
            const { invoiceId } = body;

            if (!invoiceId) {
                return envelope.error("invoiceId is required", 400, "VALIDATION_ERROR");
            }

            const dataOwnerId = getDataOwnerId(user);

            // 1. Fetch invoice
            const billingService = getBillingService();
            const bill = await billingService.findById(invoiceId, dataOwnerId);

            // 2. Fetch company profile for Tally config
            await connectToDatabase();
            const orgId = user.organizationId || user._id.toString();
            const company = await CompanyProfile.findOne({ organizationId: orgId }).lean();

            const tallyCompanyName = company?.tally_company_name
                || company?.company_name
                || "My Company";

            // 3. Generate party info from bill data
            const partyInfo = {
                clientName: bill.clientName,
                clientGSTIN: bill.clientGSTIN || undefined,
                clientAddress: bill.clientAddress || undefined,
            };

            // 4. Generate all XML payloads
            const partyLedgerXml = generatePartyLedgerXml(partyInfo, tallyCompanyName);
            const salesLedgerXml = generateSalesLedgerXml(tallyCompanyName);

            // GST ledgers — generate based on interstate status
            const isInterstate = bill.igstAmount > 0;
            const gstLedgerXml = isInterstate
                ? generateGSTLedgerXml("IGST", tallyCompanyName)
                : [
                    generateGSTLedgerXml("CGST", tallyCompanyName),
                    generateGSTLedgerXml("SGST", tallyCompanyName),
                ].join("\n");

            // Stock items
            const voucherPayload = billToVoucherPayload(bill, tallyCompanyName);
            const stockItemXml = generateBatchStockItemXml(
                voucherPayload.lineItems,
                tallyCompanyName,
            );

            // Sales voucher
            const voucherXml = generateSalesVoucherXml(voucherPayload);

            // Combine all ledger XMLs
            const ledgerXml = [
                partyLedgerXml,
                salesLedgerXml,
                gstLedgerXml,
            ].join("\n\n");

            return envelope.ok({
                ledgerXml,
                stockItemXml,
                voucherXml,
                invoice: {
                    id: bill.id,
                    billNumber: bill.billNumber,
                    clientName: bill.clientName,
                    totalAmount: bill.totalAmount,
                    tallySynced: bill.tallySynced,
                },
            });
        }, { role: "Admin" }),
    ),
    { tier: "write" },
);
