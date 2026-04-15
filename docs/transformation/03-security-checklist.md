# Security Audit Checklist

## Transport Layer Security
- [x] HSTS header (`Strict-Transport-Security: max-age=31536000; includeSubDomains`)
- [x] X-Frame-Options: DENY (clickjacking prevention)
- [x] X-Content-Type-Options: nosniff (MIME sniffing prevention)
- [x] X-XSS-Protection: 1; mode=block
- [x] Referrer-Policy: strict-origin-when-cross-origin
- [x] Permissions-Policy: camera=(), microphone=(), geolocation=()
- [x] Content-Security-Policy implemented
- [x] CORS restricted to known origins
- [ ] HTTP → HTTPS redirect (deployment-level, not app-level)
- [x] Removed HTTP image pattern (was allowing `http://**`)

## Authentication & Authorization
- [x] Session-based auth with httpOnly cookies
- [x] Session rotation on auth state changes
- [x] Refresh token mechanism
- [x] CSRF protection (double-submit cookie pattern)
- [x] withAuth middleware for consistent auth checking
- [x] Role-based access control (Admin/Staff)
- [x] Permission-based access control (module.action granularity)
- [x] Suspicious login detection (IP, device, timing)
- [x] Account lockout after failed attempts
- [ ] Password complexity enforcement at API level (org-level policy exists)
- [ ] Session timeout configuration

## Input Security
- [x] Zod validation schemas for all new modules
- [x] MongoDB operator injection sanitizer (`sanitizeMongoInput`)
- [x] withValidation middleware for automated schema enforcement
- [x] HTML entity encoding utility (`escapeHtml`)
- [x] Control character stripping (`stripControlChars`)
- [ ] Request body size limits (need to add to API routes)
- [ ] File upload validation (if applicable)

## Output Security
- [x] Structured error responses (no stack traces in production)
- [x] API envelope pattern hides internal errors
- [x] `withApiRoute` wrapper catches all errors safely
- [x] Error codes instead of raw messages
- [x] Sensitive field stripping from API responses (e.g., passwordHash)

## Rate Limiting
- [x] Tiered rate limiting (auth=10/min, standard=100/min, write=30/min, expensive=5/min)
- [x] Per-user + per-IP identification
- [x] Standard X-RateLimit-* headers
- [x] Retry-After header on 429 responses
- [ ] Redis-backed store for multi-instance deployments

## Dependency Security
- [ ] `npm audit` clean (run manually)
- [ ] License audit
- [ ] No known vulnerable packages
- [ ] Dependabot / Snyk configured

## Logging & Monitoring
- [x] Structured logger (JSON in production)
- [x] Module-tagged log entries
- [x] Request ID tracking (X-Request-ID header)
- [x] Timing logs for API requests
- [x] Audit trail for security-sensitive actions
- [ ] Error alerting (external service needed)
- [ ] Log aggregation setup

## Build Security
- [ ] Remove `ignoreBuildErrors: true` (fix TS errors first)
- [ ] CI/CD pipeline with security checks
- [ ] Pre-commit hooks for secret scanning
- [ ] SAST (Static Application Security Testing)
- [x] Environment variable validation (Zod schema at startup)

## API Security
- [x] API versioning (/api/v1/)
- [x] Health check endpoint (/api/v1/health)
- [x] Readiness probe (/api/v1/readiness)
- [x] Idempotency key support for mutations
- [ ] API key authentication for machine-to-machine
- [ ] Request signing for webhook verification

---

## Score: 33/45 items completed (73%)

### Remaining HIGH priority items:
1. Remove `ignoreBuildErrors: true` (requires fixing all TS errors)
2. Run `npm audit` and fix vulnerabilities
3. Add request body size limits
4. Set up CI/CD with security checks
5. Configure Redis-backed rate limiting for production
