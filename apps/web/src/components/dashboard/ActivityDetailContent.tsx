"use client";

import React from "react";
import {
  ShoppingCart,
  IndianRupee,
  Package,
  Cpu,
  ArrowRight,
  FileText,
  BookOpen,
} from "lucide-react";
import type {
  ActivityItem,
  OrderDetail,
  PaymentDetail,
  InventoryDetail,
  ProductionDetail,
} from "./activity-detail-types";

/* ─── Helpers ────────────────────────────────────────── */
const fmt = (v: number | undefined) =>
  v == null ? "₹0" : `₹${Number(v).toLocaleString("en-IN")}`;

const fmtDate = (d: string | undefined) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const timeAgo = (d: string | undefined) => {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/* ─── Shared Styles ──────────────────────────────────── */
const s = {
  label: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  val: { fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.88)" },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px 24px",
  } as React.CSSProperties,
  section: { padding: "20px 24px" } as React.CSSProperties,
  pill: {
    display: "inline-block",
    padding: "5px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.06)",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginRight: 6,
    marginBottom: 6,
  },
  actionBtn: (color: string) =>
    ({
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "10px 18px",
      borderRadius: 10,
      border: "none",
      background: "transparent",
      color,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      transition: "background 0.15s",
    }) as React.CSSProperties,
};

const StatusBadge = ({ status }: { status: string | undefined }) => {
  const st = (status || "pending").toLowerCase();
  const colors: Record<string, string> = {
    pending: "#FF9F0A",
    "in production": "#0A84FF",
    completed: "#30D158",
    cancelled: "#FF453A",
    paid: "#30D158",
    partial: "#FF9F0A",
    unpaid: "#FF453A",
  };
  const c = colors[st] || "#8E8E93";
  return (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: `${c}20`,
        color: c,
      }}
    >
      {status || "Pending"}
    </span>
  );
};

/* ─── Header ─────────────────────────────────────────── */
interface HeaderProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}

export function PopupHeader({ icon, iconBg, title, subtitle }: HeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 24px 12px" }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.3 }}>
          {title}
        </h3>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>{subtitle}</p>
      </div>
    </div>
  );
}

/* ─── Footer Actions ─────────────────────────────────── */
interface FooterAction {
  label: string;
  color: string;
  onClick: () => void;
}

export function PopupFooter({ actions }: { actions: FooterAction[] }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "12px 24px 20px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        flexWrap: "wrap",
      }}
    >
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={a.onClick}
          style={s.actionBtn(a.color)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {a.label} <ArrowRight size={14} />
        </button>
      ))}
    </div>
  );
}

/* ─── Skeleton Loader ────────────────────────────────── */
export function DetailSkeleton() {
  const bar = (w: string, h = 14) => (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 6,
        background: "rgba(255,255,255,0.06)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div style={{ flex: 1 }}>
          {bar("60%", 18)}
          <div style={{ height: 8 }} />
          {bar("40%")}
        </div>
      </div>
      <div style={{ ...s.grid, marginBottom: 20 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i}>
            {bar("50%", 10)}
            <div style={{ height: 6 }} />
            {bar("70%")}
          </div>
        ))}
      </div>
      {bar("100%", 48)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

/* ─── Error State ────────────────────────────────────── */
export function DetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center" }}>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
        Could not load details. Try again.
      </p>
      <button
        onClick={onRetry}
        style={{
          padding: "10px 24px",
          borderRadius: 10,
          border: "1px solid rgba(59,130,246,0.3)",
          background: "rgba(59,130,246,0.1)",
          color: "#3b82f6",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Retry
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ORDER DETAIL
   ═══════════════════════════════════════════════════════ */
export function OrderContent({
  data,
  onNavigate,
}: {
  data: OrderDetail;
  onNavigate: (path: string) => void;
}) {
  const clientName = data.clients?.name || data.client_name || "—";
  const grossProfit =
    (data.total_amount || 0) - (data.material_cost || 0);

  return (
    <>
      <PopupHeader
        icon={<ShoppingCart size={20} color="#3b82f6" />}
        iconBg="rgba(59,130,246,0.15)"
        title={`Order — ${data.product_name || "Untitled"}`}
        subtitle={`${clientName} • ${timeAgo(data.createdAt)}`}
      />

      {/* Ticket header */}
      <div style={s.section}>
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ ...s.label, marginBottom: 2 }}>ORDER REF</div>
              <div
                style={{
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#3b82f6",
                }}
              >
                #{(data.id || "").slice(-8).toUpperCase()}
              </div>
            </div>
            <StatusBadge status={data.status} />
          </div>
        </div>

        {/* Dashed divider */}
        <div
          style={{
            borderTop: "2px dashed rgba(255,255,255,0.08)",
            margin: "16px -24px",
          }}
        />

        {/* Detail grid */}
        <div style={s.grid}>
          <div>
            <div style={s.label}>Product</div>
            <div style={s.val}>{data.product_name || "—"}</div>
          </div>
          <div>
            <div style={s.label}>Quantity</div>
            <div style={s.val}>
              {data.quantity ?? "—"} {data.unit || "pcs"}
            </div>
          </div>
          <div>
            <div style={s.label}>Client</div>
            <div style={s.val}>{clientName}</div>
          </div>
          <div>
            <div style={s.label}>Due Date</div>
            <div style={s.val}>{fmtDate(data.due_date)}</div>
          </div>
          <div>
            <div style={s.label}>Order Value</div>
            <div style={s.val}>{fmt(data.total_amount)}</div>
          </div>
          <div>
            <div style={s.label}>Payment</div>
            <div style={s.val}>{data.payment_status || "Pending"}</div>
          </div>
          <div>
            <div style={s.label}>Created</div>
            <div style={s.val}>{fmtDate(data.createdAt)}</div>
          </div>
          <div>
            <div style={s.label}>Updated</div>
            <div style={s.val}>{fmtDate(data.updatedAt)}</div>
          </div>
        </div>

        {/* Materials */}
        {data.materials && data.materials.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ ...s.label, marginBottom: 8 }}>MATERIALS USED</div>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {data.materials.map((m, i) => (
                <span key={i} style={s.pill}>
                  {m.name} — {m.quantity} {m.unit}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Financials */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: 8,
            padding: "12px 16px",
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            textAlign: "center",
          }}
        >
          <div>
            <div style={s.label}>Order Value</div>
            <div style={{ ...s.val, fontSize: 16, fontWeight: 700 }}>
              {fmt(data.total_amount)}
            </div>
          </div>
          <div>
            <div style={s.label}>Material Cost</div>
            <div style={{ ...s.val, fontSize: 16, fontWeight: 700 }}>
              {fmt(data.material_cost)}
            </div>
          </div>
          <div>
            <div style={s.label}>Gross Profit</div>
            <div
              style={{
                ...s.val,
                fontSize: 16,
                fontWeight: 700,
                color: grossProfit >= 0 ? "#30D158" : "#FF453A",
              }}
            >
              {fmt(grossProfit)}
            </div>
          </div>
        </div>
      </div>

      <PopupFooter
        actions={[
          { label: "View Full Order", color: "#3b82f6", onClick: () => onNavigate(`/dashboard/orders`) },
        ]}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   PAYMENT DETAIL
   ═══════════════════════════════════════════════════════ */
export function PaymentContent({
  data,
  onNavigate,
}: {
  data: PaymentDetail;
  onNavigate: (path: string) => void;
}) {
  const clientName = data.clients?.name || data.client_name || "—";
  const outstanding = data.outstanding_balance;

  return (
    <>
      <PopupHeader
        icon={<IndianRupee size={20} color="#30D158" />}
        iconBg="rgba(48,209,88,0.15)"
        title="Payment Received"
        subtitle={`${clientName} • ${timeAgo(data.createdAt || data.payment_date)}`}
      />

      <div style={s.section}>
        {/* Big amount */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#30D158" }}>
            {fmt(data.amount)}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
            received
          </div>
        </div>

        {/* Details */}
        <div style={s.grid}>
          <div>
            <div style={s.label}>From</div>
            <div style={s.val}>{clientName}</div>
          </div>
          <div>
            <div style={s.label}>Order</div>
            <div style={s.val}>{data.order_ref || (data.order_id ? `#${data.order_id.slice(-8).toUpperCase()}` : "—")}</div>
          </div>
          <div>
            <div style={s.label}>Method</div>
            <div style={s.val}>{data.payment_method || "—"}</div>
          </div>
          <div>
            <div style={s.label}>Received On</div>
            <div style={s.val}>{fmtDate(data.payment_date || data.createdAt)}</div>
          </div>
        </div>

        {outstanding != null && (
          <div
            style={{
              marginTop: 20,
              padding: "12px 16px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              textAlign: "center",
            }}
          >
            <div style={s.label}>Remaining Balance</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: outstanding > 0 ? "#FF9F0A" : "#30D158",
              }}
            >
              {fmt(outstanding)}
            </div>
          </div>
        )}
      </div>

      <PopupFooter
        actions={[
          { label: "View Order", color: "#3b82f6", onClick: () => onNavigate("/dashboard/orders") },
          { label: "View Ledger", color: "#30D158", onClick: () => onNavigate("/dashboard/payments") },
        ]}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   INVENTORY DETAIL
   ═══════════════════════════════════════════════════════ */
export function InventoryContent({
  data,
  onNavigate,
}: {
  data: InventoryDetail;
  onNavigate: (path: string) => void;
}) {
  const current = data.quantity ?? 0;
  const min = data.min_stock_level ?? 0;
  const pct = min > 0 ? Math.min((current / min) * 100, 100) : 100;
  const healthColor = pct > 60 ? "#30D158" : pct > 30 ? "#FF9F0A" : "#FF453A";

  return (
    <>
      <PopupHeader
        icon={<Package size={20} color="#FF9F0A" />}
        iconBg="rgba(255,159,10,0.15)"
        title="Inventory Updated"
        subtitle={`${data.name || "Item"} • ${timeAgo(data.updatedAt || data.createdAt)}`}
      />

      <div style={s.section}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{data.name || "—"}</div>
          {data.item_type && (
            <span style={{ ...s.pill, marginTop: 8 }}>{data.item_type}</span>
          )}
        </div>

        {/* Stock display */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>
            {current} <span style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }}>{data.unit || "pcs"}</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
            Current Stock
          </div>
        </div>

        {/* Detail grid */}
        <div style={s.grid}>
          <div>
            <div style={s.label}>Min Stock</div>
            <div style={s.val}>{min} {data.unit || "pcs"}</div>
          </div>
          <div>
            <div style={s.label}>Type</div>
            <div style={s.val}>{data.item_type || "Goods"}</div>
          </div>
          <div>
            <div style={s.label}>Created</div>
            <div style={s.val}>{fmtDate(data.createdAt)}</div>
          </div>
          <div>
            <div style={s.label}>Updated</div>
            <div style={s.val}>{fmtDate(data.updatedAt)}</div>
          </div>
        </div>

        {/* Health bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ ...s.label, marginBottom: 8 }}>STOCK HEALTH</div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                borderRadius: 4,
                background: healthColor,
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              marginTop: 4,
            }}
          >
            <span>0</span>
            <span style={{ color: healthColor, fontWeight: 600 }}>
              {pct >= 60 ? "Healthy" : pct >= 30 ? "Low" : "Critical"}
            </span>
            <span>{min}</span>
          </div>
        </div>
      </div>

      <PopupFooter
        actions={[
          { label: "View Inventory", color: "#FF9F0A", onClick: () => onNavigate("/dashboard/inventory") },
        ]}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   PRODUCTION DETAIL
   ═══════════════════════════════════════════════════════ */
export function ProductionContent({
  data,
  onNavigate,
}: {
  data: ProductionDetail;
  onNavigate: (path: string) => void;
}) {
  const target = data.target_quantity || 0;
  const completed = data.completed_quantity || 0;
  const pct = target > 0 ? Math.round((completed / target) * 100) : 0;

  return (
    <>
      <PopupHeader
        icon={<Cpu size={20} color="#BF5AF2" />}
        iconBg="rgba(191,90,242,0.15)"
        title={`Production ${data.status || "Job"}`}
        subtitle={`${data.product_name || data.job_name || "Job"} • ${timeAgo(data.createdAt)}`}
      />

      <div style={s.section}>
        {/* Progress */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#fff" }}>
            {completed}{" "}
            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>/ {target}</span>{" "}
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>{data.unit || "pcs"}</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "rgba(255,255,255,0.06)",
              margin: "12px 0 4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                borderRadius: 4,
                background: "linear-gradient(90deg, #BF5AF2, #AF52DE)",
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#BF5AF2" }}>{pct}% Complete</div>
        </div>

        {/* Detail grid */}
        <div style={s.grid}>
          <div>
            <div style={s.label}>Order</div>
            <div style={s.val}>
              {data.order_ref || (data.order_id ? `#${data.order_id.slice(-8).toUpperCase()}` : "—")}
            </div>
          </div>
          <div>
            <div style={s.label}>Machine</div>
            <div style={s.val}>{data.machine_name || "—"}</div>
          </div>
          <div>
            <div style={s.label}>Operator</div>
            <div style={s.val}>{data.operator_name || "—"}</div>
          </div>
          <div>
            <div style={s.label}>Started</div>
            <div style={s.val}>{fmtDate(data.start_date || data.createdAt)}</div>
          </div>
          {data.completed_date && (
            <div>
              <div style={s.label}>Completed</div>
              <div style={s.val}>{fmtDate(data.completed_date)}</div>
            </div>
          )}
          {(data.rejected_quantity ?? 0) > 0 && (
            <div>
              <div style={s.label}>Rejected</div>
              <div style={{ ...s.val, color: "#FF453A" }}>
                {data.rejected_quantity} {data.unit || "pcs"}
              </div>
            </div>
          )}
        </div>
      </div>

      <PopupFooter
        actions={[
          { label: "View Production", color: "#BF5AF2", onClick: () => onNavigate("/dashboard/production") },
        ]}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   FALLBACK DETAIL
   ═══════════════════════════════════════════════════════ */
export function FallbackContent({
  activity,
  onNavigate,
}: {
  activity: ActivityItem;
  onNavigate: (path: string) => void;
}) {
  const iconMap: Record<string, { icon: React.ReactNode; bg: string }> = {
    order: { icon: <ShoppingCart size={20} color="#3b82f6" />, bg: "rgba(59,130,246,0.15)" },
    payment: { icon: <IndianRupee size={20} color="#30D158" />, bg: "rgba(48,209,88,0.15)" },
    inventory: { icon: <Package size={20} color="#FF9F0A" />, bg: "rgba(255,159,10,0.15)" },
    production: { icon: <Cpu size={20} color="#BF5AF2" />, bg: "rgba(191,90,242,0.15)" },
    client: { icon: <BookOpen size={20} color="#0A84FF" />, bg: "rgba(10,132,255,0.15)" },
  };
  const ic = iconMap[activity.type] || iconMap.order;

  const hrefMap: Record<string, string> = {
    order: "/dashboard/orders",
    payment: "/dashboard/payments",
    inventory: "/dashboard/inventory",
    production: "/dashboard/production",
    client: "/dashboard/clients",
  };

  return (
    <>
      <PopupHeader
        icon={ic.icon}
        iconBg={ic.bg}
        title={activity.title}
        subtitle={timeAgo(activity.time)}
      />
      <div style={s.section}>
        <span style={s.pill}>{activity.type}</span>
        <p style={{ ...s.val, marginTop: 12 }}>{activity.description}</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
          {fmtDate(activity.time)}
        </p>
      </div>
      <PopupFooter
        actions={[
          {
            label: "View Details",
            color: "#0A84FF",
            onClick: () => onNavigate(hrefMap[activity.type] || "/dashboard"),
          },
        ]}
      />
    </>
  );
}
