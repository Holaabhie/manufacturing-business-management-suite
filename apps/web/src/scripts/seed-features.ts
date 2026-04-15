/**
 * Seed Script — Default Feature Flags
 * 
 * Populates the `featureflags` collection with the default feature set.
 * Uses upsert to be idempotent — safe to run multiple times.
 * 
 * Usage:
 *   npx tsx apps/web/src/scripts/seed-features.ts
 * 
 * Requires: MONGODB_URI environment variable (or .env.local in apps/web)
 */

import mongoose from 'mongoose';
import path from 'path';
import { config } from 'dotenv';

// Load .env.local from apps/web
config({ path: path.resolve(__dirname, '../../.env.local') });

// ─── Default Feature Flags ──────────────────────────────────────
const defaultFeatures = [
  {
    key: 'dashboard_analytics',
    name: 'Dashboard Analytics',
    description: 'Advanced analytics dashboard with charts and insights',
    allowedTiers: ['pro'],
    adminOnly: false,
  },
  {
    key: 'export_pdf',
    name: 'Export to PDF',
    description: 'Export reports, invoices, and data as PDF documents',
    allowedTiers: ['pro'],
    adminOnly: false,
  },
  {
    key: 'export_csv',
    name: 'Export to CSV',
    description: 'Export data tables as CSV files for external analysis',
    allowedTiers: ['pro'],
    adminOnly: false,
  },
  {
    key: 'ai_assistant',
    name: 'AI Assistant',
    description: 'AI-powered business assistant for insights and automation',
    allowedTiers: ['pro'],
    adminOnly: false,
  },
  {
    key: 'custom_branding',
    name: 'Custom Branding',
    description: 'Customize invoices and reports with your own branding',
    allowedTiers: ['pro'],
    adminOnly: false,
  },
  {
    key: 'api_access',
    name: 'API Access',
    description: 'REST API access for third-party integrations',
    allowedTiers: ['pro'],
    adminOnly: false,
  },
  {
    key: 'priority_support',
    name: 'Priority Support',
    description: 'Priority customer support with faster response times',
    allowedTiers: ['pro'],
    adminOnly: false,
  },
  {
    key: 'admin_panel',
    name: 'Admin Panel',
    description: 'Full administrative control panel',
    allowedTiers: ['starter', 'pro'],
    adminOnly: true,
  },
  {
    key: 'user_management',
    name: 'User Management',
    description: 'Manage team members, roles, and permissions',
    allowedTiers: ['starter', 'pro'],
    adminOnly: true,
  },
  {
    key: 'system_settings',
    name: 'System Settings',
    description: 'Configure organization-wide system settings',
    allowedTiers: ['starter', 'pro'],
    adminOnly: true,
  },
  {
    key: 'basic_features',
    name: 'Basic Features',
    description: 'Core application features available to all users',
    allowedTiers: ['starter', 'pro'],
    adminOnly: false,
  },
  {
    key: 'limited_projects',
    name: 'Up to 3 Projects',
    description: 'Create and manage up to 3 active projects',
    allowedTiers: ['starter', 'pro'],
    adminOnly: false,
  },
  {
    key: 'unlimited_projects',
    name: 'Unlimited Projects',
    description: 'Create and manage unlimited projects',
    allowedTiers: ['pro'],
    adminOnly: false,
  },
] as const;

// ─── Main ───────────────────────────────────────────────────────
async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is required');
    process.exit(1);
  }

  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  if (!db) {
    console.error('❌ Failed to get database instance');
    process.exit(1);
  }

  const collection = db.collection('featureflags');

  console.log('🌱 Seeding feature flags...');

  let created = 0;
  let updated = 0;

  for (const feature of defaultFeatures) {
    const result = await collection.updateOne(
      { key: feature.key },
      {
        $set: {
          name: feature.name,
          description: feature.description,
          allowedTiers: [...feature.allowedTiers],
          adminOnly: feature.adminOnly,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          key: feature.key,
          enabled: true,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      created++;
      console.log(`  ✅ Created: ${feature.key} — ${feature.name}`);
    } else if (result.modifiedCount > 0) {
      updated++;
      console.log(`  🔄 Updated: ${feature.key} — ${feature.name}`);
    } else {
      console.log(`  ⏭️  Skipped: ${feature.key} — no changes`);
    }
  }

  console.log(`\n🎉 Done! Created: ${created}, Updated: ${updated}, Total: ${defaultFeatures.length}`);

  // Create index on key field
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ enabled: 1 });
  console.log('📇 Indexes ensured');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
