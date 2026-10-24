| Route | Methods | Models / Collections Queried | Tenant Filter Present? | Risk Level | Details / Vulnerability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/ai-assistant/chat` | `POST` | None | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/ai-assistant/status` | `GET` | None | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/ai-assistant/test` | `POST` | None | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/auth/switch-account` | `POST` | users | No | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/billing/share-log` | `POST` | activity, bills, clients | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/billing/[id]` | `GET, PUT, DELETE` | bills, activity | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/client-materials/[id]` | `DELETE` | client_materials | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/clients` | `GET, POST` | clients | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/clients/[id]/materials` | `GET, POST` | client_materials | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/clients/[id]` | `PUT, DELETE` | clients | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/create-order` | `POST` | payments | No | **High** | Authentication present but no tenant/ownerId filter in DB queries |
| `/api/employees` | `GET, POST` | users | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/employees/[id]` | `GET, PUT, DELETE` | users, auditlogs, sessions | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/expenses` | `GET, POST` | expenses | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/expenses/[id]` | `PUT, DELETE` | expenses | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/features` | `GET, POST, PUT, DELETE` | featureflags | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/inventory` | `GET, POST` | inventory | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/inventory/[id]` | `PUT, DELETE` | inventory | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/inventory/[id]/stock` | `PATCH` | inventory | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/invite/accept` | `GET, POST` | invitations, users | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/invoices/auto-generate` | `POST` | orders, clients, company_profiles, users, invoices | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/machines/downtime` | `GET, POST, PATCH` | machineDowntime, machines, machineEvents | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/machines/utilisation` | `GET, POST` | machineEvents, machines | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/notes` | `GET, POST` | notes | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/notes/[id]` | `PUT, DELETE` | notes | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/notifications/read` | `GET, POST` | notification_reads | No | **High** | Authentication present but no tenant/ownerId filter in DB queries |
| `/api/orders/[id]/client-materials` | `GET` | orders | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/orders/[id]` | `PUT, DELETE` | orders, clients | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/payments/[id]` | `DELETE` | payments | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/platform/tenants` | `GET` | inventory, orders, clients, users | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/platform/tenants/[ownerId]/override` | `POST, DELETE` | users | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/production/progress/update` | `GET, POST` | productions, materialConsumption, attendance, users | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/production/templates/[id]` | `DELETE` | material_templates | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/production/[id]/assign-staff` | `PATCH` | productions | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/production/[id]/materials` | `POST` | production_material_usage | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/production/[id]` | `GET, PUT, DELETE` | orders, clients, productions | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/profile/password` | `PUT` | users | No | **High** | Authentication present but no tenant/ownerId filter in DB queries |
| `/api/profile` | `GET, PUT` | users | No | **High** | Authentication present but no tenant/ownerId filter in DB queries |
| `/api/profile/tax` | `GET, PATCH` | companyprofiles, users | No | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/razorpay/create-order` | `ALL` | None | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/razorpay/verify-payment` | `ALL` | None | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/staff/accounts` | `GET, POST, PATCH` | users | No | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/stripe/cancel-subscription` | `POST` | users | No | **High** | Authentication present but no tenant/ownerId filter in DB queries |
| `/api/stripe/create-subscription` | `POST` | users | No | **High** | Authentication present but no tenant/ownerId filter in DB queries |
| `/api/stripe/setup` | `GET, POST` | None | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/stripe/subscription` | `GET` | users | No | **High** | Authentication present but no tenant/ownerId filter in DB queries |
| `/api/team/[userId]/permissions` | `PUT` | users | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/team/[userId]` | `PUT, DELETE` | users | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/user/modules` | `GET, PUT` | user_preferences | No | **High** | Authentication present but no tenant/ownerId filter in DB queries |
| `/api/users/[id]` | `PUT` | users | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/v1/employees` | `ALL` | None | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/v1/employees/[id]` | `ALL` | None | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/v1/health` | `GET` | None | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/v1/inventory/backfill-usage` | `ALL` | inventory | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/v1/metrics` | `GET` | None | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/v1/notifications/templates` | `ALL` | notification_templates | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/v1/notifications/templates/[id]` | `ALL` | None | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/v1/orders/[id]/reconcile-payment` | `ALL` | orders | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/v1/orders/[id]/status` | `ALL` | orders, clients, inventory | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/v1/payments/record` | `POST` | SalesOrder, orders, payments | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/v1/purchase-orders/[id]/record-payment` | `POST` | purchase_orders | Partial (getDataOwnerId imported) | **Medium** | Query uses _id without co-verifying adminId/organizationId in same filter |
| `/api/v1/readiness` | `GET` | None | No | **High** | CRITICAL: No session or authentication check in route handler |
| `/api/verify-payment` | `POST` | payments, users, subscriptions | No | **High** | Authentication present but no tenant/ownerId filter in DB queries |
