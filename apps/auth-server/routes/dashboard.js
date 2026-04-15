/**
 * Dashboard Route (protected)
 * ────────────────────────────
 * GET /dashboard — render user dashboard after session validation
 */

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { csrfProtection, attachCsrfToken } = require('../middleware/csrf');

router.get(
    '/dashboard',
    requireAuth,
    attachCsrfToken,
    csrfProtection,
    (req, res) => {
        res.render('dashboard', {
            title: 'Dashboard',
            user: req.session.user,
            csrfToken: res.locals.csrfToken,
            currentPage: 'dashboard',
        });
    }
);

module.exports = router;
