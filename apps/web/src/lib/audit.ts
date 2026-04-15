/**
 * Audit Logging Utility
 * 
 * Provides a simple API to log actions to the audit trail.
 * All entries are immutable once created.
 */

import { connectToDatabase } from '@/lib/mongodb';
import { logger } from '@/infrastructure/logging/logger';

export interface AuditEntry {
    organizationId: string;
    userId: string;
    userName: string;
    userRole: 'Admin' | 'Staff';
    action: string;
    actionType: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'permission_change' | 'system' | 'security';
    module: string;
    resourceId?: string;
    resourceType?: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    severity?: 'info' | 'warning' | 'critical';
    details?: string;
}

/**
 * Log an action to the audit trail.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
    try {
        await connectToDatabase();
        const { AuditLog } = await import('@/models/AuditLog');

        const deviceInfo = parseUserAgent(entry.userAgent);

        await AuditLog.create({
            ...entry,
            severity: entry.severity || 'info',
            deviceType: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            timestamp: new Date(),
        });
    } catch (error) {
        // Audit logging should never break the main flow
        logger.error('[AuditLog] Failed to log entry', { error: error instanceof Error ? error.message : String(error) });
    }
}

/**
 * Log an authentication event.
 */
export async function logAuthEvent(
    params: {
        organizationId: string;
        userId: string;
        userName: string;
        userRole: 'Admin' | 'Staff';
        action: string;
        actionType: 'login' | 'logout' | 'security';
        ipAddress?: string;
        userAgent?: string;
        severity?: 'info' | 'warning' | 'critical';
        details?: string;
    }
): Promise<void> {
    return logAudit({
        ...params,
        module: 'auth',
    });
}

/**
 * Log a data operation (CRUD).
 */
export async function logDataOperation(
    params: {
        organizationId: string;
        userId: string;
        userName: string;
        userRole: 'Admin' | 'Staff';
        action: string;
        actionType: 'create' | 'read' | 'update' | 'delete' | 'export';
        module: string;
        resourceId?: string;
        resourceType?: string;
        beforeState?: Record<string, unknown>;
        afterState?: Record<string, unknown>;
        ipAddress?: string;
        userAgent?: string;
    }
): Promise<void> {
    return logAudit({
        ...params,
        severity: params.actionType === 'delete' ? 'warning' : 'info',
    });
}

/**
 * Log a permission change.
 */
export async function logPermissionChange(
    params: {
        organizationId: string;
        userId: string;
        userName: string;
        targetUserId: string;
        targetUserName: string;
        beforePermissions: Record<string, unknown>;
        afterPermissions: Record<string, unknown>;
        ipAddress?: string;
        userAgent?: string;
    }
): Promise<void> {
    return logAudit({
        organizationId: params.organizationId,
        userId: params.userId,
        userName: params.userName,
        userRole: 'Admin',
        action: `Modified permissions for ${params.targetUserName}`,
        actionType: 'permission_change',
        module: 'team',
        resourceId: params.targetUserId,
        resourceType: 'user',
        beforeState: params.beforePermissions,
        afterState: params.afterPermissions,
        severity: 'warning',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
    });
}

// ─── Helper: Parse User Agent ───────────────────────────────────
function parseUserAgent(ua?: string): { deviceType: string; browser: string } {
    if (!ua) return { deviceType: 'unknown', browser: 'unknown' };

    // Simple device detection
    let deviceType = 'desktop';
    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

    // Simple browser detection
    let browser = 'unknown';
    if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/edge/i.test(ua)) browser = 'Edge';
    else if (/opera|opr/i.test(ua)) browser = 'Opera';

    return { deviceType, browser };
}

/**
 * Extract IP address from request headers.
 */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';

    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;

    return 'unknown';
}
