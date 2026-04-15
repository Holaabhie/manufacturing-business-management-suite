'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * useMediaQuery — Responsive breakpoint hook
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);

        const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
        media.addEventListener('change', handler);
        return () => media.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

/** Preset breakpoint hooks */
export function useIsMobile() {
    return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet() {
    return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop() {
    return useMediaQuery('(min-width: 1024px)');
}

/**
 * useThemeMode — Dark/light theme toggle with persistence
 * Works with next-themes ThemeProvider already in the app
 */
export function useThemeMode() {
    const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');

    useEffect(() => {
        const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
        if (stored) setThemeState(stored);
    }, []);

    const setTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);

        const root = document.documentElement;
        if (newTheme === 'dark') {
            root.classList.add('dark');
        } else if (newTheme === 'light') {
            root.classList.remove('dark');
        } else {
            // System preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', prefersDark);
        }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setTheme]);

    return { theme, setTheme, toggleTheme };
}
