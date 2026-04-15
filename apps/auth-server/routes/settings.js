/**
 * Settings Routes (protected)
 * ─────────────────────────────
 * GET  /settings — render settings form with current user data
 * POST /settings — update display name in session, redirect back
 */

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { csrfProtection, attachCsrfToken } = require('../middleware/csrf');

// ── GET /settings ───────────────────────────────────────
router.get(
    '/settings',
    requireAuth,
    attachCsrfToken,
    csrfProtection,
    (req, res) => {
        res.render('settings', {
            title: 'Settings',
            user: req.session.user,
            csrfToken: res.locals.csrfToken,
            currentPage: 'settings',
            success: req.query.success === 'true',
        });
    }
);

// ── POST /settings ──────────────────────────────────────
router.post(
    '/settings',
    requireAuth,
    csrfProtection,
    attachCsrfToken,
    (req, res) => {
        const { displayName } = req.body;

        if (displayName && displayName.trim().length > 0) {
            req.session.user.name = displayName.trim();
        }

        // Explicit save before redirect
        req.session.save((err) => {
            if (err) {
                console.error('[settings] Session save failed:', err);
            }
            return res.redirect('/settings?success=true');
        });
    }
);

module.exports = router;
