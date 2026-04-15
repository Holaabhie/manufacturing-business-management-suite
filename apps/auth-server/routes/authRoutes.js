/**
 * Auth API Routes
 * ────────────────
 * OAuth and JWT authentication endpoints.
 *
 *   GET  /api/auth/google           — Initiate Google OAuth flow
 *   GET  /api/auth/google/callback  — Handle Google OAuth callback
 *   GET  /api/auth/me               — Get current authenticated user
 *   POST /api/auth/logout           — Clear auth token
 */

const express = require('express');
const passport = require('passport');
const {
    handleGoogleCallback,
    getCurrentUser,
    handleLogout,
    verifyToken,
} = require('../controllers/authController');

const router = express.Router();

// ─────────────────────────────────────────────────────────
// GET /api/auth/google
// ─────────────────────────────────────────────────────────
// Redirect user to Google's consent screen
router.get(
    '/api/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'consent',
        accessType: 'offline',
    })
);

// ─────────────────────────────────────────────────────────
// GET /api/auth/google/callback
// ─────────────────────────────────────────────────────────
// Google redirects here after user consents
router.get(
    '/api/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/login?error=google_auth_failed',
        session: false, // We use JWT, not sessions for API auth
    }),
    handleGoogleCallback
);

// ─────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────
// Returns the currently authenticated user (from JWT cookie)
router.get('/api/auth/me', getCurrentUser);

// ─────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────
// Clears the auth token cookie
router.post('/api/auth/logout', handleLogout);

// ─────────────────────────────────────────────────────────
// GET /api/auth/status
// ─────────────────────────────────────────────────────────
// Quick health check — is the user authenticated?
router.get('/api/auth/status', (req, res) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.json({ authenticated: false });
    }

    try {
        const jwt = require('jsonwebtoken');
        jwt.verify(token, process.env.JWT_SECRET);
        return res.json({ authenticated: true });
    } catch {
        return res.json({ authenticated: false });
    }
});

module.exports = router;
