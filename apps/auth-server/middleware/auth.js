/**
 * Auth Guard Middleware
 * ─────────────────────
 * Protects routes that require an authenticated session.
 *
 * Behaviour:
 *   • If req.session.user exists and is not null → call next()
 *   • Otherwise → redirect to /login?reason=session_expired
 *     and log the rejection with timestamp, URL, and session-ID fragment.
 */

function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }

    const sessionFragment = (req.sessionID || 'unknown').slice(0, 8);
    console.warn(
        `[auth] Session rejected — ` +
        `time=${new Date().toISOString()} ` +
        `url=${req.originalUrl} ` +
        `sid=${sessionFragment}…`
    );

    return res.redirect('/login?reason=session_expired');
}

module.exports = requireAuth;
