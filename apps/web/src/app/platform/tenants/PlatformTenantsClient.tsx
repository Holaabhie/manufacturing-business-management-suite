"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, Shield, X, AlertCircle, ChevronDown } from "lucide-react";

/* ───────── Types ───────── */

interface PlanOverride {
  tier: string;
  set_at?: string;
  granted_at?: string;
  expires_at: string | null;
  reason: string;
  granted_by?: string;
}

interface TenantRow {
  ownerId: string;
  email: string;
  name: string;
  subscription_tier: string;
  effective_tier: string;
  plan_override: PlanOverride | null;
  counts: {
    inventory: number;
    orders: number;
    clients: number;
    users: number;
  };
}

/* ───────── Design Tokens ───────── */

const COLORS = {
  bg: "#F3F5F9",
  card: "rgba(255,255,255,0.72)",
  cardSolid: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  accent: "#2563EB",
  accentHover: "#1D4ED8",
  border: "#E2E8F0",
  dangerBg: "#FEF2F2",
  danger: "#DC2626",
  dangerHover: "#B91C1C",
  successBg: "#F0FDF4",
  success: "#16A34A",
  overrideBadgeBg: "#DBEAFE",
  overrideBadgeText: "#1E40AF",
};

/* ───────── Component ───────── */

export default function PlatformTenantsClient() {
  const [query, setQuery] = useState("");
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state
  const [grantModal, setGrantModal] = useState<TenantRow | null>(null);
  const [grantTier, setGrantTier] = useState<"starter" | "pro">("pro");
  const [grantReason, setGrantReason] = useState("");
  const [grantExpiry, setGrantExpiry] = useState("");
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);

  // Revoke state
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // ─── Fetch tenants ──────────────────────────────────
  const fetchTenants = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
      const res = await fetch(`/api/platform/tenants${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setTenants(json.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch tenants");
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTenants("");
  }, [fetchTenants]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchTenants(value), 300);
  };

  // ─── Grant Override ──────────────────────────────────
  const openGrantModal = (tenant: TenantRow) => {
    setGrantModal(tenant);
    setGrantTier("pro");
    setGrantReason("");
    setGrantExpiry("");
    setGrantError(null);
    setGrantSubmitting(false);
  };

  const handleGrant = async () => {
    if (!grantModal) return;
    setGrantSubmitting(true);
    setGrantError(null);
    try {
      const body: Record<string, any> = {
        tier: grantTier,
        reason: grantReason,
      };
      if (grantExpiry) body.expires_at = new Date(grantExpiry).toISOString();
      const res = await fetch(`/api/platform/tenants/${grantModal.ownerId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      // Refresh list
      await fetchTenants(query);
      setGrantModal(null);
    } catch (err: any) {
      setGrantError(err.message || "Failed to grant override");
    } finally {
      setGrantSubmitting(false);
    }
  };

  // ─── Revoke Override ──────────────────────────────────
  const handleRevoke = async (ownerId: string) => {
    setRevoking(ownerId);
    setRevokeError(null);
    try {
      const res = await fetch(`/api/platform/tenants/${ownerId}/override`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      await fetchTenants(query);
    } catch (err: any) {
      setRevokeError(err.message || "Failed to revoke override");
    } finally {
      setRevoking(null);
    }
  };

  // ─── Helpers ──────────────────────────────────
  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  const tierBadge = (tier: string) => {
    const isPro = tier === "pro";
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          backgroundColor: isPro ? "#DBEAFE" : "#F1F5F9",
          color: isPro ? "#1D4ED8" : "#475569",
        }}
      >
        {tier}
      </span>
    );
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", minWidth: 0, overflowX: "hidden", backgroundColor: COLORS.bg, color: COLORS.text }}>
      {/* ─── Header ─── */}
      <header
        style={{
          padding: "24px 24px 16px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Shield size={22} color={COLORS.accent} />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Platform Admin — Tenant Management
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: COLORS.textMuted }}>
          Search tenants and manage plan overrides
        </p>
      </header>

      {/* ─── Search ─── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 16px" }}>
        <div
          style={{
            position: "relative",
            maxWidth: 420,
          }}
        >
          <Search
            size={16}
            color={COLORS.textMuted}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            id="tenant-search"
            type="text"
            placeholder="Search by email…"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 36px 10px 36px",
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.cardSolid,
              fontSize: 14,
              color: COLORS.text,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); fetchTenants(""); }}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                display: "flex",
              }}
            >
              <X size={14} color={COLORS.textMuted} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Error banner ─── */}
      {error && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              backgroundColor: COLORS.dangerBg,
              color: COLORS.danger,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      )}

      {/* ─── Revoke error ─── */}
      {revokeError && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              backgroundColor: COLORS.dangerBg,
              color: COLORS.danger,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <AlertCircle size={16} />
            {revokeError}
          </div>
        </div>
      )}

      {/* ─── Table ─── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 40px" }}>
        <div
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            overflow: "hidden",
          }}
        >
          {/* Loading state */}
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "48px 24px",
                color: COLORS.textMuted,
                fontSize: 14,
              }}
            >
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              Loading tenants…
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && tenants.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                color: COLORS.textMuted,
                fontSize: 14,
              }}
            >
              No tenants found.
            </div>
          )}

          {/* Data table (horizontal scroll on mobile) */}
          {!loading && tenants.length > 0 && (
            <div style={{ overflowX: "auto", width: "100%", minWidth: 0 }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 820,
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: `1px solid ${COLORS.border}`,
                      textAlign: "left",
                    }}
                  >
                    {["Email", "Name", "Sub Tier", "Effective", "Override Status", "Usage", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 14px",
                            fontWeight: 600,
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: COLORS.textMuted,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr
                      key={t.ownerId}
                      style={{
                        borderBottom: `1px solid ${COLORS.border}`,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "rgba(37,99,235,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      {/* Email */}
                      <td style={{ padding: "12px 14px", fontWeight: 500 }}>
                        {t.email}
                      </td>

                      {/* Name */}
                      <td
                        style={{
                          padding: "12px 14px",
                          color: COLORS.textMuted,
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.name || "—"}
                      </td>

                      {/* Subscription Tier */}
                      <td style={{ padding: "12px 14px" }}>{tierBadge(t.subscription_tier)}</td>

                      {/* Effective Tier */}
                      <td style={{ padding: "12px 14px" }}>{tierBadge(t.effective_tier)}</td>

                      {/* Override Status */}
                      <td style={{ padding: "12px 14px" }}>
                        {t.plan_override ? (
                          <div>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                backgroundColor: COLORS.overrideBadgeBg,
                                color: COLORS.overrideBadgeText,
                              }}
                            >
                              Override: {t.plan_override.tier}
                              {t.plan_override.expires_at ? ` until ${formatDate(t.plan_override.expires_at)}` : ""}
                              {t.plan_override.granted_by ? `, granted by ${t.plan_override.granted_by}` : ""}
                            </span>
                            {t.plan_override.reason && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: COLORS.textMuted,
                                  marginTop: 2,
                                }}
                                title={t.plan_override.reason}
                              >
                                {t.plan_override.reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: COLORS.textMuted, fontSize: 12 }}>None</span>
                        )}
                      </td>

                      {/* Usage */}
                      <td style={{ padding: "12px 14px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            fontSize: 12,
                            color: COLORS.textMuted,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span title="Inventory">{t.counts.inventory} inv</span>
                          <span title="Orders">{t.counts.orders} ord</span>
                          <span title="Clients">{t.counts.clients} cli</span>
                          <span title="Users">{t.counts.users} usr</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => openGrantModal(t)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 8,
                              border: "none",
                              backgroundColor: COLORS.accent,
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor = COLORS.accentHover)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor = COLORS.accent)
                            }
                          >
                            Grant Override
                          </button>
                          {t.plan_override && (
                            <button
                              onClick={() => handleRevoke(t.ownerId)}
                              disabled={revoking === t.ownerId}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 8,
                                border: `1px solid ${COLORS.danger}`,
                                backgroundColor: "transparent",
                                color: COLORS.danger,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: revoking === t.ownerId ? "wait" : "pointer",
                                opacity: revoking === t.ownerId ? 0.6 : 1,
                                transition: "background 0.15s, opacity 0.15s",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              onMouseEnter={(e) => {
                                if (revoking !== t.ownerId)
                                  e.currentTarget.style.backgroundColor = COLORS.dangerBg;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }}
                            >
                              {revoking === t.ownerId && (
                                <Loader2
                                  size={12}
                                  style={{ animation: "spin 1s linear infinite" }}
                                />
                              )}
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Grant Override Modal ─── */}
      {grantModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setGrantModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: COLORS.cardSolid,
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                margin: "0 0 4px",
                color: COLORS.text,
              }}
            >
              Grant Plan Override
            </h2>
            <p
              style={{
                fontSize: 13,
                color: COLORS.textMuted,
                margin: "0 0 20px",
              }}
            >
              {grantModal.email}
            </p>

            {/* Tier select */}
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.textMuted,
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Tier
            </label>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <select
                value={grantTier}
                onChange={(e) => setGrantTier(e.target.value as "starter" | "pro")}
                style={{
                  width: "100%",
                  padding: "10px 32px 10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: COLORS.cardSolid,
                  fontSize: 14,
                  color: COLORS.text,
                  outline: "none",
                  appearance: "none",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <option value="pro">Pro</option>
                <option value="starter">Starter</option>
              </select>
              <ChevronDown
                size={14}
                color={COLORS.textMuted}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              />
            </div>

            {/* Reason */}
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.textMuted,
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Reason (required)
            </label>
            <textarea
              id="grant-reason"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="Why is this override needed?"
              rows={3}
              maxLength={500}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.cardSolid,
                fontSize: 14,
                color: COLORS.text,
                outline: "none",
                resize: "vertical",
                marginBottom: 16,
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />

            {/* Expiry */}
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.textMuted,
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Expires (optional)
            </label>
            <input
              id="grant-expiry"
              type="date"
              value={grantExpiry}
              onChange={(e) => setGrantExpiry(e.target.value)}
              min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.cardSolid,
                fontSize: 14,
                color: COLORS.text,
                outline: "none",
                marginBottom: 20,
                boxSizing: "border-box",
              }}
            />

            {/* Error */}
            {grantError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 8,
                  backgroundColor: COLORS.dangerBg,
                  color: COLORS.danger,
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 16,
                }}
              >
                <AlertCircle size={14} />
                {grantError}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setGrantModal(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: "transparent",
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGrant}
                disabled={grantSubmitting}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: grantSubmitting ? COLORS.textMuted : COLORS.accent,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: grantSubmitting ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "background 0.15s",
                }}
              >
                {grantSubmitting && (
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                )}
                Grant Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
