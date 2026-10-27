"use client";

import React, { forwardRef } from "react";
import { Label } from "@/components/ui/label";
import { AlertCircle, Phone } from "lucide-react";

export interface PhoneFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  helperText?: string;
  value: string;
  onChange: (value: string) => void;
}

export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(
  (
    {
      id = "phone-field",
      label = "Mobile Phone Number",
      error,
      helperText,
      value,
      onChange,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    // Keep only numbers up to 10 digits
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(/\D/g, "");
      if (raw.startsWith("91") && raw.length > 10) {
        raw = raw.substring(2);
      }
      if (raw.startsWith("0")) {
        raw = raw.substring(1);
      }
      if (raw.length > 10) {
        raw = raw.substring(0, 10);
      }
      onChange(raw);
    };

    return (
      <div className="space-y-1.5 w-full text-left">
        {label && (
          <Label
            htmlFor={id}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none"
          >
            {label}
          </Label>
        )}

        <div
          className={`group flex items-center h-12 w-full rounded-xl border bg-muted/40 dark:bg-white/[0.04] transition-all overflow-hidden ${
            error
              ? "border-red-500/80 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500"
              : "border-border hover:border-border/80 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {/* +91 Country Chip */}
          <div className="flex items-center gap-1.5 h-full px-3.5 bg-muted/60 dark:bg-white/[0.05] border-r border-border text-foreground text-xs font-semibold select-none shrink-0 group-focus-within:border-indigo-500/50 transition-colors">
            <Phone className="h-3.5 w-3.5 text-indigo-500" />
            <span>+91</span>
          </div>

          <input
            id={id}
            ref={ref}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            disabled={disabled}
            placeholder="98765 43210"
            value={value}
            onChange={handleInputChange}
            className={`flex-1 h-full bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none shadow-none tracking-wide ${
              className || ""
            }`}
            {...props}
          />
        </div>

        {error ? (
          <p className="text-xs text-red-500 flex items-center gap-1.5 pt-0.5 animate-in fade-in duration-200">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-muted-foreground/80 pt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

PhoneField.displayName = "PhoneField";
