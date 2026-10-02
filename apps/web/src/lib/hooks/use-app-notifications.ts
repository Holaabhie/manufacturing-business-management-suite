"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ──────────────────────────────────────────────────────
export interface StoredNotification {
  id: string;
  type: string;
  templateKey?: string;
  params?: Record<string, unknown>;
  title?: string;
  message?: string;
  url: string;
  createdAt: string;
  isRead: boolean;
}

interface RawGeneratedNotification {
  id: string;
  type: string;
  templateKey: string;
  params: Record<string, unknown>;
  title?: string;
  message?: string;
  url: string;
  created_at: string;
}

interface HistoryEntry {
  id: string;
  type: string;
  templateKey?: string;
  params?: Record<string, unknown>;
  title?: string;
  message?: string;
  url: string;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────
const HISTORY_KEY = "ind_notification_history_v2";
const READ_IDS_KEY = "ind_notification_read_ids";
const MAX_ENTRIES = 100;
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── localStorage helpers ───────────────────────────────────────
function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      if (process.env.NODE_ENV === "development") {
        const seed: HistoryEntry[] = [{
          id: "demo-overdue-1",
          type: "overdue",
          templateKey: "overdue",
          params: { order: "Order #1042", client: "Acme Corp", date: "22 Sep" },
          url: "/dashboard/orders",
          createdAt: new Date().toISOString(),
        }];
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(seed));
        } catch { /* ignore */ }
        return seed;
      }
      return [];
    }
    const entries: HistoryEntry[] = JSON.parse(raw);
    // Remove entries older than 30 days or entries missing structured templateKey/params
    const cutoff = Date.now() - TTL_MS;
    return entries.filter(
      (e) => Boolean(e.templateKey && e.params) && new Date(e.createdAt).getTime() > cutoff
    );
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

// ─── Notification generator (extracted from NotificationDropdown) ─
function generateNotificationsFromData(
  ordersRes: unknown,
  inventoryRes: unknown,
  paymentsRes: unknown
): RawGeneratedNotification[] {
  const orders = Array.isArray(ordersRes)
    ? ordersRes
    : (ordersRes as Record<string, unknown>)?.orders || [];
  const inventory = Array.isArray(
    (inventoryRes as Record<string, unknown>)?.data
  )
    ? (inventoryRes as Record<string, unknown>).data
    : Array.isArray(inventoryRes)
    ? inventoryRes
    : [];
  const payments = Array.isArray(paymentsRes)
    ? paymentsRes
    : (paymentsRes as Record<string, unknown>)?.payments || [];

  const generated: RawGeneratedNotification[] = [];
  const now = new Date();

  const orderLabel = (o: Record<string, unknown>): string => {
    const name = o.product_name as string | undefined;
    if (name) return name;
    return `Order #${((o.id as string) || "").slice(-6).toUpperCase()}`;
  };

  (orders as Record<string, unknown>[]).forEach((o) => {
    const prodStatus = (o.productionStatus || o.production_status || o.status) as string | undefined;
    const payStatus = (o.paymentStatus || o.payment_status) as string | undefined;
    const isFullyCompleted = prodStatus === "completed" && payStatus === "paid";

    const dueDate = (o.due_date || o.dueDate || o.delivery_date) as
      | string
      | undefined;
    if (
      dueDate &&
      new Date(dueDate) < now &&
      !isFullyCompleted &&
      prodStatus !== "delivered"
    ) {
      const clients = o.clients as Record<string, unknown> | undefined;
      const clientName = clients?.name || o.client_name || "client";
      const formattedDate = new Date(dueDate).toLocaleDateString("en-IN");
      generated.push({
        id: `overdue-${o.id}`,
        type: "overdue",
        templateKey: "overdue",
        params: {
          order: orderLabel(o),
          client: clientName,
          date: formattedDate,
        },
        title: `${orderLabel(o)} is overdue`,
        message: `For ${clientName} — was due ${formattedDate}`,
        created_at: dueDate,
        url: `/dashboard/production/${o.id}`,
      });
    }
    if (prodStatus === "processing" || prodStatus === "in_progress") {
      const startDate = (o.production_start_date ||
        o.updatedAt ||
        o.createdAt) as string | undefined;
      if (startDate) {
        const days = Math.floor(
          (now.getTime() - new Date(startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (days > 3) {
          const clients = o.clients as Record<string, unknown> | undefined;
          const clientName = clients?.name || o.client_name || "client";
          generated.push({
            id: `stuck-${o.id}`,
            type: "production_stuck",
            templateKey: "productionStuck",
            params: {
              order: orderLabel(o),
              days,
              client: clientName,
            },
            title: `${orderLabel(o)} stuck in production`,
            message: `In production for ${days} days — ${clientName}`,
            created_at: startDate,
            url: `/dashboard/production/${o.id}`,
          });
        }
      }
    }
    if (prodStatus === "completed") {
      const clients = o.clients as Record<string, unknown> | undefined;
      const clientName = clients?.name || o.client_name || "client";
      const qty = o.quantity || 0;
      const isAwaitingPayment = payStatus !== "paid";
      generated.push({
        id: `completed-${o.id}`,
        type: "completed",
        templateKey: "productionCompleted",
        params: {
          order: orderLabel(o),
          client: clientName,
          quantity: qty,
          awaitingPayment: isAwaitingPayment,
        },
        title: `${orderLabel(o)} production completed`,
        message: `Order for ${clientName} — ${qty} units${isAwaitingPayment ? " (awaiting payment)" : ""}`,
        created_at:
          (o.updatedAt as string) ||
          (o.createdAt as string) ||
          now.toISOString(),
        url: `/dashboard/production/${o.id}`,
      });
    }
  });

  (inventory as Record<string, unknown>[]).forEach((item) => {
    const qty = item.quantity as number;
    const minStock = item.min_stock_level as number;
    const unit = (item.unit as string) || "";
    if (qty <= minStock) {
      generated.push({
        id: `lowstock-${item.id}`,
        type: "low_stock",
        templateKey: "lowStock",
        params: {
          item: item.name,
          current: qty,
          min: minStock,
          unit,
        },
        title: `${item.name} is running low`,
        message: `Current: ${qty} ${unit} — Min: ${minStock} ${unit}`,
        created_at: (item.updatedAt as string) || now.toISOString(),
        url: "/dashboard/inventory",
      });
    }
  });

  (payments as Record<string, unknown>[]).forEach((p) => {
    if (p.status === "pending" || p.status === "overdue") {
      const clients = p.clients as Record<string, unknown> | undefined;
      const clientName = clients?.name || p.client_name || "client";
      const amountStr = Number(p.amount || 0).toLocaleString("en-IN");
      const methodStr = (p.payment_method as string) || "—";
      generated.push({
        id: `payment-${p.id}`,
        type: "payment_pending",
        templateKey: "paymentPending",
        params: {
          client: clientName,
          amount: amountStr,
          method: methodStr,
        },
        title: `Payment pending from ${clientName}`,
        message: `₹${amountStr} — ${methodStr}`,
        created_at:
          (p.due_date as string) ||
          (p.createdAt as string) ||
          now.toISOString(),
        url: "/dashboard/payments",
      });
    }
  });

  return generated;
}

// ─── Merge logic ────────────────────────────────────────────────
function mergeIntoHistory(
  existing: HistoryEntry[],
  freshNotifications: RawGeneratedNotification[]
): HistoryEntry[] {
  const historyMap = new Map<string, HistoryEntry>();

  // Seed with existing history
  for (const entry of existing) {
    historyMap.set(entry.id, entry);
  }

  // Merge fresh — only add new ones, preserve existing createdAt
  for (const n of freshNotifications) {
    if (!historyMap.has(n.id)) {
      historyMap.set(n.id, {
        id: n.id,
        type: n.type,
        templateKey: n.templateKey,
        params: n.params,
        title: n.title,
        message: n.message,
        url: n.url,
        createdAt: n.created_at || new Date().toISOString(),
      });
    }
    // If it already exists, we keep the existing entry unchanged
    // (preserves original createdAt so it stays in history even
    //  after the order is completed/resolved)
  }

  // Sort by createdAt DESC
  const sorted = [...historyMap.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Trim to MAX_ENTRIES (FIFO)
  return sorted.slice(0, MAX_ENTRIES);
}

// ─── Hook ───────────────────────────────────────────────────────
export function useAppNotifications() {
  const [notifications, setNotifications] = useState<StoredNotification[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const readIdsRef = useRef<Set<string>>(new Set());
  const fetchingRef = useRef(false);

  // ── Hydrate read-ids on mount ──
  useEffect(() => {
    readIdsRef.current = loadReadIds();
  }, []);

  // ── Core fetch + merge ──
  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const [ordersRes, inventoryRes, paymentsRes, readRes] = await Promise.all([
        fetch("/api/orders")
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        fetch("/api/v1/inventory")
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .catch(() => ({ data: [] })),
        fetch("/api/payments")
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        fetch("/api/notifications/read")
          .then((r) => (r.ok ? r.json() : { readIds: [] }))
          .catch(() => ({ readIds: [] })),
      ]);

      // 0. Synchronize persisted read IDs from server
      if (Array.isArray(readRes?.readIds)) {
        for (const id of readRes.readIds) {
          readIdsRef.current.add(id);
        }
        saveReadIds(readIdsRef.current);
      }

      // 1. Generate fresh notifications from API data
      const fresh = generateNotificationsFromData(
        ordersRes,
        inventoryRes,
        paymentsRes
      );

      // 2. Load existing history from localStorage
      const existingHistory = loadHistory();

      // 3. Merge fresh into history
      const mergedHistory = mergeIntoHistory(existingHistory, fresh);

      // 4. Save updated history
      saveHistory(mergedHistory);

      // 5. Apply read state
      const readIds = readIdsRef.current;
      const withReadState: StoredNotification[] = mergedHistory.map(
        (entry) => ({
          ...entry,
          isRead: readIds.has(entry.id),
        })
      );

      setNotifications(withReadState);
      setUnreadCount(withReadState.filter((n) => !n.isRead).length);
    } catch {
      // On error, show whatever we have in localStorage
      const existing = loadHistory();
      const readIds = readIdsRef.current;
      const fallback: StoredNotification[] = existing.map((entry) => ({
        ...entry,
        isRead: readIds.has(entry.id),
      }));
      setNotifications(fallback);
      setUnreadCount(fallback.filter((n) => !n.isRead).length);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // ── Fetch on mount ──
  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Re-fetch on window focus ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
  }, [refresh]);

  // ── Mark single as read ──
  const markAsRead = useCallback((id: string) => {
    readIdsRef.current.add(id);
    saveReadIds(readIdsRef.current);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Persist to server
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch((err) => {
      console.warn("Failed to persist notification read state to server:", err);
    });
  }, []);

  // ── Mark all as read ──
  const markAllAsRead = useCallback(() => {
    const idsToMark: string[] = [];
    setNotifications((prev) => {
      for (const n of prev) {
        readIdsRef.current.add(n.id);
        idsToMark.push(n.id);
      }
      saveReadIds(readIdsRef.current);
      return prev.map((n) => ({ ...n, isRead: true }));
    });
    setUnreadCount(0);

    if (idsToMark.length > 0) {
      // Persist to server
      fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToMark }),
      }).catch((err) => {
        console.warn("Failed to persist all notifications read state to server:", err);
      });
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
