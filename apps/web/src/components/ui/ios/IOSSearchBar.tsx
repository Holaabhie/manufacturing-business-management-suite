/**
 * IOSSearchBar — iOS-style search bar
 *
 * Features: 36px height, inset background, animated clear button,
 * sliding cancel button, focus ring
 *
 * @example
 * <IOSSearchBar
 *   value={query}
 *   onValueChange={setQuery}
 *   placeholder="Search inventory..."
 * />
 */
'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface IOSSearchBarProps {
    value?: string;
    onValueChange?: (value: string) => void;
    onSubmit?: (value: string) => void;
    placeholder?: string;
    className?: string;
    showCancelOnFocus?: boolean;
}

export const IOSSearchBar = React.forwardRef<HTMLInputElement, IOSSearchBarProps>(
    (
        {
            value = '',
            onValueChange,
            onSubmit,
            placeholder = 'Search',
            className,
            showCancelOnFocus = true,
        },
        ref
    ) => {
        const [isFocused, setIsFocused] = useState(false);
        const innerRef = useRef<HTMLInputElement>(null);
        const inputRef = (ref as React.RefObject<HTMLInputElement>) || innerRef;

        const handleClear = () => {
            onValueChange?.('');
            inputRef.current?.focus();
        };

        const handleCancel = () => {
            onValueChange?.('');
            setIsFocused(false);
            inputRef.current?.blur();
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                onSubmit?.(value);
            }
            if (e.key === 'Escape') {
                handleCancel();
            }
        };

        return (
            <div className={cn('flex items-center gap-2', className)}>
                <div
                    className={cn(
                        'relative flex items-center flex-1',
                        'h-[36px] rounded-[10px]',
                        'bg-[var(--muted)]',
                        'transition-all duration-200',
                        isFocused && 'ring-2 ring-[var(--primary)]'
                    )}
                >
                    <Search
                        className="absolute left-[8px] text-[var(--muted-foreground)]"
                        size={17}
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => onValueChange?.(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => !value && setIsFocused(false)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className={cn(
                            'w-full h-full bg-transparent',
                            'pl-[32px] pr-[32px]',
                            'text-[17px] text-[var(--foreground)]',
                            'placeholder:text-[var(--muted-foreground)]',
                            'outline-none border-none',
                            'leading-[22px]'
                        )}
                    />
                    <AnimatePresence>
                        {value && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                onClick={handleClear}
                                className={cn(
                                    'absolute right-[8px]',
                                    'w-[18px] h-[18px] rounded-full',
                                    'bg-[var(--accent)] flex items-center justify-center',
                                    'hover:bg-[var(--fill-primary)]',
                                    'cursor-pointer'
                                )}
                                aria-label="Clear search"
                            >
                                <X size={12} className="text-[var(--muted-foreground)]" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                <AnimatePresence>
                    {showCancelOnFocus && isFocused && (
                        <motion.button
                            initial={{ opacity: 0, x: 20, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: 'auto' }}
                            exit={{ opacity: 0, x: 20, width: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            onClick={handleCancel}
                            className={cn(
                                'text-[17px] font-normal text-[var(--primary)]',
                                'whitespace-nowrap cursor-pointer',
                                'hover:opacity-70 transition-opacity'
                            )}
                        >
                            Cancel
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        );
    }
);

IOSSearchBar.displayName = 'IOSSearchBar';
