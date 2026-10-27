"use client";

import React, { useRef } from "react";
import { AlertCircle } from "lucide-react";

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export function OtpInput({
  value = "",
  onChange,
  length = 6,
  disabled = false,
  error,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    const combined = newDigits.join("").slice(0, length);
    onChange(combined);

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted);
      const focusIndex = Math.min(pasted.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="space-y-2 w-full flex flex-col items-center">
      <div className="flex items-center gap-2 sm:gap-3 justify-center">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`w-11 h-12 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl border bg-muted/40 dark:bg-white/[0.04] transition-all overflow-hidden ${
              error
                ? "border-red-500/80 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500"
                : digits[i]
                ? "border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500"
                : "border-border hover:border-border/80 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoFocus={autoFocus && i === 0}
              disabled={disabled}
              value={digits[i]}
              onChange={(e) => handleChange(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-full h-full text-center text-lg font-bold text-foreground bg-transparent border-none outline-none focus:outline-none focus:ring-0 shadow-none select-none"
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1.5 pt-1 animate-in fade-in duration-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
