"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { VendorStatement } from "@/components/reports/VendorStatement";
import { useTranslations } from "next-intl";

interface VendorStatementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendorId: string;
    vendorName?: string;
    vendorPhone?: string;
}

export function VendorStatementDialog({
    open,
    onOpenChange,
    vendorId,
    vendorName,
    vendorPhone,
}: VendorStatementDialogProps) {
    const t = useTranslations("payables");

    if (!vendorId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                fullScreenMobile
                className="max-w-4xl w-full p-0 overflow-hidden rounded-t-[24px] md:rounded-2xl flex flex-col h-[100dvh] md:h-auto max-h-[100dvh] md:max-h-[90vh]"
            >
                {/* Drag Handle on Mobile */}
                <div className="w-10 h-1 rounded-full bg-[var(--muted-foreground)]/25 mx-auto mt-2.5 mb-0.5 md:hidden shrink-0" />

                <DialogHeader className="p-4 sm:p-5 border-b border-[var(--border)] shrink-0 bg-[var(--card)] pr-12">
                    <DialogTitle className="text-base sm:text-lg font-bold text-[var(--foreground)] truncate">
                        {vendorName || t("vendorStatementTitle")}
                    </DialogTitle>
                    <DialogDescription className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
                        {t("vendorStatementTitle")}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <VendorStatement
                        vendorId={vendorId}
                        vendorName={vendorName}
                        vendorPhone={vendorPhone}
                        inModal={true}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
