import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getSessionUser, getDataOwnerId } from '@/lib/auth-session';

export async function GET(req: NextRequest) {
    try {
        // ── Auth check ─────────────────────────────────
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only Admins can view audit logs
        if (user.role !== 'Admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const organizationId = getDataOwnerId(user);

        // ── Parse query params ─────────────────────────
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
        const module = searchParams.get('module');
        const actionType = searchParams.get('actionType');
        const severity = searchParams.get('severity');
        const userId = searchParams.get('userId');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const search = searchParams.get('search');

        // ── Build MongoDB filter ───────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: Record<string, any> = {
            organizationId,
        };

        if (module) filter.module = module;
        if (actionType) filter.actionType = actionType;
        if (severity) filter.severity = severity;
        if (userId) filter.userId = userId;

        if (dateFrom || dateTo) {
            filter.timestamp = {};
            if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
            if (dateTo) filter.timestamp.$lte = new Date(dateTo);
        }

        if (search) {
            filter.$or = [
                { action: { $regex: search, $options: 'i' } },
                { userName: { $regex: search, $options: 'i' } },
                { details: { $regex: search, $options: 'i' } },
            ];
        }

        // ── Query with pagination ──────────────────────
        await connectToDatabase();
        const { AuditLog } = await import('@/models/AuditLog');

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ timestamp: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            AuditLog.countDocuments(filter),
        ]);

        return NextResponse.json({
            logs,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        });
    } catch (error) {
        console.error('[Audit API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
