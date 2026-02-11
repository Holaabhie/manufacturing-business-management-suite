"use client";

import { type ReactNode } from "react";
import type { PermissionModule } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface PermissionGateProps {
    /**
     * The module to check permission for.
     */
    module: PermissionModule;

    /**
     * The action to check (e.g., 'view', 'create', 'edit', 'delete', 'export').
     */
    action: string;

    /**
     * What to render when the user doesn't have permission.
     * - "hidden": Don't render anything (default)
     * - "disabled": Render children but disabled with a tooltip
     */
    fallback?: "hidden" | "disabled";

    /**
     * Custom tooltip message when fallback is "disabled".
     */
    disabledMessage?: string;

    /**
     * Children to render when the user has permission.
     */
    children: ReactNode;

    /**
     * Optional custom element to render when the user doesn't have permission
     * and fallback is "hidden". If not provided, nothing is rendered.
     */
    placeholder?: ReactNode;
}

/**
 * Permission-aware wrapper component.
 * 
 * Usage:
 * ```tsx
 * <PermissionGate module="orders" action="create" fallback="disabled">
 *   <Button>New Order</Button>
 * </PermissionGate>
 * ```
 * 
 * Three rendering states:
 * 1. Visible and interactive — User has the permission
 * 2. Visible but disabled — User can see but not interact (fallback="disabled")
 * 3. Hidden — User doesn't see the element at all (fallback="hidden", default)
 */
export function PermissionGate({
    module,
    action,
    fallback = "hidden",
    disabledMessage,
    children,
    placeholder,
}: PermissionGateProps) {
    const { permissions, isAdmin, loading } = usePermissions();

    // While loading, show nothing to prevent flashing
    if (loading) return null;

    // Check permission
    const hasAccess = hasPermission(permissions, module, action, isAdmin);

    // User has permission — render normally
    if (hasAccess) {
        return <>{children}</>;
    }

    // User doesn't have permission — apply fallback strategy
    if (fallback === "disabled") {
        const message =
            disabledMessage || "You don't have permission for this action";

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className="opacity-50 pointer-events-none cursor-not-allowed select-none"
                            aria-disabled="true"
                            role="presentation"
                        >
                            {children}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">{message}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Hidden fallback — render placeholder or nothing
    return placeholder ? <>{placeholder}</> : null;
}

/**
 * Simpler gate that only checks module-level view access.
 * Useful for entire sections/panels.
 */
export function ModuleGate({
    module,
    children,
    fallback = "hidden",
    placeholder,
}: {
    module: PermissionModule;
    children: ReactNode;
    fallback?: "hidden" | "disabled";
    placeholder?: ReactNode;
}) {
    return (
        <PermissionGate
            module={module}
            action="view"
            fallback={fallback}
            placeholder={placeholder}
        >
            {children}
        </PermissionGate>
    );
}
