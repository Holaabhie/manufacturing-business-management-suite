/**
 * Clients Detail API — /api/v1/clients/[id]
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getClientService } from "@/modules/clients";
import { getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { enqueueTallyJob } from "@/services/tally/bridge/tallyBridgeService";
import { buildClientLedgerXml } from "@/services/tally";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const service = getClientService();
            const item = await service.findById(id, getDataOwnerId(user));
            return envelope.ok(item);
        }),
    ),
    { tier: "read" },
);

export const PUT = withRateLimit(
    withApiRoute(
        withAuth(async (request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const organizationId = getDataOwnerId(user);
            const body = await request.json();
            const service = getClientService();

            const oldClient = await service.findById(id, organizationId);
            const item = await service.update(id, organizationId, body);

            // Tally Sync Queue (Skip if sample data)
            if (oldClient && !(item as { is_sample?: boolean }).is_sample && !body.is_sample) {
                const relevantFields: (keyof typeof body)[] = ["name", "gstin", "state", "address", "phone", "email"];
                const hasRelevantChange = relevantFields.some(
                    (f) => (body as Record<string, unknown>)[f as string] !== undefined && (body as Record<string, unknown>)[f as string] !== (oldClient as unknown as Record<string, unknown>)[f as string],
                );

                if (hasRelevantChange) {
                    const isConfigured = Boolean(item.gstin && item.state);
                    const initialStatus = isConfigured ? "pending" : "not_configured";

                    await service.update(id, organizationId, {
                        tallySync: { status: initialStatus, lastSyncedAt: item.tallySync?.lastSyncedAt },
                    });
                    item.tallySync = { status: initialStatus, lastSyncedAt: item.tallySync?.lastSyncedAt };

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
                    } catch (err: unknown) {
                        console.error("[TallySync] Failed to enqueue client ledger sync job on update:", err);
                    }
                }
            }

            return envelope.ok(item);
        }),
    ),
    { tier: "write" },
);

export const PATCH = PUT;

export const DELETE = withRateLimit(
    withApiRoute(
        withAuth(async (_req: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
            const { id } = await context!.params;
            const service = getClientService();
            await service.delete(id, getDataOwnerId(user));
            return envelope.noContent();
        }),
    ),
    { tier: "write" },
);
