"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function SampleDataBanner({
  onSampleLoaded,
  onSampleCleared,
}: {
  onSampleLoaded?: () => void;
  onSampleCleared?: () => void;
}) {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const loadSampleData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sample-data", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to load sample data");
      } else {
        setIsActive(true);
        toast.success("Sample data loaded! Explore the dashboard with realistic data.");
        onSampleLoaded?.();
      }
    } catch {
      toast.error("Failed to load sample data");
    } finally {
      setLoading(false);
    }
  }, [onSampleLoaded]);

  const clearSampleData = useCallback(async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/sample-data", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to remove sample data");
      } else {
        setIsActive(false);
        toast.success("Sample data removed.");
        onSampleCleared?.();
      }
    } catch {
      toast.error("Failed to remove sample data");
    } finally {
      setClearing(false);
    }
  }, [onSampleCleared]);

  return (
    <>
      {/* Load Sample Data Button (shown when not active) */}
      {!isActive && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={loadSampleData}
          disabled={loading}
          className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
          style={{
            background: "rgba(167,139,250,0.1)",
            border: "1px solid rgba(167,139,250,0.3)",
            color: "#a78bfa",
          }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Loading sample data..." : "Try with Sample Data"}
        </motion.button>
      )}

      {/* Active Sample Data Banner */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.25)",
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: "#fbbf24" }} />
                <span className="text-sm font-semibold" style={{ color: "#fbbf24" }}>
                  Viewing sample data
                </span>
                <span className="text-xs" style={{ color: "rgba(251,191,36,0.6)" }}>
                  — This is demo data for exploration
                </span>
              </div>
              <button
                onClick={clearSampleData}
                disabled={clearing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer hover:bg-[rgba(251,191,36,0.15)]"
                style={{
                  color: "#fbbf24",
                  border: "1px solid rgba(251,191,36,0.2)",
                }}
              >
                {clearing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                {clearing ? "Removing..." : "Remove Sample Data"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
