# Enterprise RBAC Implementation Plan
## IND Manager — Manufacturing Business Management Suite

---

## Current State Analysis

### Authentication
- **Login**: Single `/login` page with email+password + Google/Microsoft SSO
- **Sessions**: Cookie-based sessions (`session_id`) stored in MongoDB, 30-day expiry
- **Registration**: Single `/register` endpoint, auto-assigns `Admin` role
- **OTP**: Basic OTP model exists (`models/Otp.ts`) for phone verification
- **Password**: bcrypt hashing, basic forgot/reset flow exists

### Authorization
- **Roles**: Two static roles — `Admin` and `Staff` (hardcoded in User model)
- **Route Protection**: `requireRole()` server function checks role on API routes
- **Frontend Filtering**: `role-permissions.ts` filters navigation by role
- **Granularity**: Page-level only. No action-level (CRUD) permissions
- **No organization scoping** — single-tenant design

### Data Layer
- **Database**: MongoDB (via both native driver and Mongoose)
- **User Model**: `models/User.ts` — has role, subscription_tier, company_details
- **Session Model**: `auth-session.ts` — SessionDoc in `sessions` collection

---

## Implementation Phases (Build Order)

### PHASE 1: Foundation — Organization & Enhanced User Model
**Priority: CRITICAL — All other phases depend on this**

- [ ] 1.1 Create `Organization` model (name, slug, master_key, settings, branding)
- [ ] 1.2 Extend `User` model with organization_id, employee_id, department, permissions[], permission_template_id, status (active/inactive/suspended), failed_login_attempts, locked_until, first_login_completed, invited_by, invitation_status, invitation_expires_at, last_login, otp_delivery_method
- [ ] 1.3 Create `PermissionTemplate` model (name, org_id, permissions object)
- [ ] 1.4 Create `AuditLog` model (timestamp, user_id, org_id, action, module, resource_id, before_state, after_state, ip_address, device_info)
- [ ] 1.5 Create `Invitation` model (org_id, email, phone, employee_id, role, template_id, token, status, expires_at)
- [ ] 1.6 Define granular permissions structure (module.action format)
- [ ] 1.7 Create default permission templates (Full Access, Operations, Sales, View Only)
- [ ] 1.8 Create organization onboarding API (POST /api/organizations)
- [ ] 1.9 Migrate existing users to have organization_id

### PHASE 2: Dual Authentication Gateway
**Priority: HIGH — Security boundary**

- [ ] 2.1 Create `/admin/login` page (email + password + org master key)
- [ ] 2.2 Create `/staff/login` page (employee ID + password + OTP)
- [ ] 2.3 Update login API to handle both flows with separate rate limiting
- [ ] 2.4 Implement failed login tracking (5 attempts → 15min lock for Admin, 30min for Staff)
- [ ] 2.5 Implement OTP flow for Staff (send, verify, resend with limits)
- [ ] 2.6 Update session creation to embed role, org_id, permissions in token
- [ ] 2.7 Create middleware that validates org_id on every request
- [ ] 2.8 Redirect logic: / → detect user type → appropriate login

### PHASE 3: Staff Onboarding & Invitation Flow
**Priority: HIGH — Admin needs to create Staff**

- [ ] 3.1 Create Team Management page (`/dashboard/team`)
- [ ] 3.2 Create invite Staff API (POST /api/team/invite)
- [ ] 3.3 Create invitation acceptance flow (unique link → staff setup)
- [ ] 3.4 Implement first-time setup wizard (password change, OTP setup, profile, terms)
- [ ] 3.5 Create invitation management UI (view, resend, revoke)
- [ ] 3.6 Admin can deactivate Staff (instant session invalidation)

### PHASE 4: Granular Permission System
**Priority: HIGH — Core RBAC engine**

- [ ] 4.1 Build permission checking utilities (hasPermission, usePermissions hook)
- [ ] 4.2 Create `<PermissionGate>` component (visible/disabled/hidden modes)
- [ ] 4.3 Update all API routes with action-level permission checks
- [ ] 4.4 Update all frontend pages to use PermissionGate
- [ ] 4.5 Build Permission Template CRUD UI for Admin
- [ ] 4.6 Build per-user permission override UI
- [ ] 4.7 Update navigation to be permission-driven (not route-list-driven)

### PHASE 5: Session Management & Security
**Priority: MEDIUM-HIGH — Security hardening**

- [ ] 5.1 Implement short-lived access tokens (30 min) + refresh tokens (7 days)
- [ ] 5.2 Add session tracking (device, IP, browser, last active)
- [ ] 5.3 Implement idle timeout (configurable by Admin)
- [ ] 5.4 Single-session enforcement (optional, per org setting)
- [ ] 5.5 Admin session management UI (view/terminate Staff sessions)
- [ ] 5.6 Sensitive action re-authentication modal
- [ ] 5.7 Permission change propagation (refresh on next API call)

### PHASE 6: Audit Trail
**Priority: MEDIUM — Compliance & monitoring**

- [ ] 6.1 Implement audit logging middleware (wraps all API mutations)
- [ ] 6.2 Create Audit Log viewer page for Admin (`/dashboard/audit-log`)
- [ ] 6.3 Add filters (date, user, action, module) and search
- [ ] 6.4 Implement immutable log storage (no delete/update operations)
- [ ] 6.5 Export audit logs as CSV/PDF
- [ ] 6.6 Staff Activity dashboard widget for Admin

### PHASE 7: Admin Dashboard Enhancements
**Priority: MEDIUM — Admin tools**

- [ ] 7.1 Organization Overview panel (Staff count, sessions, logins)
- [ ] 7.2 Quick Actions widget (invite, review, export)
- [ ] 7.3 Team Activity widget (online status, recent actions)
- [ ] 7.4 Organization Settings page (security, notifications, branding)
- [ ] 7.5 Password policy configuration
- [ ] 7.6 Anomaly detection alerts

### PHASE 8: Staff Experience
**Priority: MEDIUM — UX polish**

- [ ] 8.1 Permission-aware dashboard widgets (auto-compose based on permissions)
- [ ] 8.2 Staff self-service profile (view permissions, request access)
- [ ] 8.3 "My Activity" log for Staff
- [ ] 8.4 Personalized dashboard greeting

### PHASE 9: Notifications
**Priority: LOW-MEDIUM — Communication**

- [ ] 9.1 In-app notification system (bell icon, notification center)
- [ ] 9.2 Permission change notifications
- [ ] 9.3 Security event notifications
- [ ] 9.4 Email notification integration (templates, delivery tracking)
- [ ] 9.5 Admin broadcast messages

### PHASE 10: Advanced Data Access
**Priority: LOW — Advanced features**

- [ ] 10.1 Row-level security (department/self scoping)
- [ ] 10.2 Export permission controls
- [ ] 10.3 Export watermarking and limits

### PHASE 11: Error Handling & Edge Cases
**Priority: LOW — Robustness**

- [ ] 11.1 Permission conflict resolution (live permission changes)
- [ ] 11.2 Graceful degradation (fallback to cached permissions)
- [ ] 11.3 Comprehensive error states (Access Denied page, etc.)

---

## Permission Structure Definition

```typescript
// Module.Action granular permissions
interface Permissions {
  orders:     { view: boolean; create: boolean; edit: boolean; delete: boolean; approve: boolean; export: boolean };
  production: { view: boolean; create: boolean; edit: boolean; delete: boolean; export: boolean };
  inventory:  { view: boolean; create: boolean; edit: boolean; delete: boolean; export: boolean };
  clients:    { view: boolean; create: boolean; edit: boolean; delete: boolean; export: boolean };
  finance:    { view: boolean; create: boolean; edit: boolean; delete: boolean; export: boolean };
  assistant:  { view: boolean };
  team:       { view: boolean; create: boolean; edit: boolean; delete: boolean };
  settings:   { view: boolean; edit: boolean };
  audit:      { view: boolean; export: boolean };
}
```

## Files to Create/Modify

### New Files
- `src/models/Organization.ts`
- `src/models/PermissionTemplate.ts`
- `src/models/AuditLog.ts`
- `src/models/Invitation.ts`
- `src/models/Session.ts` (enhanced)
- `src/lib/permissions.ts` (permission engine)
- `src/lib/audit.ts` (audit logging)
- `src/lib/org-context.ts` (organization scoping)
- `src/components/PermissionGate.tsx`
- `src/components/ReAuthModal.tsx`
- `src/app/admin/login/page.tsx`
- `src/app/staff/login/page.tsx`
- `src/app/staff/setup/page.tsx`
- `src/app/dashboard/team/page.tsx`
- `src/app/dashboard/audit-log/page.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/app/api/organizations/route.ts`
- `src/app/api/team/invite/route.ts`
- `src/app/api/team/[id]/route.ts`
- `src/app/api/permissions/templates/route.ts`
- `src/app/api/audit-log/route.ts`
- `src/app/api/sessions/route.ts`

### Modified Files
- `src/models/User.ts` (extended fields)
- `src/lib/auth-session.ts` (org + permission embedding)
- `src/lib/role-permissions.ts` (granular permissions)
- `src/lib/require-role.ts` (permission-based checks)
- `src/lib/hooks/use-role.ts` (→ usePermissions)
- `src/app/dashboard/layout.tsx` (permission-driven nav)
- `src/app/api/auth/login/route.ts` (dual flow)
- `src/app/api/auth/register/route.ts` (org creation)
- `src/app/api/auth/me/route.ts` (include permissions)
- All existing API routes (add permission checks)
- All existing pages (add PermissionGate)
