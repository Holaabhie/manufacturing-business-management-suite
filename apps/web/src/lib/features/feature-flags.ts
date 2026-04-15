/**
 * Feature Flag Registry — Type-Safe Feature Keys
 * 
 * All feature keys used in the application MUST be defined here.
 * This ensures type safety and prevents typos when referencing features.
 */

// ─── Feature Keys (const enum for zero-runtime overhead) ────────
export const FEATURES = {
  // Pro-only features
  DASHBOARD_ANALYTICS: 'dashboard_analytics',
  EXPORT_PDF: 'export_pdf',
  EXPORT_CSV: 'export_csv',
  AI_ASSISTANT: 'ai_assistant',
  CUSTOM_BRANDING: 'custom_branding',
  API_ACCESS: 'api_access',
  PRIORITY_SUPPORT: 'priority_support',
  UNLIMITED_PROJECTS: 'unlimited_projects',

  // Admin-only features
  ADMIN_PANEL: 'admin_panel',
  USER_MANAGEMENT: 'user_management',
  SYSTEM_SETTINGS: 'system_settings',

  // Available to all tiers
  BASIC_FEATURES: 'basic_features',
  LIMITED_PROJECTS: 'limited_projects',
} as const;

/** Type for any valid feature key */
export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

/** Array of all registered feature keys (useful for validation) */
export const ALL_FEATURE_KEYS: FeatureKey[] = Object.values(FEATURES);

/**
 * Feature metadata for display purposes.
 * Used by UpgradePrompt and UpgradeModal components.
 */
export const FEATURE_DISPLAY_INFO: Record<
  FeatureKey,
  { name: string; description: string; icon: string }
> = {
  [FEATURES.DASHBOARD_ANALYTICS]: {
    name: 'Dashboard Analytics',
    description: 'Advanced analytics with charts and business insights',
    icon: '📊',
  },
  [FEATURES.EXPORT_PDF]: {
    name: 'Export to PDF',
    description: 'Export reports and invoices as PDF documents',
    icon: '📄',
  },
  [FEATURES.EXPORT_CSV]: {
    name: 'Export to CSV',
    description: 'Export data tables as CSV for analysis',
    icon: '📑',
  },
  [FEATURES.AI_ASSISTANT]: {
    name: 'AI Assistant',
    description: 'AI-powered business insights and automation',
    icon: '🤖',
  },
  [FEATURES.CUSTOM_BRANDING]: {
    name: 'Custom Branding',
    description: 'Customize invoices with your branding',
    icon: '🎨',
  },
  [FEATURES.API_ACCESS]: {
    name: 'API Access',
    description: 'REST API for third-party integrations',
    icon: '🔌',
  },
  [FEATURES.PRIORITY_SUPPORT]: {
    name: 'Priority Support',
    description: 'Faster response times and dedicated support',
    icon: '⚡',
  },
  [FEATURES.UNLIMITED_PROJECTS]: {
    name: 'Unlimited Projects',
    description: 'No limits on the number of projects',
    icon: '♾️',
  },
  [FEATURES.ADMIN_PANEL]: {
    name: 'Admin Panel',
    description: 'Full administrative control panel',
    icon: '🛡️',
  },
  [FEATURES.USER_MANAGEMENT]: {
    name: 'User Management',
    description: 'Manage team members and permissions',
    icon: '👥',
  },
  [FEATURES.SYSTEM_SETTINGS]: {
    name: 'System Settings',
    description: 'Organization-wide configuration',
    icon: '⚙️',
  },
  [FEATURES.BASIC_FEATURES]: {
    name: 'Basic Features',
    description: 'Core application features',
    icon: '✅',
  },
  [FEATURES.LIMITED_PROJECTS]: {
    name: 'Up to 3 Projects',
    description: 'Create and manage up to 3 projects',
    icon: '📁',
  },
};
