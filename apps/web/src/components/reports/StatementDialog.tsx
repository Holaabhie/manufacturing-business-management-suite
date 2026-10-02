"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ClientStatement } from "@/components/reports/ClientStatement";
import { useTranslations } from "next-intl";

interface StatementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
    clientName?: string;
    clientPhone?: string;
}

export function StatementDialog({
    open,
    onOpenChange,
    clientId,
    clientName,
    clientPhone,
}: StatementDialogProps) {
    const t = useTranslations("statements");

    if (!clientId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                fullScreenMobile
                className="max-w-4xl w-full p-0 overflow-hidden rounded-2xl flex flex-col md:max-h-[90vh]"
            >
                <DialogHeader className="p-4 sm:p-5 border-b border-[var(--border)] shrink-0 bg-[var(--card)]">
                    <DialogTitle className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                        {t("title")} {clientName ? `— ${clientName}` : ""}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("title")}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-3 sm:p-5 min-h-0 scrollbar-hide">
                    <ClientStatement
                        clientId={clientId}
                        clientName={clientName}
                        clientPhone={clientPhone}
                        inModal={true}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
