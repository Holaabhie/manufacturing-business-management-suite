/**
 * Session Store Factory
 * ─────────────────────
 * Returns a Redis-backed store when REDIS_URL is available.
 * Falls back to the default MemoryStore with a loud warning for dev-only use.
 */

const session = require('express-session');

function createSessionStore() {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
        try {
            const RedisStore = require('connect-redis').default;
            const Redis = require('ioredis');
            const client = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                retryStrategy(times) {
                    if (times > 5) {
                        console.error('[session-store] Redis retry limit reached — falling back to MemoryStore');
                        return null; // stop retrying
                    }
                    return Math.min(times * 200, 2000);
                },
            });

            client.on('connect', () => console.log('[session-store] ✔  Connected to Redis'));
            client.on('error', (err) => console.error('[session-store] Redis error:', err.message));

            return new RedisStore({ client, prefix: 'sess:' });
        } catch (err) {
            console.error('[session-store] Failed to initialise Redis store:', err.message);
            console.warn('[session-store] Falling back to MemoryStore…');
        }
    }

    // ── Dev-only fallback ──────────────────────────────────
    console.warn('┌──────────────────────────────────────────────────────────┐');
    console.warn('│  ⚠  USING MemoryStore — FOR DEVELOPMENT ONLY           │');
    console.warn('│  Sessions will be lost on server restart.               │');
    console.warn('│  Set REDIS_URL in .env for production use.              │');
    console.warn('└──────────────────────────────────────────────────────────┘');

    return new session.MemoryStore();
}

module.exports = createSessionStore;
