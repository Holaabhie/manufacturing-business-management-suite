/**
 * Session Middleware
 * ──────────────────
 * Exports a fully-configured express-session middleware.
 *
 *  • Store     : Redis via connect-redis (primary) OR MemoryStore (dev fallback)
 *  • Cookie    : httpOnly, sameSite=lax, explicit 24 h maxAge
 *  • Security  : secure flag follows NODE_ENV; secret from env var
 */

const session = require('express-session');
const createSessionStore = require('../store/sessionStore');

const ONE_DAY_MS = 86_400_000; // 24 hours

const sessionMiddleware = session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || (() => {
        throw new Error('SESSION_SECRET environment variable is required');
    })(),
    store: createSessionStore(),

    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ONE_DAY_MS, // MUST be explicit — never omitted
    },
});

module.exports = sessionMiddleware;
