"use client";

import React, { useState, forwardRef, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showStrength?: boolean;
  rightLabelAction?: React.ReactNode;
  helperText?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  (
    {
      id = "password-field",
      label = "Password",
      error,
      showStrength = false,
      rightLabelAction,
      helperText,
      value,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const pwd = typeof value === "string" ? value : "";

    const strength = useMemo(() => {
      if (!pwd) return { score: 0, label: "", color: "" };
      let score = 0;
      if (pwd.length >= 8) score += 20;
      if (pwd.length >= 12) score += 10;
      if (pwd.length >= 16) score += 10;
      if (/[A-Z]/.test(pwd)) score += 15;
      if (/[a-z]/.test(pwd)) score += 10;
      if (/[0-9]/.test(pwd)) score += 15;
      if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
      score = Math.min(100, score);
      if (score < 30) return { score, label: "Weak", color: "bg-red-500" };
      if (score < 55) return { score, label: "Fair", color: "bg-amber-500" };
      if (score < 80) return { score, label: "Good", color: "bg-blue-500" };
      return { score, label: "Strong", color: "bg-emerald-500" };
    }, [pwd]);

    return (
      <div className="space-y-1.5 w-full text-left">
        {(label || rightLabelAction) && (
          <div className="flex items-center justify-between">
            {label && (
              <Label
                htmlFor={id}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none"
              >
                {label}
              </Label>
            )}
            {rightLabelAction && <div>{rightLabelAction}</div>}
          </div>
        )}

        <div
          className={`group flex items-center h-12 w-full rounded-xl border bg-muted/40 dark:bg-white/[0.04] transition-all overflow-hidden ${
            error
              ? "border-red-500/80 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500"
              : "border-border hover:border-border/80 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {/* Leading Icon */}
          <div className="flex items-center justify-center pl-3.5 pr-1 text-muted-foreground group-focus-within:text-indigo-500 transition-colors shrink-0">
            <Lock className="h-4 w-4" />
          </div>

          <input
            id={id}
            ref={ref}
            type={showPassword ? "text" : "password"}
            disabled={disabled}
            value={value}
            className={`flex-1 h-full bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none shadow-none ${
              className || ""
            }`}
            {...props}
          />

          {/* Toggle Password Visibility */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="flex items-center justify-center pr-3 pl-2 text-muted-foreground hover:text-foreground transition-colors shrink-0 outline-none"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={showPassword ? "off" : "on"}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>

        {/* Strength Meter */}
        {showStrength && pwd && (
          <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted/60 dark:bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${strength.score}%` }}
                  className={`h-full rounded-full transition-colors ${strength.color}`}
                />
              </div>
              <span
                className={`text-xs font-semibold ${
                  strength.score < 30
                    ? "text-red-500"
                    : strength.score < 55
                    ? "text-amber-500"
                    : strength.score < 80
                    ? "text-blue-500"
                    : "text-emerald-500"
                }`}
              >
                {strength.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span
                className={`text-[10px] flex items-center gap-1 ${
                  pwd.length >= 8 ? "text-emerald-500 font-medium" : "text-muted-foreground"
                }`}
              >
                {pwd.length >= 8 ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}{" "}
                8+ chars
              </span>
              <span
                className={`text-[10px] flex items-center gap-1 ${
                  /[A-Z]/.test(pwd) ? "text-emerald-500 font-medium" : "text-muted-foreground"
                }`}
              >
                {/[A-Z]/.test(pwd) ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}{" "}
                Uppercase
              </span>
              <span
                className={`text-[10px] flex items-center gap-1 ${
                  /[0-9]/.test(pwd) ? "text-emerald-500 font-medium" : "text-muted-foreground"
                }`}
              >
                {/[0-9]/.test(pwd) ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}{" "}
                Number
              </span>
            </div>
          </div>
        )}

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

PasswordField.displayName = "PasswordField";
