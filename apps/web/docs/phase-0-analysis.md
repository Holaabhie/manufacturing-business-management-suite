# Phase 0: Mandatory System Analysis (IND Manager ERP)

## 1. Authentication System Audit
- **Current Stack**: NextAuth.js configured with Google and Microsoft Entra ID OAuth providers.
- **Session Strategy**: Custom JWT implementation bridging NextAuth with a custom `sessions` MongoDB collection.
- **Data Model**: Uses MongoDB via Mongoose. The `User` model currently handles `Admin` role provisioning out-of-the-box upon first login. It references roles, subscription tiers, and organizations.
- **Status**: The authentication system functions but needs extension to perfectly accommodate rigid ERP-grade Role-Based Access Control (RBAC).

## 2. Complete Database Schema Map
- **Primary Database**: MongoDB (Mongoose).
- **Secondary Configs**: Minimal Prisma/PostgreSQL scaffold (`User` model) in `packages/database`.
- **Current Collections (Models)**: 
  - `User`, `Organization`, `Otp`, `Invitation`, `PermissionTemplate`, `AuditLog`.
- **Domain Mappings**: 
  - Modules exist with minimal definition: `orders`, `inventory`, `billing`, `clients`, `machines`, `production`, `payments`.
  - e.g., `orders/domain/schemas.ts` shows a simplistic implementation missing critical GST, compliance, multiple statuses, and Tally-compatible ledgers.
- **Status**: Massive gap between current "SaaS-lite" scaffold and the targeted "Complete Module Architecture". The ERP requirements define strictly relational tables (or highly structured document schemas) involving transactions, ledger balances, and complex tax compliance (GST) which currently do NOT exist.

## 3. Frontend Architecture Audit
- **Framework**: Next.js 15+ (App Router).
- **Styling**: Tailwind CSS + Shadcn UI (Radix Primitives).
- **Libraries in use**: Framer Motion for animations (`motion`), Lucide & React Icons, React Hook Form + Zod, Recharts, Three.js (3D effects).
- **Structure**: Extensive use of Domain-Driven Design (DDD) structuring (`application`, `domain`, `infrastructure`) per module. 
- **Status**: Highly modern, visually premium framework in place. Capable of achieving the "Wow" factor and the premium UX requirements compared to generic ERP interfaces. The challenge lies in expanding complex data grids and forms within this architecture.

## 4. Current Feature Inventory
### What Works:
- Next.js Auth scaffolding.
- Basic user, organization, and OTP models.
- The fundamental UI design system (Tailwind + Radix).
- Clean DDD architectural separation of modules.

### What's Missing / Broken:
- **Missing**: 95% of ERP functionality. (Company profiles, Tally/Zoho parity, ledger double-entry, complete sales/purchase pipelines, taxation logic, extensive master data for compliance).
- **Broken**: Originally reported "Payment status stuck on Pending" issue in the rudimentary sales/orders module. 
- **Required Shift**: Shifting from a generic schema to an industry-smart defaults system with comprehensive relational integrity.

## 5. Data Volume Assessment
- Currently, the application appears to be in its infancy (scaffolding stage) with a negligible data footprint.
- **Action**: All database modifications will safely implement the "ADDITIVE ONLY" prime directive, expanding existing tables/collections without destructing initial users or structural scaffolding.

## 6. Conclusion & Next Steps
- We are moving from Phase 0 to Phase 1 (Foundation).
- Proceed with Database architecture expansions: creating massive relational footprints (as described in schemas) while preserving the current Mongoose-based data integrity or extending perfectly within the MongoDB schemas using Mongoose to mirror the SQL definitions provided in the roadmap.
