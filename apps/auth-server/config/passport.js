/**
 * Passport Google OAuth 2.0 Strategy
 * ────────────────────────────────────
 * Configures the Google Strategy for Passport.js.
 *
 * On successful Google login:
 *   1. Look up user by googleId
 *   2. If not found, look up by email (link existing account)
 *   3. If still not found, create a new user
 *   4. Update lastLogin timestamp
 *   5. Return the user for serialization
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// ── Validate env vars at load time ────────────────────────
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn(
        '  ⚠️  GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — Google OAuth will be disabled'
    );
}

// ── Serialize / Deserialize ───────────────────────────────
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ── Google Strategy ───────────────────────────────────────
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: CALLBACK_URL,
                scope: ['profile', 'email'],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    const googleId = profile.id;
                    const fullName = profile.displayName || 'Google User';
                    const avatar = profile.photos?.[0]?.value || null;

                    if (!email) {
                        return done(new Error('No email returned from Google'), null);
                    }

                    // 1. Try to find by Google ID (returning user)
                    let user = await User.findOne({ googleId });

                    if (!user) {
                        // 2. Try to find by email (link existing account)
                        user = await User.findOne({ email: email.toLowerCase() });

                        if (user) {
                            // Link Google account to existing user
                            user.googleId = googleId;
                            user.isEmailVerified = true;
                            user.avatar = user.avatar || avatar;
                            user.loginProvider = 'google';
                            user.lastLogin = new Date();
                            await user.save();

                            console.log(`[passport] Linked Google account to existing user: ${email}`);
                        } else {
                            // 3. Create new user
                            user = await User.create({
                                fullName,
                                email: email.toLowerCase(),
                                googleId,
                                avatar,
                                role: 'Admin',
                                status: 'active',
                                isEmailVerified: true,
                                loginProvider: 'google',
                                lastLogin: new Date(),
                            });

                            console.log(`[passport] Created new Google user: ${email}`);
                        }
                    } else {
                        // Returning user — update login timestamp
                        user.lastLogin = new Date();
                        user.avatar = user.avatar || avatar;
                        await user.save();

                        console.log(`[passport] Returning Google user: ${email}`);
                    }

                    return done(null, user);
                } catch (err) {
                    console.error('[passport] Google strategy error:', err);
                    return done(err, null);
                }
            }
        )
    );

    console.log('  ✅  Google OAuth strategy configured');
} else {
    console.log('  ⚠️  Google OAuth strategy skipped (missing credentials)');
}

module.exports = passport;
