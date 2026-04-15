# Production Workflow — Relational System Implementation Plan

> Generated: 2026-02-16  
> Status: Ready for implementation  
> Scope: Full relational production workflow replacing disconnected MongoDB collections  

---

## Current State Analysis

| Layer         | Current                                         | Problem                                       |
|---------------|-------------------------------------------------|-----------------------------------------------|
| **Database**  | MongoDB (schemaless collections)                | No FK constraints, no joins, no referential integrity |
| **Auth**      | NextAuth + custom session (MongoDB)             | Works fine — keep as-is                       |
| **Orders**    | Flat document: `{ product_name, quantity, client_id }` | Single product per order, no relational items |
| **Production**| Flat doc with embedded `materials`, `activityLog` | Not linked to order items or stages           |
| **Progress**  | Separate `productionProgress` collection        | No stage tracking, no pending quantity calc   |
| **Clients**   | Simple docs, no GST/contact structure           | Missing GST, proper address fields            |
| **Products**  | ❌ Don't exist as a separate entity              | Materials embedded in production records      |
| **Stages**    | ❌ Don't exist                                   | No stage pipeline concept                     |

### Decision: MongoDB stays as the database engine

> **Important**: The existing app uses MongoDB everywhere — auth, sessions, all API routes, 
> the NextAuth adapter, and ~15+ API route files. Migrating to PostgreSQL would require 
> rewriting the entire auth system, every API route, and the session management layer.
>
> **Instead**, we will implement **proper relational patterns within MongoDB** using:  
> - Referenced documents (foreign keys via ObjectId)  
> - Application-level referential integrity enforcement  
> - MongoDB transactions (multi-document ACID since v4.0)  
> - Aggregation pipelines with `$lookup` for joins  
> - Validation schemas on collections  
>
> This gives us the same relational guarantees while preserving the existing auth, 
> session, and UI infrastructure.

---

## 1️⃣ ER DIAGRAM (Text-Based)

```
┌──────────────┐       ┌──────────────────┐       ┌───────────────────┐
│    USERS     │       │     CLIENTS      │       │    PRODUCTS       │
├──────────────┤       ├──────────────────┤       ├───────────────────┤
│ _id (PK)     │──┐    │ _id (PK)         │       │ _id (PK)          │
│ name         │  │    │ client_name      │       │ product_name      │
│ email        │  │    │ gst_number       │       │ sku_code          │
│ passwordHash │  │    │ address          │       │ unit_type         │
│ role         │  ├───▶│ contact_number   │       │ base_cost         │
│ created_at   │  │    │ email            │       │ created_by (FK) ──┤──▶ USERS._id
│              │  │    │ created_by (FK)──┤──▶    │ created_at        │
└──────────────┘  │    └──────────────────┘       └───────────────────┘
                  │                                        ▲
                  │    ┌──────────────────┐                │
                  │    │     ORDERS       │                │
                  │    ├──────────────────┤                │
                  │    │ _id (PK)         │                │
                  ├───▶│ order_number     │                │
                  │    │ client_id (FK) ──┤──▶ CLIENTS._id │
                  │    │ order_date       │                │
                  │    │ delivery_date    │                │
                  │    │ status           │                │
                  │    │ created_by (FK)──┤──▶ USERS._id   │
                  │    └────────┬─────────┘                │
                  │             │ 1:N                      │
                  │    ┌────────▼─────────┐                │
                  │    │  ORDER_ITEMS     │                │
                  │    ├──────────────────┤                │
                  │    │ _id (PK)         │                │
                  │    │ order_id (FK) ───┤──▶ ORDERS._id  │
                  │    │ product_id (FK)──┤──▶ PRODUCTS._id│
                  │    │ quantity         │                
                  │    │ rate             │
                  │    │ total            │
                  │    └────────┬─────────┘
                  │             │ 1:N
                  │    ┌────────▼──────────────┐
                  │    │ PRODUCTION_PROGRESS   │    ┌───────────────────┐
                  │    ├───────────────────────┤    │PRODUCTION_STAGES  │
                  │    │ _id (PK)              │    ├───────────────────┤
                  │    │ order_item_id (FK) ───┤    │ _id (PK)          │
                  │    │ stage_id (FK) ────────┤──▶ │ stage_name        │
                  │    │ completed_quantity    │    │ machine_name      │
                  │    │ pending_quantity      │    │ stage_order       │
                  │    │ notes                 │    │ created_by (FK)   │
                  │    │ updated_by (FK) ──────┤──▶ USERS._id
                  │    │ updated_at            │    └───────────────────┘
                  │    └───────────────────────┘
                  │
                  │    ┌───────────────────┐
                  │    │   AUDIT_LOGS      │
                  │    ├───────────────────┤
                  └───▶│ _id (PK)          │
                       │ entity_type       │
                       │ entity_id         │
                       │ action            │
                       │ changes           │
                       │ performed_by (FK) │
                       │ timestamp         │
                       └───────────────────┘
```

---

## 2️⃣ FULL DB SCHEMA (MongoDB Collections with Validation)

### Collection: `users` (existing — add `role` enum extension)
```js
{
  _id: ObjectId / String,
  email: String (unique),
  fullName: String,
  passwordHash: String,
  role: "Admin" | "Staff" | "Supervisor",  // ← Add "Supervisor"
  organizationId: String,
  status: "active" | "inactive" | "suspended",
  created_at: Date,
  updated_at: Date
}
```

### Collection: `clients` (upgrade existing)
```js
{
  _id: ObjectId,
  client_name: String (required),
  gst_number: String,
  address: String,
  contact_number: String,
  email: String,
  organizationId: String (required),  // tenant isolation
  created_by: String (FK → users._id),
  created_at: Date,
  updated_at: Date
}
// Index: { organizationId: 1, client_name: 1 }
```

### Collection: `products` (NEW)
```js
{
  _id: ObjectId,
  product_name: String (required),
  sku_code: String (unique within org),
  unit_type: String ("pcs" | "kg" | "meters" | "liters" | "boxes"),
  base_cost: Number,
  organizationId: String (required),
  created_by: String (FK → users._id),
  created_at: Date,
  updated_at: Date
}
// Index: { organizationId: 1, sku_code: 1 } (unique)
```

### Collection: `orders` (restructure existing)
```js
{
  _id: ObjectId,
  order_number: String (auto: "ORD-2026-0001"),
  client_id: String (FK → clients._id, required),
  order_date: Date,
  delivery_date: Date,
  status: "pending" | "in_production" | "completed" | "dispatched",
  total_amount: Number (computed from items),
  progress_percent: Number (0–100, computed),
  organizationId: String (required),
  created_by: String (FK → users._id),
  created_at: Date,
  updated_at: Date
}
// Index: { organizationId: 1, status: 1 }
// Index: { organizationId: 1, order_number: 1 } (unique)
```

### Collection: `order_items` (NEW)
```js
{
  _id: ObjectId,
  order_id: String (FK → orders._id, required),
  product_id: String (FK → products._id, required),
  quantity: Number (required, > 0),
  rate: Number (required),
  total: Number (quantity × rate),
  completed_quantity: Number (default 0, computed from progress),
  pending_quantity: Number (computed: quantity - completed_quantity),
  organizationId: String (required),
  created_at: Date
}
// Index: { order_id: 1 }
// Index: { product_id: 1 }
```

### Collection: `production_stages` (NEW)
```js
{
  _id: ObjectId,
  stage_name: String (required),
  machine_name: String,
  stage_order: Number (for sequencing: 1=Cutting, 2=Printing, 3=Packing),
  organizationId: String (required),
  created_by: String (FK → users._id),
  created_at: Date
}
// Index: { organizationId: 1, stage_order: 1 }
```

### Collection: `production_progress` (restructure existing)
```js
{
  _id: ObjectId,
  order_item_id: String (FK → order_items._id, required),
  stage_id: String (FK → production_stages._id, required),
  completed_quantity: Number (required, ≥ 0),
  notes: String,
  organizationId: String (required),
  updated_by: String (FK → users._id, required),
  updated_at: Date
}
// Index: { order_item_id: 1, stage_id: 1 }
// Index: { updated_by: 1 }
```

### Collection: `audit_logs` (NEW)
```js
{
  _id: ObjectId,
  entity_type: "order" | "order_item" | "production_progress" | "client" | "product",
  entity_id: String,
  action: "create" | "update" | "delete" | "status_change",
  changes: Object,        // { field: { old: X, new: Y } }
  performed_by: String (FK → users._id),
  performed_by_name: String,
  performed_by_role: String,
  organizationId: String,
  timestamp: Date
}
// Index: { entity_type: 1, entity_id: 1 }
// Index: { organizationId: 1, timestamp: -1 }
```

---

## 3️⃣ BACKEND API ROUTES STRUCTURE

```
apps/web/src/app/api/
├── auth/                          # Existing — no changes
│   ├── login/route.ts
│   ├── register/route.ts
│   ├── logout/route.ts
│   └── me/route.ts
│
├── products/                      # NEW
│   ├── route.ts                   # GET (list) + POST (create)
│   └── [id]/route.ts              # GET + PUT + DELETE
│
├── clients/                       # UPGRADE
│   ├── route.ts                   # GET (list) + POST (create) — add GST fields
│   └── [id]/
│       ├── route.ts               # GET + PUT + DELETE
│       └── orders/route.ts        # GET — client order history
│
├── orders/                        # RESTRUCTURE
│   ├── route.ts                   # GET (list with filters) + POST (create with items)
│   └── [id]/
│       ├── route.ts               # GET (full detail) + PUT (update status) + DELETE
│       ├── items/route.ts         # GET items + POST add item
│       ├── progress/route.ts      # GET production progress summary
│       └── timeline/route.ts      # GET order timeline events
│
├── production-stages/             # NEW
│   ├── route.ts                   # GET + POST
│   └── [id]/route.ts              # PUT + DELETE
│
├── production/                    # RESTRUCTURE
│   ├── progress/
│   │   └── route.ts               # POST (record progress — transactional)
│   └── dashboard/
│       ├── admin/route.ts         # GET admin production dashboard stats
│       └── staff/route.ts         # GET staff dashboard stats
│
├── reports/                       # NEW
│   ├── machine-utilization/route.ts
│   ├── production-export/route.ts # PDF/Excel export
│   └── efficiency/route.ts
│
├── audit-logs/                    # NEW
│   └── route.ts                   # GET (with filters)
│
└── dashboard/                     # UPGRADE
    ├── stats/route.ts             # Enhanced with production metrics
    ├── recent-orders/route.ts
    ├── activity/route.ts
    ├── low-stock/route.ts
    └── revenue-chart/route.ts
```

---

## 4️⃣ FRONTEND PAGE STRUCTURE

```
apps/web/src/app/
├── dashboard/
│   ├── page.tsx                   # UPGRADE — Admin dashboard with production KPIs
│   ├── layout.tsx                 # UPGRADE — Add Supervisor role, nav updates
│   │
│   ├── orders/
│   │   ├── page.tsx               # RESTRUCTURE — Order list with status, progress bars
│   │   ├── create/page.tsx        # NEW — Multi-step: select client → add products → review
│   │   └── [id]/
│   │       └── page.tsx           # NEW — Order detail: items, progress per stage, timeline
│   │
│   ├── production/
│   │   ├── page.tsx               # RESTRUCTURE — Production overview grid
│   │   ├── stages/page.tsx        # NEW — Manage production stages
│   │   └── [id]/page.tsx          # RESTRUCTURE — Production detail + progress log
│   │
│   ├── products/
│   │   └── page.tsx               # NEW — Products/materials CRUD
│   │
│   ├── clients/
│   │   ├── page.tsx               # UPGRADE — Add GST, order history link
│   │   └── [id]/page.tsx          # NEW — Client detail + order history
│   │
│   ├── reports/
│   │   ├── page.tsx               # NEW — Reports hub
│   │   ├── efficiency/page.tsx    # NEW — Production efficiency
│   │   └── machines/page.tsx      # NEW — Machine utilization
│   │
│   └── audit/page.tsx             # NEW — Audit log viewer (Admin only)
│
├── staff/
│   ├── login/page.tsx             # Existing
│   ├── dashboard/page.tsx         # NEW — Staff dashboard (mobile-first)
│   └── update-progress/
│       └── page.tsx               # NEW — Select order → product → stage → enter qty
```

---

## 5️⃣ PRODUCTION UPDATE LOGIC

### Staff Progress Entry Flow

```
1. Staff opens /staff/update-progress
2. UI loads: orders assigned to staff (or all org orders for now)
   → GET /api/orders?status=in_production

3. Staff selects an order → UI loads order items
   → GET /api/orders/{orderId}/items

4. Staff selects an order item (product) → UI loads stages
   → GET /api/production-stages

5. Staff enters completed_quantity for the stage
   → POST /api/production/progress
```

### POST /api/production/progress — Request Body
```json
{
  "order_item_id": "abc123",
  "stage_id": "stage456",
  "completed_quantity": 50,
  "notes": "Batch completed without defects"
}
```

### Server-side Logic (Pseudocode)
```typescript
async function recordProgress(body, user) {
  // 1. Validate inputs
  const orderItem = await db.order_items.findOne({ _id: body.order_item_id });
  if (!orderItem) throw NotFound("Order item not found");
  
  const stage = await db.production_stages.findOne({ _id: body.stage_id });
  if (!stage) throw NotFound("Stage not found");
  
  // 2. Check quantity constraints
  const existingProgress = await db.production_progress
    .aggregate([
      { $match: { order_item_id: body.order_item_id } },
      { $group: { _id: null, total: { $sum: "$completed_quantity" } } }
    ]);
  
  const totalCompleted = (existingProgress[0]?.total || 0) + body.completed_quantity;
  
  if (totalCompleted > orderItem.quantity) {
    throw BadRequest(
      `Cannot exceed ordered quantity. ` +
      `Ordered: ${orderItem.quantity}, Already done: ${existingProgress[0]?.total || 0}, ` +
      `Trying to add: ${body.completed_quantity}`
    );
  }
  
  // 3. Start transaction
  const session = client.startSession();
  await session.withTransaction(async () => {
    // Insert progress record
    await db.production_progress.insertOne({
      order_item_id: body.order_item_id,
      stage_id: body.stage_id,
      completed_quantity: body.completed_quantity,
      notes: body.notes,
      updated_by: user._id,
      updated_at: new Date(),
      organizationId: user.organizationId
    }, { session });
    
    // Update order_item totals
    await db.order_items.updateOne(
      { _id: body.order_item_id },
      { $set: {
        completed_quantity: totalCompleted,
        pending_quantity: orderItem.quantity - totalCompleted
      }},
      { session }
    );
    
    // Recalculate order status
    await recalculateOrderStatus(orderItem.order_id, session);
    
    // Write audit log
    await db.audit_logs.insertOne({
      entity_type: "production_progress",
      entity_id: body.order_item_id,
      action: "update",
      changes: {
        completed_quantity: { added: body.completed_quantity, total: totalCompleted },
        stage: stage.stage_name
      },
      performed_by: user._id,
      performed_by_name: user.fullName,
      performed_by_role: user.role,
      organizationId: user.organizationId,
      timestamp: new Date()
    }, { session });
  });
  
  session.endSession();
}
```

---

## 6️⃣ AUTO STATUS UPDATE LOGIC

```typescript
async function recalculateOrderStatus(orderId: string, session?: ClientSession) {
  const db = await getDb();
  
  // Get all items for this order
  const items = await db.collection("order_items")
    .find({ order_id: orderId })
    .toArray();
  
  if (items.length === 0) return;
  
  // Calculate overall progress
  let totalOrdered = 0;
  let totalCompleted = 0;
  
  for (const item of items) {
    totalOrdered += item.quantity;
    totalCompleted += item.completed_quantity || 0;
  }
  
  const progressPercent = totalOrdered > 0
    ? Math.round((totalCompleted / totalOrdered) * 100)
    : 0;
  
  // Determine status
  let newStatus: string;
  if (progressPercent === 0) {
    newStatus = "pending";
  } else if (progressPercent >= 100) {
    newStatus = "completed";
  } else {
    newStatus = "in_production";
  }
  
  // Update order
  const updateOp = {
    $set: {
      status: newStatus,
      progress_percent: progressPercent,
      updated_at: new Date(),
      ...(newStatus === "completed" ? { completed_at: new Date() } : {})
    }
  };
  
  if (session) {
    await db.collection("orders").updateOne({ _id: orderId }, updateOp, { session });
  } else {
    await db.collection("orders").updateOne({ _id: orderId }, updateOp);
  }
}
```

### Status Rules:
| Progress % | Status          | Trigger                                  |
|------------|-----------------|------------------------------------------|
| 0%         | `pending`       | Order created, no progress yet           |
| 1–99%      | `in_production` | At least one progress entry recorded     |
| 100%       | `completed`     | All items fully completed across stages  |
| Manual     | `dispatched`    | Admin manually sets after shipping       |

---

## 7️⃣ TRANSACTION-SAFE UPDATE CODE

```typescript
// apps/web/src/lib/production-service.ts

import { getDb, mongoClientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export class ProductionService {
  
  static async recordProgress(input: {
    orderItemId: string;
    stageId: string;
    completedQuantity: number;
    notes?: string;
    userId: string;
    userName: string;
    userRole: string;
    organizationId: string;
  }) {
    const client = await mongoClientPromise;
    const session = client.startSession();
    
    try {
      let result: any;
      
      await session.withTransaction(async () => {
        const db = client.db(process.env.MONGODB_DB ?? "ind_manager");
        
        // 1. Validate order item exists and belongs to org
        const orderItem = await db.collection("order_items").findOne(
          { _id: new ObjectId(input.orderItemId), organizationId: input.organizationId },
          { session }
        );
        if (!orderItem) throw new Error("Order item not found");
        
        // 2. Validate stage exists
        const stage = await db.collection("production_stages").findOne(
          { _id: new ObjectId(input.stageId), organizationId: input.organizationId },
          { session }
        );
        if (!stage) throw new Error("Production stage not found");
        
        // 3. Calculate totals — prevent exceeding ordered quantity
        const pipeline = [
          { $match: { order_item_id: input.orderItemId } },
          { $group: { _id: null, total: { $sum: "$completed_quantity" } } }
        ];
        const agg = await db.collection("production_progress")
          .aggregate(pipeline, { session }).toArray();
        
        const previouslyCompleted = agg[0]?.total || 0;
        const newTotal = previouslyCompleted + input.completedQuantity;
        
        if (newTotal > orderItem.quantity) {
          throw new Error(
            `Production cannot exceed ordered quantity. ` +
            `Ordered: ${orderItem.quantity}, Done: ${previouslyCompleted}, ` +
            `Attempting: ${input.completedQuantity}`
          );
        }
        
        // 4. Insert progress record
        const progressDoc = {
          order_item_id: input.orderItemId,
          stage_id: input.stageId,
          completed_quantity: input.completedQuantity,
          notes: input.notes || "",
          organizationId: input.organizationId,
          updated_by: input.userId,
          updated_at: new Date(),
        };
        
        const insertResult = await db.collection("production_progress")
          .insertOne(progressDoc, { session });
        
        // 5. Update order_item completed/pending quantities
        await db.collection("order_items").updateOne(
          { _id: new ObjectId(input.orderItemId) },
          {
            $set: {
              completed_quantity: newTotal,
              pending_quantity: orderItem.quantity - newTotal,
            },
          },
          { session }
        );
        
        // 6. Recalculate order status (within the same transaction)
        const allItems = await db.collection("order_items")
          .find({ order_id: orderItem.order_id }, { session })
          .toArray();
        
        let totalOrdered = 0;
        let totalDone = 0;
        for (const item of allItems) {
          totalOrdered += item.quantity;
          // Use the newly updated value for the current item
          totalDone += item._id.toString() === input.orderItemId
            ? newTotal
            : (item.completed_quantity || 0);
        }
        
        const progressPercent = totalOrdered > 0
          ? Math.round((totalDone / totalOrdered) * 100) : 0;
        
        let newStatus = "pending";
        if (progressPercent >= 100) newStatus = "completed";
        else if (progressPercent > 0) newStatus = "in_production";
        
        await db.collection("orders").updateOne(
          { _id: new ObjectId(orderItem.order_id) },
          {
            $set: {
              status: newStatus,
              progress_percent: progressPercent,
              updated_at: new Date(),
              ...(newStatus === "completed" ? { completed_at: new Date() } : {}),
            },
          },
          { session }
        );
        
        // 7. Audit log
        await db.collection("audit_logs").insertOne({
          entity_type: "production_progress",
          entity_id: input.orderItemId,
          action: "update",
          changes: {
            completed_quantity: { added: input.completedQuantity, total: newTotal },
            stage: stage.stage_name,
            order_progress: `${progressPercent}%`,
            order_status: newStatus,
          },
          performed_by: input.userId,
          performed_by_name: input.userName,
          performed_by_role: input.userRole,
          organizationId: input.organizationId,
          timestamp: new Date(),
        }, { session });
        
        result = {
          progressId: insertResult.insertedId.toString(),
          completedQuantity: newTotal,
          pendingQuantity: orderItem.quantity - newTotal,
          orderProgressPercent: progressPercent,
          orderStatus: newStatus,
        };
      });
      
      return result;
      
    } finally {
      await session.endSession();
    }
  }
}
```

---

## 8️⃣ FOLDER ARCHITECTURE

```
apps/web/src/
├── app/
│   ├── api/
│   │   ├── auth/                   # Existing (no changes)
│   │   ├── products/               # NEW — CRUD
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── clients/                # UPGRADE — add GST, order history
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── orders/route.ts
│   │   ├── orders/                 # RESTRUCTURE — relational items
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── items/route.ts
│   │   │       ├── progress/route.ts
│   │   │       └── timeline/route.ts
│   │   ├── production-stages/      # NEW
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── production/             # RESTRUCTURE
│   │   │   ├── progress/route.ts
│   │   │   └── dashboard/
│   │   │       ├── admin/route.ts
│   │   │       └── staff/route.ts
│   │   ├── reports/                # NEW
│   │   │   ├── machine-utilization/route.ts
│   │   │   ├── production-export/route.ts
│   │   │   └── efficiency/route.ts
│   │   ├── audit-logs/route.ts     # NEW
│   │   └── dashboard/              # UPGRADE
│   │       ├── stats/route.ts
│   │       └── ...
│   │
│   ├── dashboard/
│   │   ├── page.tsx                # UPGRADE
│   │   ├── layout.tsx              # UPGRADE (add Supervisor role)
│   │   ├── orders/
│   │   │   ├── page.tsx            # RESTRUCTURE
│   │   │   ├── create/page.tsx     # NEW
│   │   │   └── [id]/page.tsx       # NEW
│   │   ├── production/
│   │   │   ├── page.tsx            # RESTRUCTURE
│   │   │   ├── stages/page.tsx     # NEW
│   │   │   └── [id]/page.tsx       # RESTRUCTURE
│   │   ├── products/page.tsx       # NEW
│   │   ├── clients/
│   │   │   ├── page.tsx            # UPGRADE
│   │   │   └── [id]/page.tsx       # NEW
│   │   ├── reports/                # NEW
│   │   │   ├── page.tsx
│   │   │   ├── efficiency/page.tsx
│   │   │   └── machines/page.tsx
│   │   └── audit/page.tsx          # NEW
│   │
│   └── staff/
│       ├── dashboard/page.tsx      # NEW
│       └── update-progress/page.tsx # NEW
│
├── lib/
│   ├── mongodb.ts                  # Existing
│   ├── auth-session.ts             # Existing
│   ├── production-service.ts       # NEW — Transaction-safe business logic
│   ├── order-service.ts            # NEW — Order creation with items
│   ├── audit-service.ts            # NEW — Audit log helper
│   ├── validators.ts               # NEW — Zod schemas for validation
│   ├── db-indexes.ts               # NEW — Collection index definitions
│   └── role-permissions.ts         # UPGRADE — Add Supervisor role
│
└── components/
    ├── production/
    │   ├── ProgressEntryForm.tsx    # NEW
    │   ├── StageProgressBar.tsx     # NEW
    │   └── OrderTimeline.tsx        # NEW
    ├── orders/
    │   ├── OrderCreateWizard.tsx    # NEW
    │   ├── OrderItemsTable.tsx      # NEW
    │   └── OrderStatusBadge.tsx     # NEW
    └── reports/
        ├── EfficiencyChart.tsx      # NEW
        └── MachineUtilization.tsx   # NEW
```

---

## 9️⃣ PERMISSIONS MATRIX

| Action                        | Admin | Supervisor | Staff |
|-------------------------------|-------|------------|-------|
| Create Client                 | ✅    | ❌         | ❌    |
| Create Product                | ✅    | ❌         | ❌    |
| Create Order                  | ✅    | ❌         | ❌    |
| Add Items to Order            | ✅    | ❌         | ❌    |
| Create Production Stage       | ✅    | ❌         | ❌    |
| Update Production Progress    | ✅    | ❌         | ✅    |
| View Reports                  | ✅    | ✅         | ❌    |
| View Production Dashboard     | ✅    | ✅         | ✅*   |
| View Audit Logs               | ✅    | ❌         | ❌    |
| Export Reports (PDF/Excel)    | ✅    | ✅         | ❌    |
| Change Order Status           | ✅    | ❌         | ❌    |
| View All Orders               | ✅    | ✅         | ✅*   |

*Staff sees only orders relevant to their scope

---

## 🔟 IMPLEMENTATION PHASES

### Phase 1: Database Foundation (files: 4–5)
- [ ] Create `production-service.ts` with transaction logic
- [ ] Create `order-service.ts` for order creation
- [ ] Create `validators.ts` with Zod schemas
- [ ] Create `db-indexes.ts` + setup script
- [ ] Update `role-permissions.ts` for Supervisor role

### Phase 2: API Routes — Products & Stages (files: 4)
- [ ] `api/products/route.ts` + `api/products/[id]/route.ts`
- [ ] `api/production-stages/route.ts` + `api/production-stages/[id]/route.ts`

### Phase 3: API Routes — Orders Restructure (files: 5)
- [ ] `api/orders/route.ts` — rewrite with items support
- [ ] `api/orders/[id]/route.ts` — full detail with lookups
- [ ] `api/orders/[id]/items/route.ts`
- [ ] `api/orders/[id]/progress/route.ts`
- [ ] `api/orders/[id]/timeline/route.ts`

### Phase 4: API Routes — Production Progress (files: 3)
- [ ] `api/production/progress/route.ts` — transactional update
- [ ] `api/production/dashboard/admin/route.ts`
- [ ] `api/production/dashboard/staff/route.ts`

### Phase 5: Frontend — Admin Pages (files: 8)
- [ ] Products management page
- [ ] Production stages page
- [ ] Order create wizard (multi-step)
- [ ] Order detail page with progress
- [ ] Client detail with order history
- [ ] Enhanced admin dashboard with production KPIs
- [ ] Reports pages (efficiency, machines)
- [ ] Audit log page

### Phase 6: Frontend — Staff Experience (files: 3)
- [ ] Staff dashboard (mobile-first)
- [ ] Progress entry form (select order → product → stage → qty)
- [ ] Staff navigation updates

### Phase 7: Reports & Polish (files: 4)
- [ ] `api/reports/*` routes
- [ ] PDF/Excel export for production reports
- [ ] Machine utilization report
- [ ] `api/audit-logs/route.ts`

---

## ESTIMATED SCOPE
- **New files**: ~35
- **Modified files**: ~12
- **Total API routes**: 18 new + 5 upgraded
- **Total pages**: 10 new + 5 upgraded

---

**Ready to begin Phase 1?** I'll start with the database foundation: services, validators, indexes, and the Supervisor role update.
