"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ActivityItem,
  OrderDetail,
  PaymentDetail,
  InventoryDetail,
  ProductionDetail,
  EntityDetail,
} from "./activity-detail-types";
import {
  DetailSkeleton,
  DetailError,
  OrderContent,
  PaymentContent,
  InventoryContent,
  ProductionContent,
  FallbackContent,
} from "./ActivityDetailContent";

/* ─── API endpoint map ───────────────────────────────── */
const API_MAP: Record<string, string> = {
  order: "/api/v1/orders",
  payment: "/api/v1/payments",
  inventory: "/api/v1/inventory",
  production: "/api/v1/production",
};

interface Props {
  activity: ActivityItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ActivityDetailPopup({ activity, open, onOpenChange }: Props) {
  const router = useRouter();
  const [data, setData] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchDetail = useCallback(async (item: ActivityItem) => {
    const base = API_MAP[item.type];
    if (!base || !item.entityId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    setData(null);

    try {
      const res = await fetch(`${base}/${item.entityId}`);
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      // v1 APIs wrap in { success, data }
      const payload = json?.data ?? json;
      setData(payload);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when dialog opens
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && activity) {
        fetchDetail(activity);
      }
      if (!nextOpen) {
        // Reset on close
        setData(null);
        setError(false);
        setLoading(false);
      }
      onOpenChange(nextOpen);
    },
    [activity, fetchDetail, onOpenChange],
  );

  const handleNavigate = useCallback(
    (path: string) => {
      onOpenChange(false);
      router.push(path);
    },
    [onOpenChange, router],
  );

  const handleRetry = useCallback(() => {
    if (activity) fetchDetail(activity);
  }, [activity, fetchDetail]);

  /* ─── Render body ────────────────────────────────────── */
  const renderContent = () => {
    if (loading) return <DetailSkeleton />;
    if (error) return <DetailError onRetry={handleRetry} />;
    if (!activity) return null;

    // No API for client type — show fallback
    if (activity.type === "client" || !data) {
      return <FallbackContent activity={activity} onNavigate={handleNavigate} />;
    }

    switch (activity.type) {
      case "order":
        return <OrderContent data={data as OrderDetail} onNavigate={handleNavigate} />;
      case "payment":
        return <PaymentContent data={data as PaymentDetail} onNavigate={handleNavigate} />;
      case "inventory":
        return <InventoryContent data={data as InventoryDetail} onNavigate={handleNavigate} />;
      case "production":
        return <ProductionContent data={data as ProductionDetail} onNavigate={handleNavigate} />;
      default:
        return <FallbackContent activity={activity} onNavigate={handleNavigate} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] overflow-y-auto">
        <DialogTitle className="sr-only">{activity?.title || "Activity Details"}</DialogTitle>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
