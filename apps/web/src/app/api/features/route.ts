/**
 * Feature Flags API Route
 * 
 * GET  /api/features        — List all feature flags (public, used by client)
 * POST /api/features        — Create a new feature flag (Admin only)
 * PUT  /api/features        — Update a feature flag (Admin only)
 * DELETE /api/features?key= — Delete a feature flag (Admin only)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/require-role';
import { invalidateFeatureCache } from '@/lib/features/feature-gate';

// ─── GET: List all feature flags ────────────────────────────────
export async function GET() {
  try {
    const db = await getDb();
    const features = await db
      .collection('featureflags')
      .find({})
      .project({
        _id: 0,
        key: 1,
        name: 1,
        description: 1,
        allowedTiers: 1,
        adminOnly: 1,
        enabled: 1,
      })
      .toArray();

    return NextResponse.json({ features });
  } catch (error) {
    console.error('Failed to fetch feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new feature flag (Admin only) ───────────────
export async function POST(req: NextRequest) {
  const roleCheck = await requireAdmin();
  if (roleCheck.error) {
    return NextResponse.json(
      { error: roleCheck.error },
      { status: roleCheck.status }
    );
  }

  try {
    const body = await req.json();
    const { key, name, description, allowedTiers, adminOnly, enabled } = body;

    if (!key || !name) {
      return NextResponse.json(
        { error: 'key and name are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check for duplicate key
    const existing = await db.collection('featureflags').findOne({ key });
    if (existing) {
      return NextResponse.json(
        { error: `Feature flag with key "${key}" already exists` },
        { status: 409 }
      );
    }

    const now = new Date();
    const feature = {
      key: key.toLowerCase().trim(),
      name: name.trim(),
      description: description?.trim() || undefined,
      allowedTiers: allowedTiers || ['pro'],
      adminOnly: adminOnly ?? false,
      enabled: enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('featureflags').insertOne(feature);
    invalidateFeatureCache();

    return NextResponse.json({ feature }, { status: 201 });
  } catch (error) {
    console.error('Failed to create feature flag:', error);
    return NextResponse.json(
      { error: 'Failed to create feature flag' },
      { status: 500 }
    );
  }
}

// ─── PUT: Update a feature flag (Admin only) ────────────────────
export async function PUT(req: NextRequest) {
  const roleCheck = await requireAdmin();
  if (roleCheck.error) {
    return NextResponse.json(
      { error: roleCheck.error },
      { status: roleCheck.status }
    );
  }

  try {
    const body = await req.json();
    const { key, ...updates } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'key is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Build safe update — only allow specific fields
    const safeUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) safeUpdate.name = updates.name.trim();
    if (updates.description !== undefined) safeUpdate.description = updates.description?.trim() || undefined;
    if (updates.allowedTiers !== undefined) safeUpdate.allowedTiers = updates.allowedTiers;
    if (updates.adminOnly !== undefined) safeUpdate.adminOnly = updates.adminOnly;
    if (updates.enabled !== undefined) safeUpdate.enabled = updates.enabled;

    const result = await db
      .collection('featureflags')
      .updateOne({ key }, { $set: safeUpdate });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: `Feature flag with key "${key}" not found` },
        { status: 404 }
      );
    }

    invalidateFeatureCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update feature flag:', error);
    return NextResponse.json(
      { error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a feature flag (Admin only) ─────────────────
export async function DELETE(req: NextRequest) {
  const roleCheck = await requireAdmin();
  if (roleCheck.error) {
    return NextResponse.json(
      { error: roleCheck.error },
      { status: roleCheck.status }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'key query parameter is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection('featureflags').deleteOne({ key });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: `Feature flag with key "${key}" not found` },
        { status: 404 }
      );
    }

    invalidateFeatureCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete feature flag:', error);
    return NextResponse.json(
      { error: 'Failed to delete feature flag' },
      { status: 500 }
    );
  }
}
