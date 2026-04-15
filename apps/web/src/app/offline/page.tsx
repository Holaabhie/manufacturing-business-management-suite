'use client';

import { motion } from 'framer-motion';
import { spring, staggerContainer, staggerItem } from '@/styles/animations';

export default function OfflinePage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6"
            style={{ background: 'var(--bg-page)' }}
        >
            <motion.div
                className="w-full max-w-md text-center"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
            >
                {/* WiFi Off Illustration */}
                <motion.div
                    variants={staggerItem}
                    className="mx-auto mb-8 w-32 h-32 rounded-[32px] flex items-center justify-center"
                    style={{
                        background: 'linear-gradient(135deg, rgba(0,122,255,0.08), rgba(88,86,214,0.08))',
                    }}
                >
                    <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--ios-gray)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {/* WiFi arcs */}
                        <path d="M1.42 9a16 16 0 0 1 21.16 0" opacity="0.2" />
                        <path d="M5 12.55a11 11 0 0 1 14.08 0" opacity="0.35" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" opacity="0.55" />
                        <circle cx="12" cy="20" r="1" fill="var(--ios-gray)" stroke="none" />
                        {/* Slash line */}
                        <line x1="2" y1="2" x2="22" y2="22" stroke="var(--ios-red)" strokeWidth="2" />
                    </svg>
                </motion.div>

                {/* Title */}
                <motion.h1
                    variants={staggerItem}
                    className="mb-3"
                    style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        color: 'var(--text-heading)',
                        letterSpacing: '0.36px',
                        lineHeight: '34px',
                    }}
                >
                    You&apos;re Offline
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    variants={staggerItem}
                    className="mb-8"
                    style={{
                        fontSize: '17px',
                        color: 'var(--text-secondary)',
                        lineHeight: '22px',
                        letterSpacing: '-0.41px',
                    }}
                >
                    It looks like you&apos;ve lost your internet connection. Check your
                    network settings and try again.
                </motion.p>

                {/* Glass Card with Details */}
                <motion.div
                    variants={staggerItem}
                    className="mb-8 p-5 rounded-2xl text-left"
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-card)',
                        boxShadow: 'var(--shadow-card)',
                    }}
                >
                    <div className="flex items-start gap-3 mb-4">
                        <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(0, 122, 255, 0.1)' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ios-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        </div>
                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '4px' }}>
                                What you can try
                            </p>
                            <ul className="space-y-2" style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '20px' }}>
                                <li className="flex items-center gap-2">
                                    <span style={{ color: 'var(--ios-blue)' }}>•</span>
                                    Check your Wi-Fi or mobile data
                                </li>
                                <li className="flex items-center gap-2">
                                    <span style={{ color: 'var(--ios-blue)' }}>•</span>
                                    Toggle airplane mode off
                                </li>
                                <li className="flex items-center gap-2">
                                    <span style={{ color: 'var(--ios-blue)' }}>•</span>
                                    Restart your router
                                </li>
                            </ul>
                        </div>
                    </div>
                </motion.div>

                {/* Retry Button */}
                <motion.div variants={staggerItem}>
                    <motion.button
                        onClick={() => window.location.reload()}
                        whileTap={{ scale: 0.95 }}
                        transition={spring.snappy}
                        className="w-full cursor-pointer"
                        style={{
                            background: 'var(--color-primary-brand)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '14px',
                            padding: '14px 24px',
                            fontSize: '17px',
                            fontWeight: 600,
                            boxShadow: 'var(--shadow-colored)',
                        }}
                    >
                        Try Again
                    </motion.button>
                </motion.div>

                {/* Secondary Link */}
                <motion.p
                    variants={staggerItem}
                    className="mt-4"
                    style={{ fontSize: '13px', color: 'var(--text-muted)' }}
                >
                    Some features may still work offline
                </motion.p>
            </motion.div>
        </div>
    );
}
