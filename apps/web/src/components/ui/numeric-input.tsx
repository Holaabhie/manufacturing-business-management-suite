"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────

export interface NumericInputProps
    extends Omit<
        React.InputHTMLAttributes<HTMLInputElement>,
        "value" | "onChange" | "type"
    > {
    /** Current numeric value (number, string, null, or undefined) */
    value: number | string | null | undefined;
    /** Called with the raw string for controlled input */
    onValueChange: (value: string) => void;
    /** Allow decimal input (default: true) */
    allowDecimal?: boolean;
    /** Allow negative numbers (default: false) */
    allowNegative?: boolean;
    /** Minimum value — clamp on blur */
    min?: number;
    /** Maximum value — clamp on blur */
    max?: number;
    /** Prefix shown inside the input (e.g. "₹") */
    prefix?: string;
    /** Suffix shown inside the input (e.g. "kg") */
    suffix?: string;
}

/**
 * NumericInput — A controlled numeric input that:
 *  • Shows EMPTY instead of 0 when no value
 *  • Prevents leading zeros (e.g. "012")
 *  • Supports decimal input
 *  • Treats empty field as 0 internally (on blur)
 *  • Works like a regular text input (no scroll hijacking from type="number")
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
    (
        {
            value,
            onValueChange,
            allowDecimal = true,
            allowNegative = false,
            min,
            max,
            prefix,
            suffix,
            className,
            placeholder,
            onBlur,
            ...props
        },
        ref
    ) => {
        // Convert the internal value to display string
        const displayValue = React.useMemo(() => {
            if (value === null || value === undefined || value === "") return "";
            // If it's a string that the user is actively typing (e.g. "12." or "-")
            if (typeof value === "string") return value;
            // If it's a number, show it (but not 0 — show empty)
            if (typeof value === "number") {
                if (value === 0) return "";
                return String(value);
            }
            return "";
        }, [value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            let raw = e.target.value;

            // Allow empty
            if (raw === "") {
                onValueChange("");
                return;
            }

            // Allow just a minus sign while typing
            if (allowNegative && raw === "-") {
                onValueChange("-");
                return;
            }

            // Allow typing a decimal point (e.g. "12." or "0." or ".")
            if (allowDecimal && (raw === "." || raw.endsWith("."))) {
                // Validate the rest is a valid partial number
                const withoutDot = raw.slice(0, -1);
                if (withoutDot === "" || withoutDot === "-" || !isNaN(Number(withoutDot))) {
                    onValueChange(raw);
                    return;
                }
            }

            // Remove leading zeros (but keep "0." for decimals)
            if (raw.length > 1 && raw.startsWith("0") && !raw.startsWith("0.")) {
                raw = raw.replace(/^0+/, "") || "0";
            }
            if (
                allowNegative &&
                raw.length > 2 &&
                raw.startsWith("-0") &&
                !raw.startsWith("-0.")
            ) {
                raw = "-" + raw.slice(1).replace(/^0+/, "");
            }

            // Validate the input is a valid number
            const numRegex = allowDecimal
                ? allowNegative
                    ? /^-?\d*\.?\d*$/
                    : /^\d*\.?\d*$/
                : allowNegative
                    ? /^-?\d*$/
                    : /^\d*$/;

            if (!numRegex.test(raw)) return; // Reject invalid characters

            onValueChange(raw);
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            let finalValue = displayValue;

            // Clean up trailing decimals (e.g. "12." → "12")
            if (finalValue.endsWith(".")) {
                finalValue = finalValue.slice(0, -1);
            }

            // Clean up lone minus
            if (finalValue === "-") {
                finalValue = "";
            }

            // Clamp to min/max
            if (finalValue !== "") {
                let num = Number(finalValue);
                if (min !== undefined && num < min) num = min;
                if (max !== undefined && num > max) num = max;
                finalValue = String(num);
            }

            if (finalValue !== displayValue) {
                onValueChange(finalValue);
            }

            onBlur?.(e);
        };

        return (
            <div className="relative">
                {prefix && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none">
                        {prefix}
                    </span>
                )}
                <Input
                    ref={ref}
                    type="text"
                    inputMode={allowDecimal ? "decimal" : "numeric"}
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder ?? ""}
                    className={cn(
                        prefix && "pl-8",
                        suffix && "pr-10",
                        className
                    )}
                    autoComplete="off"
                    {...props}
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none select-none">
                        {suffix}
                    </span>
                )}
            </div>
        );
    }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };

// ─── Helper: Parse value for form submission ─────────────────────

/**
 * Safely parse a NumericInput value to a number.
 * Returns 0 for empty/null/undefined/NaN values.
 */
export function parseNumericValue(
    value: string | number | null | undefined,
    fallback: number = 0
): number {
    if (value === null || value === undefined || value === "") return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
}
