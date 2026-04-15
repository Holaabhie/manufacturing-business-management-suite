/**
 * IOSFormElements — iOS-style form input components
 *
 * Components: IOSInput, IOSTextarea, IOSSelect, IOSCheckbox, IOSRadioGroup
 * Features: 44px height, #F2F2F7 background, blue focus ring, error states
 *
 * @example
 * <IOSInput label="Product Name" placeholder="Enter name" />
 * <IOSSelect label="Category" options={[{label:'Option', value:'1'}]} />
 */
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── IOSInput ─────────────────────────────────── */
export interface IOSInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const IOSInput = React.forwardRef<HTMLInputElement, IOSInputProps>(
    ({ label, error, helperText, leftIcon, rightIcon, className, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="block text-[13px] font-normal text-[var(--label-secondary)] leading-[18px] px-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--label-tertiary)]">
                            {leftIcon}
                        </span>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            'w-full h-[44px] rounded-[10px]',
                            'bg-[var(--fill-tertiary)] dark:bg-[var(--fill-quaternary)]',
                            'text-[17px] text-[var(--label-primary)]',
                            'placeholder:text-[var(--label-tertiary)]',
                            'outline-none border-none',
                            'transition-shadow duration-200',
                            'focus:ring-2 focus:ring-[var(--ios-blue)]',
                            error && 'ring-2 ring-[var(--ios-red)]',
                            leftIcon ? 'pl-10' : 'pl-4',
                            rightIcon ? 'pr-10' : 'pr-4',
                            'disabled:opacity-40',
                            className
                        )}
                        {...props}
                    />
                    {rightIcon && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--label-tertiary)]">
                            {rightIcon}
                        </span>
                    )}
                </div>
                {error && (
                    <p className="text-[13px] text-[var(--ios-red)] leading-[18px] px-1">{error}</p>
                )}
                {helperText && !error && (
                    <p className="text-[13px] text-[var(--label-secondary)] leading-[18px] px-1">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

IOSInput.displayName = 'IOSInput';

/* ── IOSTextarea ──────────────────────────────── */
export interface IOSTextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const IOSTextarea = React.forwardRef<HTMLTextAreaElement, IOSTextareaProps>(
    ({ label, error, helperText, className, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="block text-[13px] font-normal text-[var(--label-secondary)] leading-[18px] px-1">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    className={cn(
                        'w-full min-h-[88px] rounded-[10px] p-4',
                        'bg-[var(--fill-tertiary)] dark:bg-[var(--fill-quaternary)]',
                        'text-[17px] text-[var(--label-primary)]',
                        'placeholder:text-[var(--label-tertiary)]',
                        'outline-none border-none resize-y',
                        'transition-shadow duration-200',
                        'focus:ring-2 focus:ring-[var(--ios-blue)]',
                        error && 'ring-2 ring-[var(--ios-red)]',
                        'disabled:opacity-40',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-[13px] text-[var(--ios-red)] leading-[18px] px-1">{error}</p>
                )}
                {helperText && !error && (
                    <p className="text-[13px] text-[var(--label-secondary)] leading-[18px] px-1">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

IOSTextarea.displayName = 'IOSTextarea';

/* ── IOSSelect ────────────────────────────────── */
export interface IOSSelectOption {
    label: string;
    value: string;
}

export interface IOSSelectProps
    extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    label?: string;
    error?: string;
    options: IOSSelectOption[];
    placeholder?: string;
}

export const IOSSelect = React.forwardRef<HTMLSelectElement, IOSSelectProps>(
    ({ label, error, options, placeholder, className, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="block text-[13px] font-normal text-[var(--label-secondary)] leading-[18px] px-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={cn(
                            'w-full h-[44px] rounded-[10px] appearance-none',
                            'bg-[var(--fill-tertiary)] dark:bg-[var(--fill-quaternary)]',
                            'text-[17px] text-[var(--label-primary)]',
                            'outline-none border-none',
                            'pl-4 pr-10',
                            'transition-shadow duration-200',
                            'focus:ring-2 focus:ring-[var(--ios-blue)]',
                            error && 'ring-2 ring-[var(--ios-red)]',
                            'disabled:opacity-40 cursor-pointer',
                            className
                        )}
                        {...props}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        size={20}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--label-tertiary)] pointer-events-none"
                    />
                </div>
                {error && (
                    <p className="text-[13px] text-[var(--ios-red)] leading-[18px] px-1">{error}</p>
                )}
            </div>
        );
    }
);

IOSSelect.displayName = 'IOSSelect';

/* ── IOSCheckbox ──────────────────────────────── */
export interface IOSCheckboxProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export function IOSCheckbox({
    checked = false,
    onCheckedChange,
    label,
    disabled = false,
    className,
    id,
}: IOSCheckboxProps) {
    return (
        <div className={cn('inline-flex items-center gap-3', className)}>
            <motion.button
                id={id}
                role="checkbox"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onCheckedChange?.(!checked)}
                className={cn(
                    'w-[22px] h-[22px] rounded-[6px] flex items-center justify-center',
                    'transition-colors duration-200 cursor-pointer',
                    'outline-none focus-visible:ring-2 focus-visible:ring-[var(--ios-blue)] focus-visible:ring-offset-2',
                    checked
                        ? 'bg-[var(--ios-blue)]'
                        : 'bg-transparent border-2 border-[var(--ios-gray3)] dark:border-[var(--ios-gray4)]',
                    disabled && 'opacity-40 cursor-not-allowed'
                )}
                whileTap={!disabled ? { scale: 0.85 } : undefined}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
                {checked && <Check size={14} className="text-white" strokeWidth={3} />}
            </motion.button>
            {label && (
                <label
                    htmlFor={id}
                    className={cn(
                        'text-[17px] text-[var(--label-primary)] leading-[22px] cursor-pointer select-none',
                        disabled && 'opacity-40 cursor-not-allowed'
                    )}
                >
                    {label}
                </label>
            )}
        </div>
    );
}

/* ── IOSRadioGroup ────────────────────────────── */
export interface IOSRadioOption {
    label: string;
    value: string;
    description?: string;
}

export interface IOSRadioGroupProps {
    value?: string;
    onValueChange?: (value: string) => void;
    options: IOSRadioOption[];
    label?: string;
    disabled?: boolean;
    className?: string;
}

export function IOSRadioGroup({
    value,
    onValueChange,
    options,
    label,
    disabled = false,
    className,
}: IOSRadioGroupProps) {
    return (
        <div className={cn('space-y-1.5', className)}>
            {label && (
                <label className="block text-[13px] font-normal text-[var(--label-secondary)] leading-[18px] px-1">
                    {label}
                </label>
            )}
            <div className="bg-[var(--bg-card)] rounded-[10px] border border-[var(--border-card)] overflow-hidden divide-y divide-[rgba(60,60,67,0.08)] dark:divide-[rgba(84,84,88,0.2)]">
                {options.map((opt) => (
                    <motion.button
                        key={opt.value}
                        onClick={() => !disabled && onValueChange?.(opt.value)}
                        className={cn(
                            'w-full flex items-center gap-3 min-h-[44px] px-4 py-2.5 text-left cursor-pointer',
                            'transition-colors duration-150',
                            'active:bg-[rgba(0,0,0,0.04)] dark:active:bg-[rgba(255,255,255,0.04)]',
                            disabled && 'opacity-40 cursor-not-allowed'
                        )}
                        whileTap={!disabled ? { scale: 0.98 } : undefined}
                    >
                        <span
                            className={cn(
                                'w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0',
                                'transition-colors duration-200',
                                value === opt.value
                                    ? 'border-[var(--ios-blue)] bg-[var(--ios-blue)]'
                                    : 'border-[var(--ios-gray3)] dark:border-[var(--ios-gray4)]'
                            )}
                        >
                            {value === opt.value && (
                                <span className="w-[8px] h-[8px] rounded-full bg-white" />
                            )}
                        </span>
                        <div className="flex-1 min-w-0">
                            <span className="text-[17px] text-[var(--label-primary)] leading-[22px] block">
                                {opt.label}
                            </span>
                            {opt.description && (
                                <span className="text-[13px] text-[var(--label-secondary)] leading-[18px] block">
                                    {opt.description}
                                </span>
                            )}
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
