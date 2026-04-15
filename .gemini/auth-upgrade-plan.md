# Enterprise Auth System Upgrade Plan

## Current State Analysis

### What's Already Solid ✅
1. **Password hashing** — bcrypt with salt rounds of 10 ✅
2. **Session-based auth** — custom HttpOnly cookie sessions stored in MongoDB ✅
3. **Account lockout** — 5 attempts, 15-30 min lockout ✅
4. **Failed login tracking** — incremented and logged ✅
5. **Role-based access control** — Admin/Staff with granular permissions ✅
6. **Audit logging** — login success/failure/security events ✅
7. **Status checks** — inactive/suspended account blocking ✅
8. **Multi-tenancy** — organizationId scoping ✅
9. **OTP support** — Twilio-backed OTP for staff ✅
10. **Staff first-time setup flow** — password change + profile ✅

### What Needs Fixing/Adding 🔧

#### Critical Issues
1. **No NextAuth route handler** — `auth.ts` exports handlers but no catch-all route exists for Google OAuth
2. **Google OAuth flow is broken** — SSO buttons open a phone modal instead of redirecting to Google OAuth
3. **No refresh token mechanism** — sessions are 30-day static with no rotation
4. **No CSRF protection** — API routes accept POST without CSRF verified
5. **`reset-password` route vulnerability** — accepts phone + new password with no session/OTP guard
6. **No password strength enforcement at registration** — only min 8 chars checked

#### Enhancement Areas
7. **Session sliding window** — currently fixed 30-day, no renewal on activity
8. **Rate limiting** — no rate limiting on login/register/OTP endpoints
9. **Strong password policy** — only checked in change-password, not register
10. **Google OAuth → custom session bridge** — NextAuth session ≠ custom session

## Implementation Phases

### Phase 1: Fix Google OAuth (Critical)
- Create `/api/auth/[...nextauth]/route.ts` to expose NextAuth handler
- Fix SSO buttons to use actual Google OAuth redirect (signIn from next-auth/react)
- Bridge NextAuth session to custom session after Google OAuth callback
- Handle account linking (existing email match)

### Phase 2: Security Hardening
- Add CSRF token generation and validation
- Add rate limiting middleware for auth endpoints
- Fix reset-password to require OTP verification first
- Enforce password policy everywhere
- Add session rotation (refresh token pattern)

### Phase 3: Session Management
- Add refresh token to session doc
- Add session sliding window (extend on activity)
- Add device fingerprinting to session
- Add logout from all devices API

### Phase 4: Login Page Updates
- Fix SSO to use real Google OAuth
- Add password strength meter to register
- Handle Google OAuth error states
