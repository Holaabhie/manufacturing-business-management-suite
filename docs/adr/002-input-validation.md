# ADR-002: Input Validation & Sanitization Strategy

## Status: Accepted
## Date: 2026-02-18

## Context

From Phase 0 baseline:
> **🔴 CRITICAL #2:** No input validation on most API routes — Direct `body.name`, `body.quantity` access without schema validation (XSS, injection risk)

Of ~52 API routes, only 2-3 perform any input validation. The rest access `body.field` directly, accepting any shape of data. This creates:
1. **Injection risk** — Unvalidated strings can contain MongoDB operators (`$gt`, `$regex`)
2. **XSS risk** — Unescaped strings rendered in the UI
3. **Type coercion bugs** — `body.quantity` might be a string, object, or missing entirely
4. **Data corruption** — Unexpected field shapes stored in MongoDB without schema enforcement

## Decision

1. **Every API route MUST validate input with Zod schemas** defined in the module's `domain/schemas.ts`.
2. **The `withApiRoute` wrapper automatically catches Zod/Validation errors** and returns proper 400 responses.
3. **MongoDB operator injection is blocked** by a shared sanitizer that strips `$` prefix keys from untrusted input.
4. **HTML/XSS sanitization** is applied at the output layer (API responses) rather than input — we store clean data, but also escape when rendering.

## Validation Pipeline

```
Client Request
  → API Route Handler
    → Zod Schema.safeParse(body)
      → If invalid: throw ValidationError (caught by withApiRoute → 400)
      → If valid: typed, sanitized data passed to Service
        → Service applies business rules
          → Repository stores validated data
```

## Consequences

### Positive
- Every API input is type-safe after Zod parsing
- Consistent error responses for all validation failures
- Domain schemas serve as living API documentation
- MongoDB injection prevented at input layer

### Negative
- ~50 routes need Zod schemas added (can be done incrementally)
- Slight performance overhead for Zod parsing (negligible — <1ms per request)
