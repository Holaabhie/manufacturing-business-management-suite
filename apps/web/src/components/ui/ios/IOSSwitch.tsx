/**
 * IOSSwitch — Exact iOS toggle switch replica
 *
 * Dimensions: 51px × 31px
 * Track: OFF → #E5E5EA, ON → #34C759
 * Knob: 27x27px, spring physics animation
 *
 * @example
 * <IOSSwitch checked={isOn} onCheckedChange={setIsOn} />
 */
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface IOSSwitchProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    className?: string;
    id?: string;
}

export const IOSSwitch = React.forwardRef<HTMLButtonElement, IOSSwitchProps>(
    (
        {
            checked = false,
            onCheckedChange,
            disabled = false,
            label,
            className,
            id,
        },
        ref
    ) => {
        const handleToggle = () => {
            if (!disabled && onCheckedChange) {
                onCheckedChange(!checked);
            }
        };

        return (
            <div className={cn('inline-flex items-center gap-3', className)}>
                {label && (
                    <label
                        htmlFor={id}
                        className="text-[17px] text-[var(--label-primary)] cursor-pointer select-none"
                    >
                        {label}
                    </label>
                )}
                <button
                    ref={ref}
                    id={id}
                    role="switch"
                    aria-checked={checked}
                    aria-label={label}
                    disabled={disabled}
                    onClick={handleToggle}
                    className={cn(
                        'relative inline-flex flex-shrink-0',
                        'w-[51px] h-[31px] rounded-full',
                        'transition-colors duration-200',
                        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--ios-blue)] focus-visible:ring-offset-2',
                        disabled && 'opacity-40 cursor-not-allowed',
                        !disabled && 'cursor-pointer'
                    )}
                    style={{
                        backgroundColor: checked
                            ? 'var(--ios-green)'
                            : 'var(--ios-gray5)',
                    }}
                >
                    <motion.span
                        className={cn(
                            'absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white',
                            'shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.06)]'
                        )}
                        animate={{
                            x: checked ? 22 : 2,
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 700,
                            damping: 30,
                        }}
                    />
                </button>
            </div>
        );
    }
);

IOSSwitch.displayName = 'IOSSwitch';
