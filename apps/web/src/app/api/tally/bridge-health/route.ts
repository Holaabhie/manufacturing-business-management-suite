/**
 * Tally Bridge Health API — GET /api/tally/bridge-health
 * ─────────────────────────────────────────────────────────
 * Returns the Tally bridge configuration (URL + masked token)
 * from the company profile. The client-side code uses
 * this URL to connect directly to the local Tally bridge.
 *
 * Auth: Admin only.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { CompanyProfile } from "@/models/CompanyProfile";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * Masks an auth token for safe display.
 * Shows first 8 characters, replaces rest with ***.
 */
function maskToken(token: string | undefined): string {
    if (!token) return "";
    if (token.length <= 8) return token;
    return token.substring(0, 8) + "***";
}

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser) => {
            await connectToDatabase();

            const orgId = user.organizationId || user._id.toString();
            const company = await CompanyProfile.findOne(
                { organizationId: orgId },
                {
                    tally_bridge_url: 1,
                    tally_auth_token: 1,
                    tally_company_name: 1,
                    company_name: 1,
                },
            ).lean();

            if (!company) {
                return envelope.error(
                    "Company profile not found. Complete Company Setup first.",
                    404,
                    "NOT_FOUND",
                );
            }

            return envelope.ok({
                bridgeUrl: company.tally_bridge_url || "http://localhost:4567",
                authToken: maskToken(company.tally_auth_token),
                tallyCompanyName: company.tally_company_name || company.company_name || "",
                configured: Boolean(company.tally_company_name && company.tally_bridge_url),
            });
        }, { role: "Admin" }),
    ),
    { tier: "read" },
);
