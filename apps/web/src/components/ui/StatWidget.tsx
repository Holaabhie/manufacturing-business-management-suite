"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

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
    change: number;
    icon: any;
    color: "blue" | "green" | "orange" | "purple" | "red" | "gray";
    prefix?: string;
    suffix?: string;
    delay?: number;
    href?: string;
}) {
    const router = useRouter();
    const isPositive = change >= 0;
    const isNeutral = change === 0;

    // Map color to the progress fill variant and badge variant
    const badgeClass = isNeutral
        ? "kpi-card__badge kpi-card__badge--neutral"
        : isPositive
            ? "kpi-card__badge kpi-card__badge--positive"
            : "kpi-card__badge kpi-card__badge--negative";

    return (
        <motion.div variants={staggerItem} custom={delay}>
            <div
                className="kpi-card relative min-w-0"
                tabIndex={0}
                role={href ? "link" : "article"}
                aria-label={`${label}: ${prefix}${value.toLocaleString("en-IN")}${suffix}, ${isPositive ? "up" : "down"} ${Math.abs(change)}%`}
                onClick={href ? () => router.push(href) : undefined}
            >
                {/* Header: Icon + Badge */}
                <div className="kpi-card__header">
                    {/* Stitch-enhanced icon tile with colored glow */}
                    <div className={`kpi-card__icon kpi-card__icon--${color}`}>
                        <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    {/* Trend badge — hide entirely if 0% change to avoid looking like a minus button */}
                    {!isNeutral && (
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
                <div className="kpi-card__value truncate">
                    <AnimatedValue value={value} prefix={prefix} suffix={suffix} />
                </div>
                <div className="kpi-card__label truncate">{label}</div>

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
                className="kpi-card flex flex-col items-center justify-center cursor-pointer"
                onClick={onAdd}
                role="button"
                tabIndex={0}
                aria-label="Add Widget"
                style={{
                    borderStyle: "dashed",
                    borderColor: "rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.03)",
                    height: "100%",
                }}
            >
                <div
                    style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.10)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(255,255,255,0.5)",
                        marginBottom: "12px",
                        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.15)",
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "rgba(186,214,243,0.6)", letterSpacing: "0.01em" }}>Add Widget</div>
            </div>
        </motion.div>
    );
}
