# ADR-003: Security Hardening Strategy

## Status: Accepted
## Date: 2026-02-18

## Context

Phase 0 baseline identified several 🔴 CRITICAL and 🟡 HIGH security risks:

1. TypeScript errors suppressed (`ignoreBuildErrors: true`)
2. No input validation on most API routes
3. Error responses leak internal details (`error.message` returned to client)
4. No security headers (CSP, HSTS, X-Frame-Options)
5. Console.error scattered everywhere (20+ instances)
6. No API rate limiting on v1 routes
7. Image remote patterns allow ALL hosts (`hostname: '**'`)

## Decision

Implement a multi-layered security hardening approach:

### Layer 1: Transport Security (next.config.ts headers)
- Content Security Policy (CSP)
- Strict-Transport-Security (HSTS)
- X-Frame-Options (clickjacking prevention)
- X-Content-Type-Options (MIME sniffing prevention)
- Referrer-Policy
- Permissions-Policy (restrict browser APIs)

### Layer 2: Input Security (Zod + Sanitizer)
- All API inputs validated via Zod schemas (Phase 1 foundation)
- MongoDB operator injection blocked via `sanitizeMongoInput()`
- Request body size validation

### Layer 3: Output Security (Error Envelope)
- Production never exposes `error.message` or stack traces
- All errors use the `envelope.fromUnknown()` pattern
- Structured error codes instead of raw messages

### Layer 4: Runtime Security (Rate Limiting + Auth)
- v1 routes protected by configurable rate limiters
- API key support for machine-to-machine communication
- Request ID tracking for audit correlation

### Layer 5: Build-time Security
- Remove `ignoreBuildErrors: true` (deferred until TS errors are fixed)
- Restrict image remote patterns to known domains
- Enable strict TypeScript incrementally

## Consequences

### Positive
- Defense-in-depth: 5 layers of protection
- Standards-compliant headers pass security scanners
- Error leakage eliminated
- Rate limiting prevents abuse

### Negative
- CSP may break inline scripts if any exist
- Stricter image domains may require config updates when adding providers
- Rate limiting needs tuning based on actual traffic patterns
