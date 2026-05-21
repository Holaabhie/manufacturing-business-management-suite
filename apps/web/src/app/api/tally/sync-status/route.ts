/**
 * Tally Sync Status API — PATCH /api/tally/sync-status
 * ─────────────────────────────────────────────────────────
 * Updates the Tally sync status on an invoice after
 * successful bridge import.
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

export const PATCH = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const body = await request.json();
            const { invoiceId, tally_synced, tally_voucher_number } = body;

            if (!invoiceId) {
                return envelope.error("invoiceId is required", 400, "VALIDATION_ERROR");
            }

            if (typeof tally_synced !== "boolean") {
                return envelope.error("tally_synced must be a boolean", 400, "VALIDATION_ERROR");
            }

            const dataOwnerId = getDataOwnerId(user);
            const billingService = getBillingService();

            // Verify invoice exists
            await billingService.findById(invoiceId, dataOwnerId);

            // Update tally sync fields
            const updated = await billingService.update(invoiceId, dataOwnerId, {
                tallySynced: tally_synced,
                tallyVoucherNumber: tally_voucher_number || undefined,
                tallySyncedAt: tally_synced ? new Date().toISOString() : undefined,
            });

            return envelope.ok({
                id: updated.id,
                billNumber: updated.billNumber,
                tallySynced: updated.tallySynced,
                tallyVoucherNumber: updated.tallyVoucherNumber,
                tallySyncedAt: updated.tallySyncedAt,
            });
        }, { role: "Admin" }),
    ),
    { tier: "write" },
);
