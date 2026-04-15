"use client";

/**
 * RoleGate — Component for Role-Based Visibility Control
 * 
 * Usage:
 * ```tsx
 * <RoleGate allowedRoles={['Admin']}>
 *   <AdminSidebar />
 * </RoleGate>
 * 
 * <RoleGate allowedRoles={['Admin']} fallback={<UpgradePrompt />}>
 *   <AdminOnlyFeature />
 * </RoleGate>
 * ```
 */

import { type ReactNode } from 'react';
import { usePermissions } from '@/lib/hooks/use-permissions';

interface RoleGateProps {
  /** Roles that are allowed to see the children */
  allowedRoles: ('Admin' | 'Staff')[];
  /** Content to render when the user has the required role */
  children: ReactNode;
  /** Optional fallback when the user doesn't have the required role */
  fallback?: ReactNode;
  /** If true, render nothing while loading (default: true) */
  hideWhileLoading?: boolean;
}

export function RoleGate({
  allowedRoles,
  children,
  fallback,
  hideWhileLoading = true,
}: RoleGateProps) {
  const { role, loading } = usePermissions();

  // Loading state
  if (loading && hideWhileLoading) {
    return null;
  }

  // Check if user's role is in allowed list
  if (role && allowedRoles.includes(role as 'Admin' | 'Staff')) {
    return <>{children}</>;
  }

  // Access denied
  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
}
