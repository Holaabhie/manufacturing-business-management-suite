/**
 * CSRF Middleware  (csrf-sync)
 * ────────────────────────────
 * Session-bound CSRF protection (NOT cookie-based double-submit).
 *
 * Exports:
 *   • csrfProtection   — middleware that validates the _csrf token on
 *                         state-changing methods (POST / PUT / PATCH / DELETE)
 *   • attachCsrfToken  — middleware that places the token into res.locals
 *                         so every EJS template can render it
 *   • csrfErrorHandler — Express error handler for EBADCSRFTOKEN / invalid tokens
 */

const { csrfSync } = require('csrf-sync');

const {
    generateToken,
    csrfSynchronisedProtection,
} = csrfSync({
    // ── Session-bound strategy ────────────────────────────
    getTokenFromState: (req) => req.session.csrfToken,
    storeTokenInState: (req, token) => { req.session.csrfToken = token; },

    // ── Where the client sends the token back ─────────────
    getTokenFromRequest: (req) => req.body._csrf || req.headers['x-csrf-token'],

    size: 64, // token byte-length
});

/**
 * Middleware: validate incoming CSRF token (applied per-route or globally
 * for POST / PUT / PATCH / DELETE).
 */
const csrfProtection = csrfSynchronisedProtection;

/**
 * Middleware: generate a token (if none exists yet) and expose it on
 * res.locals so every EJS template can use `<%= csrfToken %>`.
 */
function attachCsrfToken(req, res, next) {
    const token = generateToken(req);
    res.locals.csrfToken = token;
    next();
}

/**
 * Error handler: catches CSRF validation failures and renders a 403 page
 * (HTML, not JSON).
 */
function csrfErrorHandler(err, req, res, _next) {
    if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('csrf')) {
        console.warn(
            `[csrf] Token validation failed — ${req.method} ${req.originalUrl} ` +
            `[session ${(req.sessionID || '').slice(0, 8)}…]`
        );
        return res.status(403).render('error', {
            title: 'Forbidden',
            message: 'Invalid or missing CSRF token. Please go back and try again.',
            csrfToken: '', // no valid token to render
            user: req.session?.user || null,
            currentPage: '',
        });
    }
    // Not a CSRF error — pass it along
    _next(err);
}

module.exports = { csrfProtection, attachCsrfToken, csrfErrorHandler };
