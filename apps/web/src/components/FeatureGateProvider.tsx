"use client";

/**
 * FeatureGateProvider — Bridge between Auth Context and Feature Context
 * 
 * This component sits inside PermissionProvider and passes
 * the user's role/tier to the FeatureProvider.
 */

import { type ReactNode } from 'react';
import { FeatureProvider } from '@/lib/features/feature-context';
import { usePermissions } from '@/lib/hooks/use-permissions';

export function FeatureGateProvider({ children }: { children: ReactNode }) {
  const { role, tier } = usePermissions();

  return (
    <FeatureProvider
      userRole={role as 'Admin' | 'Staff' | null}
      userTier={tier || 'starter'}
    >
      {children}
    </FeatureProvider>
  );
}
