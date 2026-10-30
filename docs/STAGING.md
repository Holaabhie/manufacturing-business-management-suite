# Staging & Production Deployment Guide

This document defines the staging deployment process, environment variable configuration, Vercel infrastructure settings, automated health probes, and rollback procedures for the Manufacturing Business Management Suite.

---

## 1. Environment Variables Audit (`process.env.*` vs `.env.example`)

The application enforces strict runtime validation on environment variables via `@/lib/env` and Zod schemas.

### A. Required in Production & Staging
| Variable | Description | Source / Default |
|---|---|---|
| `MONGODB_URI` | Primary MongoDB connection URI (Atlas Replica Set with TLS) | Vercel Env (Encrypted) |
| `MONGODB_DB` | Database name (e.g. `manufacturing_staging` or `manufacturing_prod`) | Vercel Env |
| `NEXT_PUBLIC_APP_URL` | Canonical public URL (e.g. `https://staging.indmanager.com`) | Vercel System / Env |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | 32-byte base64 key for encrypting JWT sessions & cookies | `openssl rand -base64 32` |
| `AUTH_URL` / `NEXTAUTH_URL` | Application root authentication endpoint | Set to `NEXT_PUBLIC_APP_URL` |
| `CRON_SECRET` | Bearer token for triggering authenticated Vercel cron jobs | Secret string |
| `NODE_ENV` | Runtime environment (`production`, `staging`, `development`) | Auto-managed by Vercel |

### B. Optional Service Integrations (Graceful Degradation)
| Category | Variables | Fallback Behavior when Absent |
|---|---|---|
| **AI (Gemini)** | `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | AI Smart Insights / OCR shows disabled placeholder; UI remains fully functional. |
| **Google OAuth** | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google One-Tap & OAuth button hidden; email/password login remains active. |
| **Payments (Razorpay)** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Online checkout disabled; manual offline payment modes (Cash, Bank Transfer, UPI) active. |
| **Payments (Stripe)** | `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe disabled; Razorpay/offline used. |
| **Email (Resend/SMTP)** | `RESEND_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | In-app notification center logs notifications; external emails skipped gracefully. |
| **SMS/WhatsApp (Twilio)** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | WhatsApp link generation (`wa.me`) functions client-side; automated SMS skipped. |

### C. Strictly Prohibited in Staging & Production
| Variable | Risk / Reason |
|---|---|
| `DEV_MODE=true` | Bypasses permission guards and mock-seeds state. Must NEVER be set. |
| `DEV_MOCK_NOTIFICATIONS=true` | Diverts live notification logs to standard output. |
| `ENABLE_LOCAL_OTP_IN_PROD=true` | Uses static mock OTP ("123456"). Hard-fails in production builds if detected. |

---

## 2. Vercel Production & Staging Settings

### A. General Project Configuration
- **Framework Preset**: Next.js (App Router, Turbopack)
- **Node.js Version**: `20.x` (LTS)
- **Root Directory**: `apps/web`
- **Output Directory**: `.next`
- **Build Command**: `pnpm build` or `npm run build`
- **Install Command**: `pnpm install --frozen-lockfile`

### B. Primary Deployment Region
- **Target Region**: `bom1` (Mumbai, India)
- **Rationale**: Optimal latency (<15ms) for domestic Indian MSMEs, Atlas MongoDB clusters hosted in `ap-south-1`, and Indian banking gateways (Razorpay).

### C. Serverless Function Specifications
Configure in `apps/web/vercel.json` or Project Settings:
```json
{
  "functions": {
    "src/app/api/**/*": {
      "memory": 1024,
      "maxDuration": 15
    },
    "src/app/api/invoices/*/pdf/route.ts": {
      "memory": 2048,
      "maxDuration": 60
    },
    "src/app/api/tally/export/route.ts": {
      "memory": 1024,
      "maxDuration": 45
    }
  }
}
```

### D. Scheduled Cron Jobs
Vercel Cron endpoints require `Authorization: Bearer <CRON_SECRET>`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-expired-sessions",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/purge-idempotency-keys",
      "schedule": "0 3 * * *"
    }
  ]
}
```

---

## 3. Automated Health Probe (`GET /api/v1/health` & `GET /api/health`)

Used by uptime monitors (UptimeRobot, BetterUptime, AWS Route53 Health Checks, Vercel Deployment Checks).

### A. Endpoint Specification
- **Route**: `GET /api/health` (alias to `GET /api/v1/health`)
- **Authentication**: Public (no session required)
- **Caching**: `Cache-Control: no-cache, no-store, must-revalidate` (`dynamic = "force-dynamic"`)

### B. Response Structure
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 12845.2,
  "timestamp": "2026-10-30T17:30:00.000Z",
  "checks": {
    "database": {
      "status": "up",
      "latencyMs": 8
    },
    "memory": {
      "status": "ok",
      "usedMB": 142,
      "totalMB": 384,
      "percentage": 37
    }
  }
}
```

### C. HTTP Status Codes
- `200 OK`: Database ping succeeds and memory heap is under 90%.
- `503 Service Unavailable`: Database ping fails or database is unreachable. Overall status: `unhealthy`.

---

## 4. Tagged Rollback Procedures

If an issue is detected during staging verification or immediate post-deployment canary testing:

### Option 1: Instant Vercel Edge Rollback (Zero Rebuild Required)
1. Open **Vercel Dashboard** → Project **IND-Manager** → **Deployments**.
2. Identify the previous stable deployment (e.g. `pre-cleanup-c2` or tagged production hash).
3. Click the **•••** menu next to the target deployment and select **Instant Rollback**.
4. Traffic routes to the previous serverless bundle within <3 seconds.

### Option 2: Git Tag Checkout & Redeploy
1. Fetch release tags:
   ```bash
   git fetch --tags origin
   ```
2. Check out the verified release tag:
   ```bash
   git checkout tags/pre-cleanup-c2 -b hotfix/rollback-incident
   ```
3. Push to `main` or trigger a targeted Vercel deployment:
   ```bash
   vercel --prod
   ```

### Database Safety During Rollback
- All Phase 3b and Phase 4 database indexes are strictly **additive** and non-breaking (`{ background: true }` / non-sparse).
- All new API models and endpoints support legacy fallback envelopes (`buildTruncatedEnvelope` with 500-item caps).
- Rolling back the Next.js bundle requires **zero** MongoDB rollbacks or destructive schema migrations.
