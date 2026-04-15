/**
 * MongoDB Connection
 * ──────────────────
 * Reusable Mongoose connection with retry logic
 * and event logging for production reliability.
 */

const mongoose = require('mongoose');

let isConnected = false;

async function connectMongo() {
    if (isConnected) return;

    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGO_URI environment variable is required');
    }

    try {
        await mongoose.connect(uri, {
            // Modern Mongoose 7+ defaults handle these, but explicit is clearer
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        console.log('  ✅  MongoDB connected successfully');
    } catch (err) {
        console.error('  ❌  MongoDB connection failed:', err.message);
        process.exit(1);
    }

    // ── Connection Events ─────────────────────────────────
    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        console.warn('[mongo] Disconnected from MongoDB');
    });

    mongoose.connection.on('error', (err) => {
        console.error('[mongo] Connection error:', err.message);
    });

    mongoose.connection.on('reconnected', () => {
        isConnected = true;
        console.log('[mongo] Reconnected to MongoDB');
    });
}

module.exports = connectMongo;
