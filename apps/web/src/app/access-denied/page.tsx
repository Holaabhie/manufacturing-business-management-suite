"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Home, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export default function AccessDeniedPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full text-center"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6"
                >
                    <Shield className="h-10 w-10 text-red-400" />
                </motion.div>

                <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
                <p className="text-muted-foreground mb-8">
                    You don&apos;t have permission to access this page.
                    If you believe this is an error, contact your organization administrator.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="gap-2 rounded-xl"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </Button>
                    <Button
                        onClick={() => router.push("/dashboard")}
                        className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Home className="h-4 w-4" />
                        Dashboard
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground/50 mt-8 uppercase tracking-wider">
                    Error 403 — Insufficient Permissions
                </p>
            </motion.div>
        </div>
    );
}
