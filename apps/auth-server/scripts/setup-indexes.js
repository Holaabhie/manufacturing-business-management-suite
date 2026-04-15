/**
 * Database Index Setup Script
 * ────────────────────────────
 * Creates unique indexes and compound indexes for anti-duplicate
 * protection on critical collections.
 *
 * Run once:
 *   node scripts/setup-indexes.js
 *
 * Or import and call from server startup.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ind_manager';

async function setupIndexes() {
    console.log('\n  📊  Setting up database indexes...\n');

    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // ═══════════════════════════════════════════════════════
    // 1. BILLS — unique billNumber per user
    // ═══════════════════════════════════════════════════════
    try {
        await db.collection('bills').createIndex(
            { billNumber: 1, userId: 1 },
            {
                unique: true,
                sparse: true, // Allow null billNumbers
                name: 'idx_bills_unique_number',
            }
        );
        console.log('  ✅  bills.billNumber + userId — unique index created');
    } catch (err) {
        if (err.code === 85 || err.code === 86) {
            console.log('  ℹ️  bills.billNumber index already exists (skipping)');
        } else {
            console.error('  ❌  bills index error:', err.message);
        }
    }

    // ═══════════════════════════════════════════════════════
    // 2. ORDERS — unique orderId per user
    // ═══════════════════════════════════════════════════════
    try {
        await db.collection('orders').createIndex(
            { orderId: 1, userId: 1 },
            {
                unique: true,
                sparse: true,
                name: 'idx_orders_unique_id',
            }
        );
        console.log('  ✅  orders.orderId + userId — unique index created');
    } catch (err) {
        if (err.code === 85 || err.code === 86) {
            console.log('  ℹ️  orders.orderId index already exists (skipping)');
        } else {
            console.error('  ❌  orders index error:', err.message);
        }
    }

    // ═══════════════════════════════════════════════════════
    // 3. PRODUCTION ENTRIES — unique entryId per user
    // ═══════════════════════════════════════════════════════
    try {
        await db.collection('production_entries').createIndex(
            { entryId: 1, userId: 1 },
            {
                unique: true,
                sparse: true,
                name: 'idx_production_unique_entry',
            }
        );
        console.log('  ✅  production_entries.entryId + userId — unique index created');
    } catch (err) {
        if (err.code === 85 || err.code === 86) {
            console.log('  ℹ️  production_entries.entryId index already exists (skipping)');
        } else {
            console.error('  ❌  production_entries index error:', err.message);
        }
    }

    // ═══════════════════════════════════════════════════════
    // 4. IDEMPOTENCY KEYS — unique key per user + TTL
    // ═══════════════════════════════════════════════════════
    try {
        await db.collection('idempotency_keys').createIndex(
            { key: 1, userId: 1 },
            {
                unique: true,
                name: 'idx_idempotency_unique_key',
            }
        );
        console.log('  ✅  idempotency_keys.key + userId — unique index created');

        await db.collection('idempotency_keys').createIndex(
            { expiresAt: 1 },
            {
                expireAfterSeconds: 0,
                name: 'idx_idempotency_ttl',
            }
        );
        console.log('  ✅  idempotency_keys.expiresAt — TTL index created');
    } catch (err) {
        if (err.code === 85 || err.code === 86) {
            console.log('  ℹ️  idempotency_keys indexes already exist (skipping)');
        } else {
            console.error('  ❌  idempotency_keys index error:', err.message);
        }
    }

    // ═══════════════════════════════════════════════════════
    // 5. USERS — email uniqueness (should already exist)
    // ═══════════════════════════════════════════════════════
    try {
        await db.collection('users').createIndex(
            { email: 1 },
            {
                unique: true,
                name: 'idx_users_unique_email',
            }
        );
        console.log('  ✅  users.email — unique index created');
    } catch (err) {
        if (err.code === 85 || err.code === 86) {
            console.log('  ℹ️  users.email index already exists (skipping)');
        } else {
            console.error('  ❌  users index error:', err.message);
        }
    }

    console.log('\n  🎉  Index setup complete!\n');
    await mongoose.disconnect();
}

// Run directly or export
if (require.main === module) {
    setupIndexes()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Failed:', err);
            process.exit(1);
        });
}

module.exports = setupIndexes;
