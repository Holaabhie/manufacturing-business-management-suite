/**
 * Auth Routes
 * ────────────
 * GET  /login   — render login form (redirect if already logged in)
 * POST /login   — validate credentials, regenerate session, set user
 * POST /logout  — destroy session, clear cookie, redirect
 */

const express = require('express');
const router = express.Router();
const { csrfProtection, attachCsrfToken } = require('../middleware/csrf');

// ── Hardcoded test users ──────────────────────────────────
const USERS = [
    { email: 'admin@test.com', password: 'password123', name: 'Admin User' },
];

// ─────────────────────────────────────────────────────────
// GET /login
// ─────────────────────────────────────────────────────────
router.get('/login', attachCsrfToken, (req, res) => {
    // Already logged in? → dashboard
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }

    res.render('login', {
        title: 'Sign In',
        csrfToken: res.locals.csrfToken,
        error: req.query.error || null,
        reason: req.query.reason || null,
        user: null,
        currentPage: 'login',
    });
});

// ─────────────────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────────────────
router.post('/login', csrfProtection, (req, res) => {
    const { email, password } = req.body;

    const user = USERS.find(
        (u) => u.email === email && u.password === password
    );

    if (!user) {
        return res.redirect('/login?error=invalid_credentials');
    }

    // Regenerate session to prevent session-fixation attacks
    req.session.regenerate((err) => {
        if (err) {
            console.error('[auth] Session regeneration failed:', err);
            return res.redirect('/login?error=server_error');
        }

        req.session.user = {
            email: user.email,
            name: user.name,
            loginTime: new Date().toISOString(),
        };

        // Save the session explicitly before redirecting
        req.session.save((saveErr) => {
            if (saveErr) {
                console.error('[auth] Session save failed:', saveErr);
                return res.redirect('/login?error=server_error');
            }
            return res.redirect('/dashboard');
        });
    });
});

// ─────────────────────────────────────────────────────────
// POST /logout
// ─────────────────────────────────────────────────────────
router.post('/logout', csrfProtection, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('[auth] Session destroy failed:', err);
        }
        // Always clear the cookie even if destroy had an issue
        res.clearCookie('sid');
        return res.redirect('/login?reason=logged_out');
    });
});

module.exports = router;
