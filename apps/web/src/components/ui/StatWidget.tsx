"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Framer motion animation variants matching the dashboard's staggerItem
const staggerItem = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
};

// ─── Animated Counter ────────────────────────────────────
export function AnimatedValue({
    value,
    prefix = "",
    suffix = "",
}: {
    value: number;
    prefix?: string;
    suffix?: string;
}) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const duration = 800;
        const start = performance.now();
        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
            setDisplayValue(Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);

    return (
        <span>
            {prefix}
            {displayValue.toLocaleString("en-IN")}
            {suffix}
        </span>
    );
}

// ─── Stat Widget — Stitch Premium KPI Card ────────────────
export function StatWidget({
    label,
    value,
    displayValue,
    change,
    icon: Icon,
    color,
    prefix = "",
    suffix = "",
    delay = 0,
    href,
}: {
    label: string;
    value: number;
    /** When set, shown instead of animated numeric value (e.g. formatted currency) */
    displayValue?: string;
    change?: number | null;
    icon: any;
    color: "blue" | "green" | "orange" | "purple" | "red" | "gray";
    prefix?: string;
    suffix?: string;
    delay?: number;
    href?: string;
}) {
    const router = useRouter();
    // Guard: if change is null, undefined, or NaN, hide the badge entirely
    const hasValidChange = change != null && !isNaN(change);
    const isPositive = hasValidChange && change >= 0;
    const isNeutral = !hasValidChange || change === 0;

    // Map color to the progress fill variant and badge variant
    const badgeClass = cn(
        "kpi-card__badge",
        !hasValidChange || change === 0
            ? "kpi-card__badge--neutral !bg-gray-100 !text-gray-800 dark:!bg-white/10 dark:!text-white/60"
            : isPositive
                ? "kpi-card__badge--positive !bg-[#EAF3DE] !text-[#27500A] dark:!bg-[rgba(48,209,88,0.15)] dark:!text-[#30d158]"
                : "kpi-card__badge--negative !bg-red-100 !text-red-800 dark:!bg-[rgba(255,69,58,0.15)] dark:!text-[#ff453a]"
    );

    return (
        <motion.div variants={staggerItem} custom={delay} className="min-w-0 w-full overflow-hidden rounded-[20px]">
            <div
                className="kpi-card relative min-w-0"
                tabIndex={0}
                role={href ? "link" : "article"}
                aria-label={`${label}: ${prefix}${value.toLocaleString("en-IN")}${suffix}${hasValidChange && change !== 0 ? `, ${isPositive ? "up" : "down"} ${Math.abs(change)}%` : ""}`}
                onClick={href ? () => router.push(href) : undefined}
            >
                {/* Header: Icon + Badge */}
                <div className="kpi-card__header">
                    {/* Stitch-enhanced icon tile with colored glow */}
                    <div className={`kpi-card__icon kpi-card__icon--${color} shrink-0`}>
                        <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    {/* Trend badge — hide entirely if no valid change or 0% */}
                    {hasValidChange && change !== 0 && (
                        <div className={badgeClass}>
                            {isPositive
                                ? <TrendingUp className="h-3 w-3" />
                                : <TrendingDown className="h-3 w-3" />
                            }
                            {Math.abs(change)}%
                        </div>
                    )}
                </div>

                {/* Metric + Label */}
                <div className="kpi-card__value !text-gray-900 dark:!text-white truncate text-sm sm:text-base lg:text-lg xl:text-xl">
                    {displayValue != null ? (
                        <span>{displayValue}</span>
                    ) : (
                        <AnimatedValue value={value} prefix={prefix} suffix={suffix} />
                    )}
                </div>
                <div className="kpi-card__label !text-gray-500 dark:!text-[rgba(255,255,255,0.5)] text-xs truncate">{label}</div>

                {/* Stitch mini-progress bar (decorative, color-keyed) */}
                <div className="kpi-card__progress">
                    <div
                        className={`kpi-card__progress-fill kpi-card__progress-fill--${color}`}
                        style={{ "--progress-width": "75%" } as React.CSSProperties}
                    />
                </div>

            </div>
        </motion.div>
    );
}

// ─── Empty Widget Slot (Placeholder) ───────────────────────
export function EmptyWidgetSlot({
    onAdd,
    delay = 0,
}: {
    onAdd: () => void;
    delay?: number;
}) {
    return (
        <motion.div variants={staggerItem} custom={delay}>
            <div
                className="kpi-card flex flex-col items-center justify-center cursor-pointer border-dashed dark:border-white/[0.18] border-gray-300 dark:bg-white/[0.03] bg-gray-50"
                onClick={onAdd}
                role="button"
                tabIndex={0}
                aria-label="Add Widget"
                style={{ height: "100%" }}
            >
                <div
                    className="w-12 h-12 rounded-[14px] dark:bg-white/10 bg-gray-100 dark:border-white/[0.15] border-gray-200 border flex items-center justify-center dark:text-white/50 text-gray-400 mb-3"
                    style={{
                        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.08)",
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <div className="text-sm font-medium dark:text-[rgba(186,214,243,0.6)] text-gray-400 tracking-[0.01em]">Add Widget</div>
            </div>
        </motion.div>
    );
}
