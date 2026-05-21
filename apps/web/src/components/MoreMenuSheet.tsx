"use client";

/**
 * MoreMenuSheet — Premium enterprise operational launcher
 *
 * Architecture:
 *   1. Bottom sheet (portaled, animated, --overlay-* tokens)
 *   2. Quick actions horizontal scroll row (pill cards)
 *   3. Categorized vertical navigation cards (full-width, single-column)
 *   4. In-place customization overlay (layered above sheet)
 *   5. dnd-kit sortable reordering + toggle switches
 *   6. localStorage auto-persistence
 *
 * Motion: 280ms ease enter, 220ms ease exit. No springs.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { useRouter, usePathname } from "next/navigation";
import {
  X,
  GripVertical,
  RotateCcw,
  ChevronRight,
  Plus,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ────────────────────────────────────────────────────

export interface MoreMenuItem {
  name: string;
  desc: string;
  icon: React.ComponentType<any>;
  emoji: string;
  href: string;
}

export interface MoreMenuSection {
  label: string;
  color: string;
  items: MoreMenuItem[];
}

export interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
}

interface MenuConfig {
  order: string[];
  hidden: string[];
}

interface MoreMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sections: MoreMenuSection[];
  quickActions: QuickAction[];
  role: string | null;
  /** Filter function from role-permissions */
  isRouteAllowed: (role: string | null, href: string) => boolean;
}

// ─── Constants ────────────────────────────────────────────────

const STORAGE_KEY = "ind-more-menu-config";
const STAFF_HIDDEN = [
  "Analytics",
  "Billing & Invoices",
  "Payments",
  "Tally Export",
  "Upgrade",
];

// ─── Persistence ──────────────────────────────────────────────

function loadConfig(): MenuConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveConfig(config: MenuConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* quota exceeded — fail silently */
  }
}

function clearConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* fail silently */
  }
}

// ─── Flatten sections into ordered item list ──────────────────

function flattenSections(sections: MoreMenuSection[]): MoreMenuItem[] {
  return sections.flatMap((s) => s.items);
}

function getItemSection(
  item: MoreMenuItem,
  sections: MoreMenuSection[]
): MoreMenuSection | undefined {
  return sections.find((s) => s.items.some((i) => i.name === item.name));
}

// ═══════════════════════════════════════════════════════════════
//  SORTABLE ITEM (for customization modal — premium redesign)
// ═══════════════════════════════════════════════════════════════

function SortableMenuItem({
  item,
  section,
  isVisible,
  onToggle,
}: {
  item: MoreMenuItem;
  section: MoreMenuSection | undefined;
  isVisible: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.name });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isDragging
          ? "var(--customize-modal-surface)"
          : "var(--customize-modal-row-bg)",
        border: `1px solid ${isDragging ? "var(--overlay-accent)" : "var(--customize-modal-row-border)"}`,
        borderRadius: 16,
        marginBottom: 8,
        boxShadow: isDragging
          ? "0 12px 28px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.08)"
          : "none",
      }}
      className={cn(
        "flex items-center gap-4 px-4 transition-all duration-200",
        isDragging && "scale-[1.02]"
      )}
      {...attributes}
    >
      {/* Drag handle — 6-dot grip */}
      <button
        className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1.5 rounded-lg touch-none transition-opacity duration-150 ease opacity-40 hover:opacity-80"
        style={{ color: "var(--overlay-text-muted)" }}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>

      {/* Icon container — clean dual-mode */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.07]"
        style={{
          opacity: isVisible ? 1 : 0.45,
          transition: "opacity 200ms ease",
        }}
      >
        <item.icon
          size={20}
          strokeWidth={1.8}
          style={{ color: section?.color || "#64748B" }}
        />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0 py-3" style={{ minHeight: 64, display: "flex", alignItems: "center" }}>
        <p
          className="text-[14px] font-medium truncate"
          style={{
            color: isVisible
              ? "var(--overlay-text-primary)"
              : "var(--overlay-text-muted)",
            opacity: isVisible ? 1 : 0.55,
            transition: "all 200ms ease",
          }}
        >
          {item.name}
        </p>
      </div>

      {/* Toggle switch — clear ON/OFF states */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 relative transition-all duration-200 ease cursor-pointer"
        style={{
          width: 48,
          height: 28,
          borderRadius: 999,
          background: isVisible
            ? "var(--customize-toggle-on)"
            : "var(--customize-toggle-off)",
          boxShadow: isVisible
            ? "var(--customize-toggle-glow)"
            : "none",
          border: "none",
          outline: "none",
        }}
        aria-label={`Toggle ${item.name}`}
        aria-checked={isVisible}
        role="switch"
      >
        <div
          style={{
            position: "absolute",
            top: 4,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2), 0 1px 1px rgba(0,0,0,0.1)",
            transition: "transform 200ms ease",
            transform: isVisible ? "translateX(24px)" : "translateX(4px)",
          }}
        />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CUSTOMIZATION OVERLAY — Premium Enterprise Tablet Design
// ═══════════════════════════════════════════════════════════════

function CustomizationOverlay({
  isOpen,
  onClose,
  allItems,
  sections,
  config,
  onConfigChange,
  onReset,
}: {
  isOpen: boolean;
  onClose: () => void;
  allItems: MoreMenuItem[];
  sections: MoreMenuSection[];
  config: MenuConfig;
  onConfigChange: (config: MenuConfig) => void;
  onReset: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  // Build ordered list from config, grouped by section
  const orderedItemsBySection = useMemo(() => {
    // Build flat ordered list
    const orderedAll: MoreMenuItem[] = [];
    for (const name of config.order) {
      const item = allItems.find((i) => i.name === name);
      if (item) orderedAll.push(item);
    }
    for (const item of allItems) {
      if (!orderedAll.some((o) => o.name === item.name)) {
        orderedAll.push(item);
      }
    }
    return orderedAll;
  }, [config.order, allItems]);

  // Flat ordered names for dnd-kit context
  const orderedNames = useMemo(
    () => orderedItemsBySection.map((i) => i.name),
    [orderedItemsBySection]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = orderedNames.indexOf(active.id as string);
    const newIdx = orderedNames.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;

    const newOrder = arrayMove(orderedNames, oldIdx, newIdx);
    const newConfig = { ...config, order: newOrder };
    onConfigChange(newConfig);
    saveConfig(newConfig);
  };

  const toggleItem = (name: string) => {
    const isHidden = config.hidden.includes(name);
    const newHidden = isHidden
      ? config.hidden.filter((n) => n !== name)
      : [...config.hidden, name];
    const newConfig = { ...config, hidden: newHidden };
    onConfigChange(newConfig);
    saveConfig(newConfig);
  };

  // Group ordered items by section for categorized display
  const groupedSections = useMemo(() => {
    const result: { label: string; color: string; items: MoreMenuItem[] }[] = [];
    for (const section of sections) {
      const sectionItems = orderedItemsBySection.filter((item) =>
        section.items.some((si) => si.name === item.name)
      );
      if (sectionItems.length > 0) {
        result.push({ label: section.label, color: section.color, items: sectionItems });
      }
    }
    return result;
  }, [orderedItemsBySection, sections]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* ── Backdrop: dim + subtle blur between sheet and modal ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onPointerDown={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1100,
              background: "rgba(15, 23, 42, 0.32)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />

          {/* ── Centering wrapper — flex-based, no transform conflicts ── */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1101,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 12px",
              paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
              pointerEvents: "none",
            }}
          >
            {/* ── Floating customization modal ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 480,
                maxHeight: "min(82vh, 760px)",
                display: "flex",
                flexDirection: "column",
                background: "var(--customize-modal-bg)",
                border: "1px solid var(--customize-modal-border)",
                borderRadius: 28,
                boxShadow: "var(--customize-modal-shadow)",
                overflow: "hidden",
                pointerEvents: "auto",
              }}
            >
              {/* ── Drag handle ── */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  paddingTop: 14,
                  paddingBottom: 4,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 5,
                    borderRadius: 999,
                    background: "var(--overlay-handle)",
                  }}
                />
              </div>

              {/* ── Header (fixed) ── */}
              <div
                style={{
                  padding: "10px 24px 16px",
                  borderBottom: "1px solid var(--customize-modal-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: "var(--overlay-hover)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Settings2 size={20} style={{ color: "var(--overlay-accent)" }} />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: "var(--overlay-text-primary)",
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      Customise Menu
                    </h2>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--overlay-text-muted)",
                        margin: "3px 0 0",
                      }}
                    >
                      Drag to reorder · Toggle to show/hide
                    </p>
                  </div>
                </div>

                {/* Close button — ghost circular */}
                <button
                  onClick={onClose}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "transparent",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--overlay-text-muted)",
                    transition: "all 150ms ease",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--overlay-hover)";
                    e.currentTarget.style.color = "var(--overlay-text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--overlay-text-muted)";
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* ── Scrollable categorized sortable list ── */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  padding: "16px 16px 8px",
                  scrollbarWidth: "thin",
                  scrollbarColor: "var(--overlay-scrollbar) transparent",
                }}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={orderedNames}
                    strategy={verticalListSortingStrategy}
                  >
                    {groupedSections.map((section) => (
                      <div key={section.label} style={{ marginBottom: 20 }}>
                        {/* Section label */}
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase" as const,
                            color: "var(--overlay-text-muted)",
                            margin: "0 0 8px 8px",
                          }}
                        >
                          {section.label}
                        </p>

                        {/* Items in this section */}
                        {section.items.map((item) => (
                          <SortableMenuItem
                            key={item.name}
                            item={item}
                            section={section}
                            isVisible={!config.hidden.includes(item.name)}
                            onToggle={() => toggleItem(item.name)}
                          />
                        ))}
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              {/* ── Footer: Reset (left) + Done (right) — always visible ── */}
              <div
                style={{
                  flexShrink: 0,
                  padding: "12px 20px 16px",
                  paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
                  borderTop: "1px solid var(--customize-modal-border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {/* Reset — ghost button */}
                <button
                  onClick={onReset}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 14,
                    background: "transparent",
                    border: "1px solid var(--customize-modal-border)",
                    color: "var(--overlay-text-secondary)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--overlay-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <RotateCcw size={15} />
                  Reset
                </button>

                {/* Done — solid accent button */}
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 14,
                    background: "#2563EB",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#1D4ED8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#2563EB";
                  }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN MORE MENU SHEET
// ═══════════════════════════════════════════════════════════════

export function MoreMenuSheet({
  isOpen,
  onClose,
  sections,
  quickActions,
  role,
  isRouteAllowed,
}: MoreMenuSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [config, setConfig] = useState<MenuConfig>({ order: [], hidden: [] });

  // Portal mount guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load persisted config
  useEffect(() => {
    const saved = loadConfig();
    if (saved) {
      setConfig(saved);
    } else {
      // Initialize with default order
      const defaultOrder = flattenSections(sections).map((i) => i.name);
      setConfig({ order: defaultOrder, hidden: [] });
    }
  }, [sections]);

  // All items flattened (for customization)
  const allItems = useMemo(() => flattenSections(sections), [sections]);

  // Build visible, ordered, role-filtered sections for display
  const displaySections = useMemo(() => {
    // Build a flat ordered list respecting config.order
    const orderedAll: MoreMenuItem[] = [];
    for (const name of config.order) {
      const item = allItems.find((i) => i.name === name);
      if (item) orderedAll.push(item);
    }
    for (const item of allItems) {
      if (!orderedAll.some((o) => o.name === item.name)) {
        orderedAll.push(item);
      }
    }

    // Filter out hidden + role-restricted items
    const visible = orderedAll.filter((item) => {
      if (config.hidden.includes(item.name)) return false;
      if (role === "Staff" && STAFF_HIDDEN.includes(item.name)) return false;
      if (!isRouteAllowed(role, item.href)) return false;
      return true;
    });

    // Re-group by section for display
    const result: {
      label: string;
      color: string;
      items: MoreMenuItem[];
    }[] = [];

    for (const section of sections) {
      const sectionItems = visible.filter((item) =>
        section.items.some((si) => si.name === item.name)
      );
      if (sectionItems.length > 0) {
        result.push({
          label: section.label,
          color: section.color,
          items: sectionItems,
        });
      }
    }

    return result;
  }, [allItems, config, role, isRouteAllowed, sections]);

  // Navigate to item
  const handleItemClick = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose]
  );

  // Reset config
  const handleReset = useCallback(() => {
    clearConfig();
    const defaultOrder = flattenSections(sections).map((i) => i.name);
    setConfig({ order: defaultOrder, hidden: [] });
    setCustomizeOpen(false);
  }, [sections]);

  if (!mounted) return null;

  return (
    <>
      <MobileSheet
        open={isOpen}
        onClose={() => {
          if (customizeOpen) {
            setCustomizeOpen(false);
          } else {
            setSheetExpanded(false);
            onClose();
          }
        }}
        maxHeight={sheetExpanded ? "92dvh" : "70dvh"}
        showHandle={true}
        dragToClose={true}
        onSheetScroll={(scrollTop) => {
          if (scrollTop > 40 && !sheetExpanded) {
            setSheetExpanded(true);
          }
          if (scrollTop === 0 && sheetExpanded) {
            setSheetExpanded(false);
          }
        }}
      >
        {/* ── Sticky Header ── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "var(--overlay-sheet-bg, #0D1421)",
            borderBottom: "1px solid var(--overlay-border)",
          }}
        >
          <h2
            className="text-[22px] font-semibold tracking-tight"
            style={{ color: "var(--overlay-text-primary)" }}
          >
            More
          </h2>
          <button
            onClick={() => setCustomizeOpen(true)}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-colors duration-150 ease cursor-pointer"
            style={{
              color: "var(--overlay-accent)",
              background: "var(--overlay-hover)",
              border: "1px solid rgba(37, 99, 235, 0.12)",
            }}
            onMouseEnter={(e) =>
            (e.currentTarget.style.background =
              "var(--overlay-active)")
            }
            onMouseLeave={(e) =>
            (e.currentTarget.style.background =
              "var(--overlay-hover)")
            }
          >
            <Settings2 size={14} />
            Customise
          </button>
        </div>

        {/* ── Sticky Quick Actions Row ── */}
        <div
          className="qa-scroll flex gap-2.5 overflow-x-auto px-5 py-4"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            borderBottom: "1px solid var(--overlay-border)",
          }}
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => handleItemClick(action.href)}
                className="flex items-center gap-2 flex-shrink-0 h-[44px] px-4 rounded-xl transition-colors duration-150 ease cursor-pointer"
                style={{
                  background: "rgba(37, 99, 235, 0.06)",
                  border: "1px solid rgba(37, 99, 235, 0.12)",
                  color: "var(--overlay-accent)",
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "rgba(37, 99, 235, 0.10)")
                }
                onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "rgba(37, 99, 235, 0.06)")
                }
              >
                <Plus size={14} strokeWidth={2.5} />
                {action.label}
              </button>
            );
          })}
        </div>

        {/* ── Categorized Sections (free-flowing) ── */}
        <div className="px-4 pt-4 pb-8 space-y-5">
          {displaySections.map((section) => (
            <div key={section.label}>
              {/* Section header */}
              <p
                className="text-[12px] font-medium tracking-[0.08em] uppercase mb-2 px-1"
                style={{ color: "var(--overlay-text-muted)" }}
              >
                {section.label}
              </p>

              {/* Section card container */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "var(--overlay-card-bg)",
                  border: "1px solid var(--overlay-border)",
                }}
              >
                {section.items.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);

                  return (
                    <div key={item.name}>
                      <button
                        onClick={() => handleItemClick(item.href)}
                        className="w-full text-left flex items-center gap-3.5 transition-colors duration-150 ease cursor-pointer"
                        style={{
                          padding: "16px 16px",
                          minHeight: 72,
                          background: isActive
                            ? "var(--overlay-hover)"
                            : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive)
                            e.currentTarget.style.background =
                              "var(--overlay-hover)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive)
                            e.currentTarget.style.background =
                              "transparent";
                        }}
                      >
                        {/* Icon container */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.07]"
                        >
                          <Icon
                            size={20}
                            strokeWidth={1.8}
                            style={{ color: section.color }}
                          />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[15px] font-medium truncate"
                            style={{
                              color: isActive
                                ? "var(--overlay-accent)"
                                : "var(--overlay-text-primary)",
                            }}
                          >
                            {item.name}
                          </p>
                          <p
                            className="text-[12px] truncate mt-0.5"
                            style={{
                              color: "var(--overlay-text-muted)",
                            }}
                          >
                            {item.desc}
                          </p>
                        </div>

                        {/* Chevron */}
                        <ChevronRight
                          size={18}
                          className="flex-shrink-0"
                          style={{
                            color: "var(--overlay-text-muted)",
                            opacity: 0.5,
                          }}
                        />
                      </button>

                      {/* Divider (not after last) */}
                      {idx < section.items.length - 1 && (
                        <div
                          style={{
                            height: 1,
                            marginLeft: 76,
                            marginRight: 16,
                            background: "var(--overlay-border)",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </MobileSheet>

      {/* ── Customization Overlay (layered above, separate portal) ── */}
      {mounted && customizeOpen && createPortal(
        <CustomizationOverlay
          isOpen={customizeOpen}
          onClose={() => setCustomizeOpen(false)}
          allItems={allItems}
          sections={sections}
          config={config}
          onConfigChange={setConfig}
          onReset={handleReset}
        />,
        document.body
      )}
    </>
  );
}
