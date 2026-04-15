/**
 * Auth Server — Express Entry Point
 * ───────────────────────────────────
 * Server-side rendered auth with:
 *   • express-session  (Redis / MemoryStore)
 *   • csrf-sync        (session-bound CSRF)
 *   • Passport + Google OAuth 2.0
 *   • JWT authentication (httpOnly cookies)
 *   • MongoDB via Mongoose
 *   • EJS templates
 *
 * NO localStorage, NO SPA patterns, NO client-side auth checks.
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// ── Database ───────────────────────────────────────────
const connectMongo = require('./config/db');

// ── Passport (must be required AFTER dotenv) ───────────
const passport = require('./config/passport');

// ── Middleware ──────────────────────────────────────────
const sessionMiddleware = require('./middleware/session');
const { csrfErrorHandler } = require('./middleware/csrf');

// ── Routes ─────────────────────────────────────────────
const authRoutes = require('./routes/auth');         // Existing EJS login routes
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const authApiRoutes = require('./routes/authRoutes'); // New Google OAuth + JWT routes
const invoiceRoutes = require('./routes/invoiceRoutes'); // Invoice CRUD with idempotency

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── View engine ────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── CORS (for React frontend) ──────────────────────────
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));

// ── Body parsers ───────────────────────────────────────
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// ── Session ────────────────────────────────────────────
app.use(sessionMiddleware);

// ── Passport ───────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Routes ─────────────────────────────────────────────
// API routes (Google OAuth, JWT auth) — BEFORE EJS routes
app.use('/', authApiRoutes);
app.use('/', invoiceRoutes);

// EJS-rendered routes (existing functionality)
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', settingsRoutes);

// ── Root redirect ──────────────────────────────────────
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    return res.redirect('/login');
});

// ── CSRF error handler (must be AFTER routes) ──────────
app.use(csrfErrorHandler);

// ── Generic error handler ──────────────────────────────
app.use((err, req, res, _next) => {
    console.error('[server] Unhandled error:', err);

    // If request expects JSON (API calls)
    if (req.path.startsWith('/api/')) {
        return res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }

    // EJS error page
    res.status(500).render('error', {
        title: 'Server Error',
        message: 'An unexpected error occurred. Please try again later.',
        csrfToken: '',
        user: req.session?.user || null,
        currentPage: '',
    });
});

// ── Start ──────────────────────────────────────────────
async function startServer() {
    // Connect to MongoDB first
    await connectMongo();

    app.listen(PORT, () => {
        console.log(`\n  🚀  Auth Server running at http://localhost:${PORT}`);
        console.log(`  📡  Frontend URL: ${FRONTEND_URL}`);
        console.log(`  🔗  Google OAuth: http://localhost:${PORT}/api/auth/google\n`);
    });
}

startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

module.exports = app; // for testing
