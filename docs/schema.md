# IND Manager — MongoDB Collections Schema

> **Database:** `ind_manager` (configured via `MONGODB_DB` env var)
> **Driver:** MongoDB Node.js Driver (raw `getDb()`) — no Mongoose schemas for these collections
> **Last updated:** 2026-04-29

---

## Table of Contents

1. [Users](#1-users)
2. [Businesses](#2-businesses)
3. [Sessions](#3-sessions)
4. [OTP Tokens](#4-otp_tokens)
5. [Audit Logs](#5-audit_logs)
6. [Relationships Diagram](#6-relationships)

---

## 1. Users

**Collection:** `users`

Stores all user accounts. Each user belongs to exactly one business.
Roles determine access levels; `customPermissions` can override defaults.

```jsonc
{
  "_id": "ObjectId",
  "name": "string",                        // Full display name
  "email": "string",                       // UNIQUE — primary login identifier
  "phone": "string | null",               // Indian mobile (+91XXXXXXXXXX), optional
  "passwordHash": "string | null",        // bcrypt hash; null for OAuth-only users
  "googleId": "string | null",            // Google OAuth subject ID
  "avatar": "string | null",              // URL to profile image
  "businessId": "ObjectId",               // FK → businesses._id
  "role": "owner | manager | staff | accountant",
  "customPermissions": {                  // Granular overrides
    "invoices.create": true,
    "inventory.delete": false
    // ... any permission key
  },
  "isActive": "boolean",                  // Soft-disable without deleting
  "lastLoginAt": "Date | null",
  "lastActiveAt": "Date | null",
  "rememberMe": "boolean",               // Extended session TTL
  "deviceTokens": ["string"],            // FCM/APNs push tokens
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Indexes:**

| Fields | Type | Notes |
|--------|------|-------|
| `email` | Unique | Primary lookup for auth |
| `businessId` | Regular | List users per business |
| `googleId` | Sparse, Unique | OAuth lookup |
| `role, businessId` | Compound | Role-filtered queries |

---

## 2. Businesses

**Collection:** `businesses`

One record per organization. Created when the first user (owner) signs up.
Contains all India-specific compliance fields (GSTIN, PAN, state codes).

```jsonc
{
  "_id": "ObjectId",
  "name": "string",                        // Business / company name
  "gstin": "string",                       // 15-char GSTIN (validated)
  "pan": "string",                         // 10-char PAN (validated)
  "address": {
    "line1": "string",
    "line2": "string | null",
    "city": "string",
    "state": "string",                     // Full state name
    "stateCode": "string",                // 2-digit code (e.g. "27" for Maharashtra)
    "pincode": "string",                  // 6-digit Indian PIN
    "country": "string"                   // Default: "India"
  },
  "phone": "string",
  "email": "string",
  "logo": "string | null",                // URL to business logo
  "bankDetails": {
    "bankName": "string",
    "accountNo": "string",
    "ifsc": "string",                     // 11-char IFSC code
    "branch": "string"
  },
  "invoiceSettings": {
    "prefix": "string",                   // e.g. "INV-"
    "nextNumber": "number",               // Auto-incrementing
    "termsAndConditions": "string",
    "defaultDueDays": "number"            // e.g. 30
  },
  "gstSettings": {
    "registrationType": "regular | composition | unregistered",
    "defaultGstRate": "number"            // e.g. 18
  },
  "subscriptionPlan": "free | starter | pro | enterprise",
  "subscriptionExpiry": "Date | null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Indexes:**

| Fields | Type | Notes |
|--------|------|-------|
| `gstin` | Sparse, Unique | No duplicates for registered businesses |
| `pan` | Sparse, Unique | Tax ID lookup |
| `subscriptionPlan` | Regular | Plan-based queries |

---

## 3. Sessions

**Collection:** `sessions`

Server-side session records. Tokens are hashed before storage.
Supports both standard (24h) and "remember me" (30-day) TTLs.

```jsonc
{
  "_id": "ObjectId",
  "userId": "ObjectId",                    // FK → users._id
  "token": "string",                       // UNIQUE — hashed session token
  "deviceInfo": "string | null",          // User-Agent summary
  "ipAddress": "string | null",
  "expiresAt": "Date",                    // TTL: 24h or 30d
  "rememberMe": "boolean",
  "createdAt": "Date"
}
```

**Indexes:**

| Fields | Type | Notes |
|--------|------|-------|
| `token` | Unique | Token lookup |
| `userId` | Regular | List user sessions |
| `expiresAt` | TTL (0s) | Auto-delete expired sessions |

---

## 4. OTP Tokens

**Collection:** `otp_tokens`

Short-lived OTP records for phone-based authentication.
OTPs are hashed (bcrypt) — never stored in plaintext.
Max 5 attempts before the OTP is invalidated.

```jsonc
{
  "_id": "ObjectId",
  "phone": "string",                       // +91XXXXXXXXXX
  "otp": "string",                         // bcrypt-hashed OTP
  "purpose": "login | verify | reset",
  "attempts": "number",                   // Incremented on each failed verify
  "expiresAt": "Date",                    // 5 minutes from creation
  "createdAt": "Date"
}
```

**Indexes:**

| Fields | Type | Notes |
|--------|------|-------|
| `phone, purpose` | Compound | Lookup latest OTP |
| `expiresAt` | TTL (0s) | Auto-cleanup |

---

## 5. Audit Logs

**Collection:** `audit_logs`

Immutable append-only log of all significant actions.
Used for compliance, debugging, and activity feeds.

```jsonc
{
  "_id": "ObjectId",
  "businessId": "ObjectId",               // FK → businesses._id (data scoping)
  "userId": "ObjectId",                    // FK → users._id (who performed)
  "action": "string",                      // e.g. "ORDER_CREATED", "INVOICE_SENT"
  "entityType": "string",                 // e.g. "order", "invoice", "inventory"
  "entityId": "ObjectId | string",        // ID of affected entity
  "changes": {                            // Before/after snapshot
    "before": {},
    "after": {}
  },
  "ipAddress": "string | null",
  "userAgent": "string | null",
  "createdAt": "Date"
}
```

**Indexes:**

| Fields | Type | Notes |
|--------|------|-------|
| `businessId, createdAt` | Compound (desc) | Timeline queries |
| `entityType, entityId` | Compound | Entity history |
| `userId, createdAt` | Compound | User activity |
| `action` | Regular | Filter by action type |

---

## 6. Relationships

```
┌──────────────┐       ┌──────────────┐
│  businesses  │◄──────│    users     │
│              │  1:N   │              │
└──────┬───────┘       └──────┬───────┘
       │                      │
       │ 1:N                  │ 1:N
       ▼                      ▼
┌──────────────┐       ┌──────────────┐
│ audit_logs   │       │  sessions    │
└──────────────┘       └──────────────┘
                              │
                       ┌──────────────┐
                       │  otp_tokens  │
                       │ (by phone)   │
                       └──────────────┘
```

**Key relationships:**
- `users.businessId` → `businesses._id` (every user belongs to one business)
- `sessions.userId` → `users._id` (multiple sessions per user)
- `audit_logs.businessId` → `businesses._id` (scoped per business)
- `audit_logs.userId` → `users._id` (who performed the action)
- `otp_tokens` are linked by `phone` field (not FK)
