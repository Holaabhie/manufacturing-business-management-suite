"use client";

import React, { forwardRef } from "react";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

export interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingElement?: React.ReactNode;
  rightLabelAction?: React.ReactNode;
  helperText?: string;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  (
    {
      id,
      label,
      error,
      leadingIcon,
      trailingElement,
      rightLabelAction,
      helperText,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
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
          {leadingIcon && (
            <div className="flex items-center justify-center pl-3.5 pr-2 text-muted-foreground group-focus-within:text-indigo-500 transition-colors shrink-0">
              {leadingIcon}
            </div>
          )}

          <input
            id={id}
            ref={ref}
            disabled={disabled}
            className={`flex-1 h-full bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none shadow-none ${
              !leadingIcon ? "pl-4" : ""
            } ${!trailingElement ? "pr-4" : ""} ${className || ""}`}
            {...props}
          />

          {trailingElement && (
            <div className="flex items-center pr-3 shrink-0">{trailingElement}</div>
          )}
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

AuthField.displayName = "AuthField";
