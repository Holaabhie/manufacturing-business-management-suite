"use client";

/**
 * InvoicePreview — React Component
 * ──────────────────────────────────
 * Renders a premium invoice preview in an iframe by hitting
 * the /api/invoice/preview endpoint. Includes download button
 * that triggers PDF generation via /api/invoice/generate-pdf.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Download, Eye, Loader2, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InvoicePayload } from "@/lib/invoice/types";

interface InvoicePreviewProps {
    data: InvoicePayload;
    className?: string;
}

export function InvoicePreview({ data, className = "" }: InvoicePreviewProps) {
    const [downloading, setDownloading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // ─── Generate Preview ───────────────────────────────────────

    const handlePreview = useCallback(async () => {
        setLoadingPreview(true);
        try {
            const res = await fetch("/api/invoice/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error("Preview failed");

            const html = await res.text();
            const blob = new Blob([html], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
        } catch (err: any) {
            toast.error(err.message || "Failed to load preview");
        } finally {
            setLoadingPreview(false);
        }
    }, [data]);

    // ─── Download PDF ───────────────────────────────────────────

    const handleDownload = useCallback(async () => {
        setDownloading(true);
        try {
            const res = await fetch("/api/invoice/generate-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "PDF generation failed");
            }

            const contentType = res.headers.get("Content-Type") || "";

            if (contentType.includes("application/pdf")) {
                // Puppeteer generated PDF
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Invoice_${data.invoiceNumber.replace(/[^a-zA-Z0-9\-_]/g, "_")}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("Invoice PDF downloaded!");
            } else {
                // Fallback: open HTML in new window for browser printing
                const html = await res.text();
                const win = window.open("", "_blank");
                if (win) {
                    win.document.write(html);
                    win.document.close();
                    toast.info("Puppeteer unavailable — use browser print (Ctrl+P) to save as PDF");
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to generate PDF");
        } finally {
            setDownloading(false);
        }
    }, [data]);

    // ─── Open in New Tab ────────────────────────────────────────

    const handleOpenInTab = useCallback(async () => {
        try {
            const res = await fetch("/api/invoice/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const html = await res.text();
            const win = window.open("", "_blank");
            if (win) {
                win.document.write(html);
                win.document.close();
            }
        } catch {
            toast.error("Failed to open preview");
        }
    }, [data]);

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={loadingPreview}
                    className="gap-2"
                >
                    {loadingPreview ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Eye className="h-4 w-4" />
                    )}
                    Preview
                </Button>

                <Button
                    size="sm"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                    {downloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    Download PDF
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenInTab}
                    className="gap-2 text-muted-foreground"
                >
                    <ExternalLink className="h-4 w-4" />
                    Open in Tab
                </Button>
            </div>

            {/* Invoice Preview Embed */}
            {previewUrl && (
                <div className="relative rounded-xl border border-border overflow-hidden bg-white shadow-lg">
                    <div className="absolute top-0 left-0 right-0 h-10 bg-muted/80 backdrop-blur-sm flex items-center justify-between px-4 z-10 border-b">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            Invoice Preview — {data.invoiceNumber}
                        </div>
                        <button
                            onClick={() => { setPreviewUrl(null); }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            Close
                        </button>
                    </div>
                    <iframe
                        src={previewUrl}
                        className="w-full border-0 mt-10"
                        style={{ height: "calc(297mm * 0.8)", minHeight: "700px" }}
                        title="Invoice Preview"
                    />
                </div>
            )}
        </div>
    );
}
