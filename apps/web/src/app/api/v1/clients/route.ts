/**
 * Clients API — /api/v1/clients
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getClientService } from "@/modules/clients";
import { getDataOwnerId } from "@/lib/auth-session";
import { assertCanCreate } from "@/lib/entitlements";
import { getDb } from "@/lib/mongodb";
import { enqueueTallyJob } from "@/services/tally/bridge/tallyBridgeService";
import { buildClientLedgerXml } from "@/services/tally";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser) => {
            const service = getClientService();
            const items = await service.findAll(getDataOwnerId(user));
            return envelope.ok(items);
        }),
    ),
    { tier: "read" },
);

export const POST = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
            const limitError = await assertCanCreate(user, "clients", 1);
            if (limitError) return limitError;

            const body = await request.json();
            const organizationId = getDataOwnerId(user);
            const service = getClientService();
            const item = await service.create(organizationId, body);

            // Tally Sync Queue (Skip if sample data)
            if (!(item as any).is_sample && !body.is_sample) {
                const isConfigured = Boolean(item.gstin && item.state);
                const initialStatus = isConfigured ? "pending" : "not_configured";

                // Set tallySync status at enqueue time
                await service.update(item.id, organizationId, {
                    tallySync: { status: initialStatus },
                });
                item.tallySync = { status: initialStatus };

                try {
                    const db = await getDb();
                    const company = await db.collection("companyprofiles").findOne({ organizationId });
                    const companyName = company?.tally_company_name || company?.company_name || "My Company";

                    const requestXml = buildClientLedgerXml(item, companyName);
                    await enqueueTallyJob(organizationId, {
                        type: "master.ledger",
                        dedupeKey: `client:${item.id}`,
                        requestXml,
                        sourceRef: { entityType: "client", entityId: item.id },
                        priority: 10,
                    });
                } catch (err: any) {
                    console.error("[TallySync] Failed to enqueue client ledger sync job:", err);
                }
            }

            return envelope.created(item);
        }),
    ),
    { tier: "write" },
);
