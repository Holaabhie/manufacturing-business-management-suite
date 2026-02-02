"use client";

import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AccessDeniedProps {
    title?: string;
    description?: string;
    showBackButton?: boolean;
    showHomeButton?: boolean;
}

export function AccessDenied({
    title = "Access Denied",
    description = "You don't have permission to access this page. Please contact your administrator if you believe this is an error.",
    showBackButton = true,
    showHomeButton = true,
}: AccessDeniedProps) {
    const router = useRouter();

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center">
                <CardHeader className="pb-4">
                    <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                        <ShieldX className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl">{title}</CardTitle>
                    <CardDescription className="text-base mt-2">
                        {description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {showBackButton && (
                            <Button
                                variant="outline"
                                onClick={() => router.back()}
                                className="gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Go Back
                            </Button>
                        )}
                        {showHomeButton && (
                            <Button asChild className="gap-2">
                                <Link href="/dashboard">
                                    <Home className="h-4 w-4" />
                                    Dashboard
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Simple inline access denied message for read-only modes
 */
export function ReadOnlyBanner({ feature = "this section" }: { feature?: string }) {
    return (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 flex items-center gap-2">
            <ShieldX className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
                You have view-only access to {feature}. Contact an administrator for edit permissions.
            </p>
        </div>
    );
}
