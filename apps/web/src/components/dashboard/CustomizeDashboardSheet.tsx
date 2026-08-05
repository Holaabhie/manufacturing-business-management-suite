"use client";

import React, { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import "./CustomizeDashboardSheet.css";

export interface WidgetConfig {
  widget_type: string;
  widget_position: number;
  is_visible: boolean;
}

export interface WidgetRegistryItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "purple" | "orange" | "red" | "pink" | "amber" | string;
  prefix?: string;
}

export interface CustomizeDashboardSheetProps {
  open: boolean;
  onClose: () => void;
  widgetLayout: WidgetConfig[];
  availableWidgets: WidgetRegistryItem[];
  onToggleWidget: (widgetType: string, visible: boolean) => void;
  onReorderWidgets: (newLayout: WidgetConfig[]) => void;
}

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-600 dark:text-blue-400" },
  green: { bg: "bg-emerald-50 dark:bg-emerald-950/50", text: "text-emerald-600 dark:text-emerald-400" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/50", text: "text-purple-600 dark:text-purple-400" },
  orange: { bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-600 dark:text-amber-400" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-600 dark:text-amber-400" },
  red: { bg: "bg-red-50 dark:bg-red-950/50", text: "text-red-600 dark:text-red-400" },
  pink: { bg: "bg-pink-50 dark:bg-pink-950/50", text: "text-pink-600 dark:text-pink-400" },
};

interface SortableWidgetRowProps {
  widget: WidgetRegistryItem;
  isVisible: boolean;
  disabled: boolean;
  onToggle: (checked: boolean) => void;
}

function SortableWidgetRow({
  widget,
  isVisible,
  disabled,
  onToggle,
}: SortableWidgetRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = widget.icon;
  const colorStyle = COLOR_MAP[widget.color] || COLOR_MAP.blue;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "customize-sheet__row flex items-center justify-between p-3 rounded-2xl transition-all duration-150 border border-transparent",
        isDragging && "opacity-50 shadow-md bg-slate-100 dark:bg-white/10 z-10",
        !isDragging && "hover:bg-[#F5F7FB] dark:hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${widget.id}`}
          className="customize-sheet__drag-handle p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Colored Icon Badge */}
        <div
          className={cn(
            "w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-colors",
            colorStyle.bg
          )}
        >
          <IconComponent className={cn("w-5 h-5", colorStyle.text)} />
        </div>

        {/* Title + Status Subtext */}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-slate-900 dark:text-white truncate leading-snug">
            {widget.id}
          </p>
          <p className="text-[13px] text-[#6B7280] dark:text-slate-400 truncate leading-tight mt-0.5">
            {isVisible ? "Shown on dashboard" : "Hidden from dashboard"}
          </p>
          {disabled && !isVisible && (
            <p className="text-[12px] text-amber-600 dark:text-amber-400 font-medium leading-tight mt-1">
              Maximum 4 widgets — hide one to add another
            </p>
          )}
        </div>
      </div>

      {/* iOS-Style Toggle Switch */}
      <div className="ml-3 shrink-0">
        <Switch
          id={`toggle-${widget.id.replace(/\s+/g, "-").toLowerCase()}`}
          checked={isVisible}
          onCheckedChange={onToggle}
          disabled={disabled && !isVisible}
          aria-label={`Toggle ${widget.id} visibility`}
          aria-checked={isVisible}
          role="switch"
          className="data-[state=checked]:bg-[#2563EB]"
        />
      </div>
    </div>
  );
}

export function CustomizeDashboardSheet({
  open,
  onClose,
  widgetLayout,
  availableWidgets,
  onToggleWidget,
  onReorderWidgets,
}: CustomizeDashboardSheetProps) {
  const visibleCount = useMemo(
    () => widgetLayout.filter((w) => w.is_visible).length,
    [widgetLayout]
  );
  const isAtCap = visibleCount >= 4;

  // Build sorted items based on current widgetLayout positions
  const orderedWidgets = useMemo(() => {
    const layoutMap = new Map<string, WidgetConfig>();
    widgetLayout.forEach((w) => layoutMap.set(w.widget_type, w));

    return [...availableWidgets].sort((a, b) => {
      const configA = layoutMap.get(a.id);
      const configB = layoutMap.get(b.id);

      const isVisA = configA ? configA.is_visible : false;
      const isVisB = configB ? configB.is_visible : false;

      if (isVisA && !isVisB) return -1;
      if (!isVisA && isVisB) return 1;

      if (isVisA && isVisB) {
        return (configA?.widget_position ?? 0) - (configB?.widget_position ?? 0);
      }

      return 0;
    });
  }, [availableWidgets, widgetLayout]);

  const widgetIds = useMemo(() => orderedWidgets.map((w) => w.id), [orderedWidgets]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = widgetIds.indexOf(active.id as string);
    const newIndex = widgetIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedList = arrayMove(orderedWidgets, oldIndex, newIndex);

    // Assign unique sequential widget_positions to visible widgets first, then hidden widgets
    let visiblePos = 0;
    let hiddenPos = reorderedList.filter((w) => {
      const existing = widgetLayout.find((item) => item.widget_type === w.id);
      return existing ? existing.is_visible : false;
    }).length;

    const newLayout: WidgetConfig[] = reorderedList.map((w) => {
      const existing = widgetLayout.find((item) => item.widget_type === w.id);
      const isVisible = existing ? existing.is_visible : false;
      if (isVisible) {
        return { widget_type: w.id, widget_position: visiblePos++, is_visible: true };
      }
      return {
        widget_type: w.id,
        widget_position: hiddenPos++,
        is_visible: false,
      };
    });

    onReorderWidgets(newLayout);
  };

  const handleToggle = (widgetType: string, checked: boolean) => {
    onToggleWidget(widgetType, checked);
  };

  return (
    <div className="customize-dashboard-sheet-root">
      <MobileSheet
        open={open}
        onClose={onClose}
        maxHeight="90dvh"
        maxWidth="520px"
        showHandle={true}
        className="customize-sheet__container"
      >
        <div className="px-6 pt-2 pb-6 flex flex-col h-full bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white rounded-t-[28px]">
          {/* Header Row */}
          <div className="flex items-center justify-between pb-1 pt-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Customize dashboard
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-[15px] px-2 py-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              Done
            </button>
          </div>

          {/* Subtext */}
          <p className="text-[13px] text-[#6B7280] dark:text-slate-400 pb-4 border-b border-[#EAECF1] dark:border-white/10">
            Drag to reorder · toggle to show or hide
          </p>

          {/* Widget List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-1 pr-1 -mr-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={widgetIds}
                strategy={verticalListSortingStrategy}
              >
                {orderedWidgets.map((widget) => {
                  const config = widgetLayout.find((w) => w.widget_type === widget.id);
                  const isVisible = config ? config.is_visible : false;

                  return (
                    <SortableWidgetRow
                      key={widget.id}
                      widget={widget}
                      isVisible={isVisible}
                      disabled={isAtCap}
                      onToggle={(checked) => handleToggle(widget.id, checked)}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>

          {/* Footer Microcopy */}
          <div className="pt-3 border-t border-[#EAECF1] dark:border-white/10 text-center shrink-0">
            <p className="text-[12px] font-medium text-[#6B7280] dark:text-slate-400 tracking-wide uppercase">
              Changes save automatically
            </p>
          </div>
        </div>
      </MobileSheet>
    </div>
  );
}
