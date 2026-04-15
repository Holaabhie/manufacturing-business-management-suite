/**
 * Auth Controller
 * ────────────────
 * Handles post-authentication logic:
 *   • JWT generation
 *   • Cookie setting
 *   • Redirect to frontend
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

if (!JWT_SECRET) {
    console.warn('  ⚠️  JWT_SECRET not set — JWT signing will fail at runtime');
}

/**
 * Generate a signed JWT for the given user.
 */
function generateToken(user) {
    const payload = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.fullName,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Handle successful Google OAuth callback.
 * Called after Passport authenticates the user.
 *
 *   1. Generate JWT
 *   2. Set it as an httpOnly cookie
 *   3. Redirect to frontend dashboard
 */
function handleGoogleCallback(req, res) {
    try {
        if (!req.user) {
            console.error('[authController] No user on request after Google auth');
            return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
        }

        const token = generateToken(req.user);

        // Set JWT as httpOnly cookie — secure in production
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',
        });

        console.log(`[authController] Google login success: ${req.user.email} → redirecting to dashboard`);

        // Redirect to frontend dashboard
        return res.redirect(`${FRONTEND_URL}/dashboard`);
    } catch (err) {
        console.error('[authController] Google callback error:', err);
        return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
    }
}

/**
 * Return current authenticated user info.
 * Reads the JWT from the httpOnly cookie.
 */
function getCurrentUser(req, res) {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        return res.json({
            user: {
                id: decoded.id,
                email: decoded.email,
                name: decoded.name,
                role: decoded.role,
            },
        });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

/**
 * Logout — clear the JWT cookie.
 */
function handleLogout(req, res) {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    // Also destroy express-session if it exists
    if (req.session) {
        req.session.destroy(() => { });
    }

    return res.json({ message: 'Logged out successfully' });
}

/**
 * JWT verification middleware.
 * Attaches decoded user to req.user.
 */
function verifyToken(req, res, next) {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = {
    generateToken,
    handleGoogleCallback,
    getCurrentUser,
    handleLogout,
    verifyToken,
};
