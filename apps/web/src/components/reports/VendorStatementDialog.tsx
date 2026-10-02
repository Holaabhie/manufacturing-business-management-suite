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
                className="max-w-4xl w-full p-0 overflow-hidden rounded-2xl flex flex-col md:max-h-[90vh]"
            >
                <DialogHeader className="p-4 sm:p-5 border-b border-[var(--border)] shrink-0 bg-[var(--card)]">
                    <DialogTitle className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                        {t("vendorStatementTitle")} {vendorName ? `— ${vendorName}` : ""}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("vendorStatementTitle")}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-3 sm:p-5 min-h-0 scrollbar-hide">
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
