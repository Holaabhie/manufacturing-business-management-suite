"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/AccessDenied";
import {
    Plus,
    Search,
    Download,
    FileText,
    Printer,
    Eye,
    MoreVertical,
    Trash2,
    Send,
    Building2,
    Calendar,
    Hash,
    IndianRupee,
    Package,
    User,
    ChevronDown,
    X,
    CheckCircle2,
    Copy,
    Share2,
    Mail,
    AlertTriangle,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { InvoicePayload } from "@/lib/invoice/types";
import { cn } from "@/lib/utils";
import { CollapsingTitle } from "@/components/ui/CollapsingTitle";
import { useCollapseProgress } from "@/hooks/useCollapseProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { Separator } from "@/components/ui/separator";
import { NumericInput, parseNumericValue } from "@/components/ui/numeric-input";
import TallyExportButton from "@/components/billing/TallyExportButton";
import CreateInvoiceModal from "@/components/billing/CreateInvoiceModal";
import { useCachedPage } from "@/hooks/useCachedPage";

// --- iOS Components ---
import {
    IOSButton,
    IOSCard,
    IOSCardHeader,
    IOSCardContent,
    IOSBadge,
    IOSSearchBar,
    IOSInput,
    IOSSelect
} from "@/components/ui/ios";

// Import staggered animations
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, staggerItem } from "@/styles/animations";

interface BillItem {
    id: string;
    description: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    gstRate: number;
}

interface Bill {
    id: string;
    billNumber: string;
    billDate: string;
    dueDate: string;
    clientId: string;
    clientName: string;
    clientAddress: string;
    clientGSTIN: string;
    clientPhone: string;
    clientEmail: string;
    items: BillItem[];
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    amountInWords: string;
    notes: string;
    terms: string;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    tallySynced?: boolean;
    tallyVoucherNumber?: string;
    tallySyncedAt?: string;
    createdAt: string;
}

// Company details interface (fetched from API)
interface CompanyInfo {
    companyName: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string;
    gstin?: string;
    pan?: string;
    bankName?: string;
    accountNo?: string;
    ifsc?: string;
    upiId?: string;
}

export default function BillingPage() {
    const { progress: collapseProgress } = useCollapseProgress();
    const [bills, setBills] = useState<Bill[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [billToDelete, setBillToDelete] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
    const [clientSearch, setClientSearch] = useState("");
    const clientDropdownRef = useRef<HTMLDivElement>(null);

    // ─── Long-press & Bottom Sheet state (Fix 3) ────────
    const [longPressedBill, setLongPressedBill] = useState<Bill | null>(null);
    const [isBillSheetOpen, setIsBillSheetOpen] = useState(false);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const longPressTriggered = useRef(false);

    // Role-based access control
    const [userRole, setUserRole] = useState<string | null>(null);
    const [roleLoading, setRoleLoading] = useState(true);

    // Company details state (fetched from Profile)
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const [companyLoading, setCompanyLoading] = useState(true);

    // Form state - initialized with empty strings to prevent hydration mismatch
    const [formData, setFormData] = useState({
        client_id: "",
        billDate: "",
        dueDate: "",
        notes: "",
        terms: "1. Payment is due within 30 days.\n2. Please include bill number in payment reference.\n3. For queries, contact our billing department.",
        items: [] as BillItem[],
        isIGST: false
    });

    // Set mounted state and initialize dates on client side only
    useEffect(() => {
        setMounted(true);
        // Set dates only on client side to prevent hydration mismatch
        setFormData(prev => ({
            ...prev,
            billDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));
    }, []);

    // Fetch company details
    const fetchCompanyInfo = async () => {
        setCompanyLoading(true);
        try {
            const res = await fetch("/api/profile/company");
            const data = await res.json();
            if (data.company) {
                setCompanyInfo(data.company);
            }
        } catch (error) {
            console.error("Failed to fetch company info:", error);
        } finally {
            setCompanyLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [clientsRes, ordersRes, billsRes] = await Promise.all([
                fetch("/api/v1/clients").then(r => r.json()),
                fetch("/api/v1/orders").then(r => r.json()),
                fetch("/api/v1/billing").then(r => r.json()).catch(() => ({ data: [] }))
            ]);

            setClients(clientsRes.data || []);
            setOrders(ordersRes.data || []);
            setBills(billsRes.data || []);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    // Fetch user role
    const fetchUserRole = async () => {
        try {
            const res = await fetch("/api/auth/me");
            const data = await res.json();
            setUserRole(data?.user?.role || null);
        } catch (error) {
            console.error("Failed to fetch user role:", error);
        } finally {
            setRoleLoading(false);
        }
    };

    // ── Page State Persistence ────────────────────────────
    const { restoreState, persist, scrollYRef } = useCachedPage({ pageKey: "billing" });
    const persistRef = useRef({ searchTerm, bills });
    useEffect(() => { persistRef.current = { searchTerm, bills }; });
    useEffect(() => {
        const cached = restoreState();
        if (cached) {
            if (cached.searchTerm) setSearchTerm(cached.searchTerm as string);
            if (Array.isArray(cached.bills) && (cached.bills as any[]).length > 0) {
                setBills(cached.bills as Bill[]);
                setLoading(false);
            }
        }
        return () => {
            persist({ ...persistRef.current, scrollY: scrollYRef.current });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchData();
        fetchCompanyInfo();
        fetchUserRole();
    }, []);

    // Close client dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
                setClientDropdownOpen(false);
            }
        };
        if (clientDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [clientDropdownOpen]);

    // Invoice number is generated server-side (sequential: INV/YYYY-MM/XXXX)
    // Client sends a placeholder that the server overrides
    const generateBillNumberPlaceholder = () => "INV/AUTO";

    const numberToWords = (num: number): string => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        const convertLessThanThousand = (n: number): string => {
            if (n < 20) return ones[n];
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
            return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
        };

        if (num === 0) return 'Zero';

        const crore = Math.floor(num / 10000000);
        const lakh = Math.floor((num % 10000000) / 100000);
        const thousand = Math.floor((num % 100000) / 1000);
        const remainder = Math.floor(num % 1000);

        let words = '';
        if (crore) words += convertLessThanThousand(crore) + ' Crore ';
        if (lakh) words += convertLessThanThousand(lakh) + ' Lakh ';
        if (thousand) words += convertLessThanThousand(thousand) + ' Thousand ';
        if (remainder) words += convertLessThanThousand(remainder);

        return words.trim() + ' Rupees Only';
    };

    const addItem = () => {
        const newItem: BillItem = {
            id: Date.now().toString(),
            description: "",
            hsnCode: "",
            quantity: 1,
            unit: "pcs",
            rate: 0,
            amount: 0,
            gstRate: 18
        };
        setFormData({ ...formData, items: [...formData.items, newItem] });
    };

    const updateItem = (id: string, field: string, value: any) => {
        const updatedItems = formData.items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                updated.amount = updated.quantity * updated.rate;
                return updated;
            }
            return item;
        });
        setFormData({ ...formData, items: updatedItems });
    };

    const removeItem = (id: string) => {
        setFormData({
            ...formData,
            items: formData.items.filter(item => item.id !== id)
        });
    };

    const importFromOrder = (orderId: string) => {
        const order = orders.find(o => (o.id || o._id) === orderId);
        if (!order) return;

        const description = order.productName ?? order.product_name ?? "Imported Order";
        const quantity = order.quantity || 1;
        const rate = order.rate || 0;
        const amount = order.totalAmount ?? order.total_amount ?? (quantity * rate);

        const newItem: BillItem = {
            id: Date.now().toString(),
            description,
            hsnCode: "",
            quantity,
            unit: "pcs",
            rate,
            amount,
            gstRate: 18
        };

        const clientId = order.clientId ?? order.client_id ?? formData.client_id;
        setFormData({
            ...formData,
            client_id: clientId,
            items: [...formData.items, newItem]
        });
        toast.success("Order imported to bill");
    };

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((acc, item) => acc + item.amount, 0);
        const totalGST = formData.items.reduce((acc, item) => acc + (item.amount * item.gstRate / 100), 0);

        let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

        if (formData.isIGST) {
            igstAmount = totalGST;
        } else {
            cgstAmount = totalGST / 2;
            sgstAmount = totalGST / 2;
        }

        const totalAmount = subtotal + totalGST;

        return { subtotal, cgstAmount, sgstAmount, igstAmount, totalAmount };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.client_id) {
            return toast.error("Please select a client");
        }
        if (formData.items.length === 0) {
            return toast.error("Please add at least one item");
        }

        const client = clients.find(c => c.id === formData.client_id);
        const totals = calculateTotals();

        const billData: Omit<Bill, 'id' | 'createdAt'> = {
            billNumber: generateBillNumberPlaceholder(),
            billDate: formData.billDate,
            dueDate: formData.dueDate,
            clientId: formData.client_id,
            clientName: client?.name || "",
            clientAddress: client?.address || "",
            clientGSTIN: client?.gstin || "",
            clientPhone: client?.phone || "",
            clientEmail: client?.email || "",
            items: formData.items,
            subtotal: totals.subtotal,
            cgstAmount: totals.cgstAmount,
            sgstAmount: totals.sgstAmount,
            igstAmount: totals.igstAmount,
            totalAmount: totals.totalAmount,
            amountInWords: numberToWords(Math.round(totals.totalAmount)),
            notes: formData.notes,
            terms: formData.terms,
            status: 'draft',
        };

        try {
            // Mapping for backend CreateBillDTO which expects client_id
            const payload = {
                ...billData,
                client_id: formData.client_id
            };

            const res = await fetch("/api/v1/billing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();

            if (json.error) {
                toast.error(json.error.message || "Failed to create bill");
            } else {
                const serverBillNumber = json.data?.billNumber || billData.billNumber;
                toast.success(`Bill ${serverBillNumber} created successfully`);
                setIsDialogOpen(false);
                resetForm();
                fetchData();
            }
        } catch (error) {
            toast.error("Failed to create bill");
        }
    };

    const resetForm = () => {
        setFormData({
            client_id: "",
            billDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: "",
            terms: "1. Payment is due within 30 days.\n2. Please include bill number in payment reference.\n3. For queries, contact our billing department.",
            items: [],
            isIGST: false
        });
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/billing/${id}`, { method: "DELETE" });
            const json = await res.json();

            if (json.error) {
                toast.error(json.error.message || "Failed to delete bill");
            } else {
                toast.success("Bill deleted");
                fetchData();
            }
        } catch (error) {
            toast.error("Failed to delete bill");
        } finally {
            setIsDeleteDialogOpen(false);
            setBillToDelete(null);
        }
    };

    // ─── Long-press handlers (Fix 3) ─────────────────────
    const handleBillLongPressStart = useCallback((bill: Bill, e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        longPressTriggered.current = false;
        longPressTimerRef.current = setTimeout(() => {
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
            longPressTriggered.current = true;
            setLongPressedBill(bill);
            setIsBillSheetOpen(true);
        }, 500);
    }, []);

    const handleBillLongPressMove = useCallback((e: React.TouchEvent) => {
        const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
        const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
        if (dx > 10 || dy > 10) {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
        }
    }, []);

    const handleBillLongPressEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const closeBillSheet = useCallback(() => {
        setIsBillSheetOpen(false);
        setTimeout(() => setLongPressedBill(null), 350);
    }, []);

    // ─── WhatsApp Share (Fix 5) ──────────────────────────
    const handleWhatsAppShare = useCallback(async (bill: Bill) => {
        const message = `Invoice ${bill.billNumber}\nClient: ${bill.clientName}\nAmount: \u20B9${bill.totalAmount.toLocaleString('en-IN')}\nDue: ${new Date(bill.dueDate).toLocaleDateString('en-IN')}`;

        const phoneNumber = bill.clientPhone?.replace(/[^0-9]/g, '') || '';
        const waUrl = phoneNumber
            ? `https://wa.me/${phoneNumber.startsWith('91') ? phoneNumber : '91' + phoneNumber}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;

        window.open(waUrl, '_blank');
        toast.success("Opening WhatsApp...");

        // Fire-and-forget notification log
        try {
            await fetch('/api/billing/share-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    billId: bill.id,
                    billNumber: bill.billNumber,
                    clientName: bill.clientName,
                    totalAmount: bill.totalAmount,
                    channel: 'whatsapp',
                }),
            });
        } catch { /* non-critical */ }
    }, []);

    const updateStatus = async (id: string, status: Bill['status']) => {
        try {
            const res = await fetch(`/api/v1/billing/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            const json = await res.json();

            if (json.error) {
                toast.error(json.error.message || "Failed to update status");
            } else {
                toast.success(`Bill marked as ${status}`);
                fetchData();
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const generatePDF = async (bill: Bill, action: 'download' | 'print' = 'download') => {
        setPdfGenerating(true);
        try {
            // Build InvoicePayload for server-side Handlebars + Puppeteer
            const invoicePayload: InvoicePayload = {
                invoiceNumber: bill.billNumber,
                issueDate: bill.billDate,
                dueDate: bill.dueDate,
                status: bill.status,
                taxType: bill.igstAmount > 0 ? "IGST" : "CGST_SGST",
                company: {
                    companyName: companyInfo?.companyName || "Your Company",
                    address: companyInfo?.address || "",
                    phone: companyInfo?.phone || "",
                    email: companyInfo?.email || "",
                    logoUrl: companyInfo?.logoUrl,
                    gstin: companyInfo?.gstin,
                    pan: companyInfo?.pan,
                    bankName: companyInfo?.bankName,
                    accountNo: companyInfo?.accountNo,
                    ifsc: companyInfo?.ifsc,
                    upiId: companyInfo?.upiId,
                },
                client: {
                    name: bill.clientName,
                    address: bill.clientAddress,
                    gstin: bill.clientGSTIN,
                    phone: bill.clientPhone,
                    email: bill.clientEmail,
                },
                items: bill.items.map(item => ({
                    description: item.description,
                    hsnCode: item.hsnCode,
                    quantity: item.quantity,
                    unit: item.unit,
                    rate: item.rate,
                    amount: item.amount,
                    gstRate: item.gstRate,
                })),
                subtotal: bill.subtotal,
                cgstAmount: bill.cgstAmount,
                sgstAmount: bill.sgstAmount,
                igstAmount: bill.igstAmount,
                totalAmount: bill.totalAmount,
                amountInWords: bill.amountInWords,
                notes: bill.notes,
                terms: bill.terms,
            };

            const res = await fetch("/api/invoice/generate-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(invoicePayload),
            });

            const contentType = res.headers.get("Content-Type") || "";
            const isFallbackHtml = res.headers.get("X-Fallback") === "html";

            if (contentType.includes("application/pdf")) {
                // Got real PDF from Puppeteer
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);

                if (action === 'download') {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Invoice_${bill.billNumber.replace(/[^a-zA-Z0-9\-_]/g, '_')}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success("Invoice PDF downloaded");
                } else {
                    const printWindow = window.open(url);
                    if (printWindow) {
                        printWindow.onload = () => printWindow.print();
                        toast.success("Opening print dialog...");
                    } else {
                        toast.error("Popup blocked! Allow popups to print.");
                    }
                }
            } else if (isFallbackHtml || contentType.includes("text/html")) {
                // HTML fallback — open in new window for print
                const html = await res.text();
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const w = window.open(url);
                if (w) {
                    w.onload = () => { if (action === 'print') w.print(); };
                    toast.info(action === 'print' ? "Opening print dialog..." : "Invoice opened (HTML fallback)");
                }
            } else {
                const err = await res.json().catch(() => ({ message: "Unknown error" }));
                toast.error(err.message || "PDF generation failed");
            }
        } catch (error) {
            console.error("PDF generation error:", error);
            toast.error(`Failed to ${action} PDF`);
        } finally {
            setPdfGenerating(false);
        }
    };

    const totals = calculateTotals();
    const filteredBills = bills.filter(bill =>
        bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: bills.length,
        draft: bills.filter(b => b.status === 'draft').length,
        sent: bills.filter(b => b.status === 'sent').length,
        paid: bills.filter(b => b.status === 'paid').length,
        totalValue: bills.reduce((acc, b) => acc + b.totalAmount, 0),
        paidValue: bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + b.totalAmount, 0)
    };

    // Prevent hydration mismatch by showing loading during SSR
    if (!mounted) {
        return (
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <FileText className="h-8 w-8 text-emerald-600" />
                            Tally-Style Billing
                        </h1>
                        <p className="text-zinc-500 mt-1">Generate professional GST invoices for your orders</p>
                    </div>
                </div>
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
            </div>
        );
    }

    // Access denied for Staff users
    if (!roleLoading && userRole === "Staff") {
        return (
            <AccessDenied
                title="Billing Access Restricted"
                description="The billing section is only accessible to administrators. Please contact your admin if you need access to financial features."
            />
        );
    }

    return (
        <div className="space-y-8 bg-[var(--background)] min-h-screen p-6 rounded-3xl overflow-x-hidden">
            <CollapsingTitle
                title="Tally-Style Billing"
                subtitle={`${bills.length} invoices · \u20B9${(stats.totalValue / 100000).toFixed(1)}L total billed · ${stats.paid} paid`}
                subtitleLoading={loading}
                collapseProgress={collapseProgress}
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Company Details Warning */}
                {!companyLoading && !companyInfo?.companyName && (
                    <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 dark:text-amber-200">Company details not configured</AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-300">
                            Your company information will appear on all invoices.
                            <Link href="/dashboard/profile?tab=company" className="ml-1 underline font-medium hover:text-amber-900">
                                Set up your company details →
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    <IOSButton 
                        variant="filled" 
                        onClick={() => {
                            if (filteredBills.length === 0) {
                                toast.error("No invoices to export");
                                return;
                            }
                            exportToTally(filteredBills);
                            toast.success("Tally export generated");
                        }}
                        style={{ backgroundColor: "#16a34a", borderColor: "#15803d" }}
                        className="shadow-sm hover:opacity-90"
                    >
                        <Download className="min-w-4 h-4 w-4 mr-1.5" />
                        Tally Export
                    </IOSButton>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <IOSButton variant="filled">
                                <Plus className="min-w-4 h-5 w-5 mr-1.5" />
                                Create New Invoice
                            </IOSButton>
                        </DialogTrigger>
                    </Dialog>

                    {/* New Redesigned Invoice Modal */}
                    <CreateInvoiceModal
                        open={isDialogOpen}
                        onClose={() => { setIsDialogOpen(false); resetForm(); }}
                        onSuccess={() => fetchData()}
                        clients={clients}
                        orders={orders}
                        companyInfo={companyInfo}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <IOSCard variant="elevated" className="!bg-gradient-to-br from-[var(--erp-success)]/10 to-[var(--erp-success)]/5 dark:from-[var(--erp-success)]/20 dark:to-[var(--erp-success)]/10 border border-[var(--erp-success)]/20">
                    <IOSCardHeader title="Total Invoiced" className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--erp-success)] pb-0" />
                    <IOSCardContent className="pt-2">
                        <div className="text-[28px] font-bold tracking-tight text-[var(--foreground)]">{"\u20B9"}{stats.totalValue.toLocaleString('en-IN')}</div>
                        <p className="text-[13px] text-[var(--muted-foreground)] font-medium mt-1">{stats.total} invoices generated</p>
                    </IOSCardContent>
                </IOSCard>

                <IOSCard variant="elevated">
                    <IOSCardHeader title="Paid" className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--muted-foreground)] pb-0" />
                    <IOSCardContent className="pt-2">
                        <div className="text-[28px] font-bold tracking-tight text-[var(--foreground)]">{stats.paid}</div>
                        <p className="text-[13px] text-[var(--erp-success)] font-medium mt-1">{"\u20B9"}{stats.paidValue.toLocaleString('en-IN')} collected</p>
                    </IOSCardContent>
                </IOSCard>

                <IOSCard variant="elevated">
                    <IOSCardHeader title="Pending" className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--muted-foreground)] pb-0" />
                    <IOSCardContent className="pt-2">
                        <div className="text-[28px] font-bold tracking-tight text-[var(--erp-warning)]">{stats.sent}</div>
                        <p className="text-[13px] text-[var(--muted-foreground)] font-medium mt-1">Awaiting payment</p>
                    </IOSCardContent>
                </IOSCard>

                <IOSCard variant="elevated">
                    <IOSCardHeader title="Drafts" className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--muted-foreground)] pb-0" />
                    <IOSCardContent className="pt-2">
                        <div className="text-[28px] font-bold tracking-tight text-[var(--muted-foreground)]">{stats.draft}</div>
                        <p className="text-[13px] text-[var(--muted-foreground)] font-medium mt-1">Ready to send</p>
                    </IOSCardContent>
                </IOSCard>
            </div>

            {/* Search */}
            <IOSSearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search invoices by number or client..."
                className="max-w-sm"
            />

            {/* Bills Table — Desktop only */}
            <div className="hidden md:block rounded-2xl border bg-[var(--card)] shadow-sm overflow-hidden border-[var(--border)]">
                <Table>
                    <TableHeader className="bg-[var(--muted)] border-b border-[var(--border)]">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-medium text-[var(--muted-foreground)] py-4 pl-6">Invoice</TableHead>
                            <TableHead className="font-medium text-[var(--muted-foreground)] py-4">Client</TableHead>
                            <TableHead className="font-medium text-[var(--muted-foreground)] py-4">Date</TableHead>
                            <TableHead className="font-medium text-[var(--muted-foreground)] py-4 text-right">Amount</TableHead>
                            <TableHead className="font-medium text-[var(--muted-foreground)] py-4 text-center">Status</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="pl-6"><Skeleton className="h-10 w-full rounded-lg" /></TableCell>
                                    <TableCell><Skeleton className="h-10 w-full rounded-lg" /></TableCell>
                                    <TableCell><Skeleton className="h-10 w-full rounded-lg" /></TableCell>
                                    <TableCell><Skeleton className="h-10 w-full rounded-lg" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-20 rounded-full mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredBills.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20 text-[var(--muted-foreground)]">
                                    <FileText className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)]" />
                                    <p className="text-[13px]">No invoices found. Create your first invoice to get started.</p>
                                </TableCell>
                            </TableRow>
                        ) : filteredBills.map((bill, index) => (
                            <motion.tr
                                key={bill.id}
                                variants={staggerItem}
                                initial="hidden"
                                animate="show"
                                custom={index}
                                className="group bg-[var(--card)] hover:bg-[var(--muted)] border-b border-[var(--border)] transition-all shadow-sm hover:shadow-md"
                            >
                                <TableCell className="pl-6 py-4">
                                    <span className="font-semibold text-[15px] text-blue-600 tracking-tight">{bill.billNumber}</span>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-[15px] text-[var(--foreground)]">{bill.clientName}</span>
                                        {bill.clientGSTIN && (
                                            <span className="text-[12px] text-[var(--muted-foreground)]">GSTIN: {bill.clientGSTIN}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-[14px] text-[var(--foreground)]">{new Date(bill.billDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        <span className="text-[12px] text-[var(--muted-foreground)]">Due: {new Date(bill.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 text-right pr-6">
                                    <span className="font-semibold text-[17px] tracking-tight">{"\u20B9"}{bill.totalAmount.toLocaleString('en-IN')}</span>
                                </TableCell>
                                <TableCell className="py-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                    <IOSBadge
                                        variant={bill.status === 'paid' ? 'filled' : bill.status === 'sent' ? 'tinted' : bill.status === 'draft' ? 'outline' : 'filled'}
                                        color={bill.status === 'paid' ? 'green' : bill.status === 'sent' ? 'blue' : bill.status === 'draft' ? 'gray' : 'red'}
                                        className="uppercase tracking-widest text-[10px]"
                                    >
                                        {bill.status}
                                    </IOSBadge>
                                    <TallyExportButton
                                        invoiceId={bill.id}
                                        invoiceNumber={bill.billNumber}
                                        tallySynced={bill.tallySynced}
                                        tallySyncedAt={bill.tallySyncedAt}
                                        tallyVoucherNumber={bill.tallyVoucherNumber}
                                        onSuccess={() => fetchData()}
                                        compact
                                    />
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 pr-4">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => { setSelectedBill(bill); setIsPreviewOpen(true); }}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Preview
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => generatePDF(bill, 'download')}>
                                                <Download className="mr-2 h-4 w-4" />
                                                Download PDF
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => generatePDF(bill, 'print')}>
                                                <Printer className="mr-2 h-4 w-4 text-[var(--erp-success)]" />
                                                Print Invoice
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleWhatsAppShare(bill)}>
                                                <Share2 className="mr-2 h-4 w-4 text-green-500" />
                                                WhatsApp Share
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                className="p-0 focus:bg-transparent"
                                            >
                                                <div className="px-2 py-1.5">
                                                    <TallyExportButton
                                                        invoiceId={bill.id}
                                                        invoiceNumber={bill.billNumber}
                                                        tallySynced={bill.tallySynced}
                                                        tallySyncedAt={bill.tallySyncedAt}
                                                        tallyVoucherNumber={bill.tallyVoucherNumber}
                                                        onSuccess={() => fetchData()}
                                                    />
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {bill.status === 'draft' && (
                                                <DropdownMenuItem onClick={() => updateStatus(bill.id, 'sent')}>
                                                    <Send className="mr-2 h-4 w-4" />
                                                    Mark as Sent
                                                </DropdownMenuItem>
                                            )}
                                            {bill.status === 'sent' && (
                                                <DropdownMenuItem onClick={() => updateStatus(bill.id, 'paid')}>
                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    Mark as Paid
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-red-500"
                                                onClick={() => { setBillToDelete(bill.id); setIsDeleteDialogOpen(true); }}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </motion.tr>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Invoice Cards — visible only below md (768px) */}
            <div className="block md:hidden px-3 py-2 space-y-3">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-[#1a1f2e] rounded-xl px-4 py-3 border-l-4 border-gray-600">
                            <Skeleton className="h-4 w-24 rounded" />
                            <Skeleton className="h-5 w-full rounded mt-2" />
                            <Skeleton className="h-3 w-32 rounded mt-2" />
                        </div>
                    ))
                ) : filteredBills.length === 0 ? (
                    <div className="py-16 text-center">
                        <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">No invoices found. Create your first invoice to get started.</p>
                    </div>
                ) : filteredBills.map((bill) => (
                    <div
                        key={bill.id}
                        className={cn(
                            "bg-[#1a1f2e] rounded-xl px-4 py-3 border-l-4 select-none",
                            bill.status === 'paid' ? 'border-green-500'
                                : bill.status === 'sent' ? 'border-blue-500'
                                : bill.status === 'overdue' ? 'border-red-500'
                                : 'border-gray-500'
                        )}
                        onClick={() => {
                            if (longPressTriggered.current) {
                                longPressTriggered.current = false;
                                return; // Suppress click after long press
                            }
                            setSelectedBill(bill); setIsPreviewOpen(true);
                        }}
                        onTouchStart={(e) => handleBillLongPressStart(bill, e)}
                        onTouchMove={handleBillLongPressMove}
                        onTouchEnd={handleBillLongPressEnd}
                        onTouchCancel={handleBillLongPressEnd}
                    >
                        {/* Row 1: Invoice number + Status badge */}
                        <div className="flex justify-between items-center">
                            <span className="text-blue-400 text-xs font-mono">{bill.billNumber}</span>
                            <span className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-semibold",
                                bill.status === 'paid' ? 'bg-green-500/20 text-green-400'
                                    : bill.status === 'sent' ? 'bg-blue-500/20 text-blue-400'
                                    : bill.status === 'overdue' ? 'bg-red-500/20 text-red-400'
                                    : 'bg-muted text-muted-foreground'
                            )}>
                                {bill.status.toUpperCase()}
                            </span>
                        </div>
                        {/* Row 2: Client name + Amount */}
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-white text-sm font-semibold truncate mr-2">{bill.clientName}</span>
                            <span className="text-white text-sm font-bold whitespace-nowrap">{"\u20B9"}{bill.totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        {/* Row 3: Dates */}
                        <div className="flex justify-between mt-1">
                            <span className="text-muted-foreground text-xs">{new Date(bill.billDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="text-muted-foreground text-xs">Due: {new Date(bill.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* DESKTOP UX REFACTOR — Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent fullScreen className="!bg-transparent" aria-describedby={undefined}>
                    <DialogTitle className="sr-only">Invoice Preview</DialogTitle>
                    {/* DESKTOP UX REFACTOR — Centered modal shell */}
                    <div className="fixed inset-0 z-[1] flex items-end lg:items-center lg:justify-center" onClick={() => setIsPreviewOpen(false)}>
                      <div
                        className="w-full lg:w-[min(1200px,92vw)] max-h-[88dvh] lg:h-[min(92vh,980px)] flex flex-col overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl"
                        style={{ background: 'var(--overlay-sheet-bg, #0D1421)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* DESKTOP UX REFACTOR — Sticky Top Toolbar (desktop only) */}
                        <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] backdrop-blur-sm shrink-0">
                          <div className="flex items-center gap-3">
                            <FileText size={18} className="text-[var(--erp-success)]" />
                            <span className="text-[15px] font-semibold text-[var(--foreground)]">Invoice Preview</span>
                            {selectedBill && (
                              <span className="text-[13px] text-[var(--muted-foreground)] font-mono ml-1">{selectedBill.billNumber}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedBill && (
                              <>
                                <button
                                  onClick={() => generatePDF(selectedBill, 'print')}
                                  disabled={pdfGenerating}
                                  className="h-9 px-4 rounded-lg border border-[rgba(255,255,255,0.10)] bg-transparent text-[var(--muted-foreground)] text-[13px] font-medium flex items-center gap-2 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <Printer size={14} />
                                  Print
                                </button>
                                <button
                                  onClick={() => generatePDF(selectedBill, 'download')}
                                  disabled={pdfGenerating}
                                  className="h-9 px-4 rounded-lg border-none bg-[#2563EB] text-white text-[13px] font-semibold flex items-center gap-2 hover:bg-[#1d4ed8] transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {pdfGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                  {pdfGenerating ? "Generating..." : "Download PDF"}
                                </button>
                                <TallyExportButton
                                  invoiceId={selectedBill.id}
                                  invoiceNumber={selectedBill.billNumber}
                                  tallySynced={selectedBill.tallySynced}
                                  tallySyncedAt={selectedBill.tallySyncedAt}
                                  tallyVoucherNumber={selectedBill.tallyVoucherNumber}
                                  onSuccess={() => fetchData()}
                                />
                              </>
                            )}
                            <button
                              onClick={() => setIsPreviewOpen(false)}
                              className="h-9 w-9 rounded-lg border border-[rgba(255,255,255,0.10)] bg-transparent text-[var(--muted-foreground)] flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer ml-1"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Mobile drag handle (visible below lg) */}
                        <div className="flex lg:hidden justify-center pt-3 pb-2 shrink-0">
                          <div className="w-12 h-[5px] rounded-full" style={{ background: 'var(--overlay-handle, rgba(255,255,255,0.2))' }} />
                        </div>
                        {/* DESKTOP UX REFACTOR — Scrollable Document Area */}
                        <div className="flex-1 overflow-y-auto min-h-0 lg:bg-[rgba(0,0,0,0.15)]">
                          {selectedBill && (
                            <div className="lg:flex lg:justify-center lg:py-8 lg:px-4">
                              <div className="w-full lg:max-w-[900px] lg:rounded-xl lg:shadow-[0_8px_30px_rgba(0,0,0,0.25)]" style={{ background: 'var(--overlay-sheet-bg, #0D1421)' }}>
                                <div className="p-4 md:p-6 lg:p-10 pb-[120px] lg:pb-10 overflow-x-hidden" ref={printRef}>
                                {/* Invoice Header */}
                                <div className="text-center border-b border-[var(--border)] pb-4 md:pb-6 mb-4 md:mb-6">
                                    <h1 className="text-lg md:text-[24px] font-bold tracking-tight text-[var(--erp-success)] break-words">{companyInfo?.companyName || "Your Company Name"}</h1>
                                    <p className="text-[12px] md:text-[13px] text-[var(--muted-foreground)] mt-1 break-words">{companyInfo?.address?.replace('\n', ', ') || "Company Address"}</p>
                                    <p className="text-[11px] md:text-[12px] text-[var(--muted-foreground)] mt-1 break-words">Phone: {companyInfo?.phone || "N/A"} | Email: {companyInfo?.email || "N/A"}</p>
                                    <p className="text-[11px] md:text-[12px] text-[var(--muted-foreground)] break-words">GSTIN: {companyInfo?.gstin || "N/A"} | PAN: {companyInfo?.pan || "N/A"}</p>
                                </div>

                                <div className="bg-[var(--erp-success)] w-full text-center py-3 text-white font-bold text-lg tracking-widest rounded mb-4 md:mb-6">
                                    TAX INVOICE
                                </div>

                                {/* Bill To + Invoice Info — stacked on mobile, side by side on desktop */}
                                <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-6">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm text-[var(--muted-foreground)] mb-2">BILL TO:</h3>
                                        <p className="font-bold text-base md:text-lg text-[var(--foreground)] break-words">{selectedBill.clientName}</p>
                                        {selectedBill.clientAddress && <p className="text-sm text-[var(--muted-foreground)] break-words">{selectedBill.clientAddress}</p>}
                                        {selectedBill.clientGSTIN && <p className="text-sm text-[var(--muted-foreground)] break-words">GSTIN: {selectedBill.clientGSTIN}</p>}
                                        {selectedBill.clientPhone && <p className="text-sm text-[var(--muted-foreground)]">Phone: {selectedBill.clientPhone}</p>}
                                    </div>
                                    <div className="min-w-0 md:text-right">
                                        <p className="text-sm break-words"><span className="text-[var(--muted-foreground)]">Invoice No:</span> <span className="font-bold">{selectedBill.billNumber}</span></p>
                                        <p className="text-sm"><span className="text-[var(--muted-foreground)]">Date:</span> {new Date(selectedBill.billDate).toLocaleDateString('en-IN')}</p>
                                        <p className="text-sm"><span className="text-[var(--muted-foreground)]">Due Date:</span> {new Date(selectedBill.dueDate).toLocaleDateString('en-IN')}</p>
                                    </div>
                                </div>

                                {/* Items Table — Desktop only */}
                                <table className="hidden md:table w-full mb-6">
                                    <thead>
                                        <tr className="bg-[var(--muted)]">
                                            <th className="text-left p-2 text-xs font-bold">S.No</th>
                                            <th className="text-left p-2 text-xs font-bold">Description</th>
                                            <th className="text-left p-2 text-xs font-bold">HSN</th>
                                            <th className="text-right p-2 text-xs font-bold">Qty</th>
                                            <th className="text-right p-2 text-xs font-bold">Rate</th>
                                            <th className="text-right p-2 text-xs font-bold">GST%</th>
                                            <th className="text-right p-2 text-xs font-bold">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedBill.items.map((item, idx) => (
                                            <tr key={`${item.id}-${idx}`} className="border-b">
                                                <td className="p-2 text-sm">{idx + 1}</td>
                                                <td className="p-2 text-sm font-medium">{item.description}</td>
                                                <td className="p-2 text-sm">{item.hsnCode || '-'}</td>
                                                <td className="p-2 text-sm text-right">{item.quantity} {item.unit}</td>
                                                <td className="p-2 text-sm text-right">{"\u20B9"}{item.rate.toLocaleString('en-IN')}</td>
                                                <td className="p-2 text-sm text-right">{item.gstRate}%</td>
                                                <td className="p-2 text-sm text-right font-bold">{"\u20B9"}{item.amount.toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Items Cards — Mobile only */}
                                <div className="block md:hidden mb-4 space-y-2">
                                    {selectedBill.items.map((item, idx) => (
                                        <div key={`${item.id}-${idx}`} className="bg-white/5 rounded-lg px-3 py-2">
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm font-bold text-[var(--foreground)] break-words min-w-0 flex-1 mr-2">{item.description}</span>
                                                <span className="text-sm font-bold text-[var(--foreground)] whitespace-nowrap">{"\u20B9"}{item.amount.toLocaleString('en-IN')}</span>
                                            </div>
                                            {item.hsnCode && (
                                                <p className="text-xs text-muted-foreground mt-0.5">HSN: {item.hsnCode}</p>
                                            )}
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-xs text-muted-foreground">{item.quantity} {item.unit} × {"\u20B9"}{item.rate.toLocaleString('en-IN')}</span>
                                                <span className="text-xs text-gray-400 bg-white/10 rounded px-1.5 py-0.5">{item.gstRate}% GST</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals — responsive */}
                                <div className="flex justify-end mb-4 md:mb-6">
                                    <div className="w-full md:w-64 space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[var(--muted-foreground)]">Subtotal</span>
                                            <span className="font-bold">{"\u20B9"}{selectedBill.subtotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        {selectedBill.igstAmount > 0 ? (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--muted-foreground)]">IGST</span>
                                                <span>{"\u20B9"}{selectedBill.igstAmount.toLocaleString('en-IN')}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--muted-foreground)]">CGST</span>
                                                    <span>{"\u20B9"}{selectedBill.cgstAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--muted-foreground)]">SGST</span>
                                                    <span>{"\u20B9"}{selectedBill.sgstAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="flex justify-between text-base md:text-lg font-bold text-green-400 border-t border-white/20 pt-2 mt-1">
                                            <span>Total</span>
                                            <span className="font-black text-[var(--erp-success)]">{"\u20B9"}{selectedBill.totalAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs md:text-sm italic text-[var(--muted-foreground)] mb-4 md:mb-6 break-words">
                                    Amount in words: <span className="font-medium">{selectedBill.amountInWords}</span>
                                </p>

                                {/* Bank Details + Terms — stacked on mobile */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] pt-4">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-[var(--foreground)] mb-1">Bank Details:</h4>
                                        <p className="break-words">Bank: {companyInfo?.bankName || "N/A"}</p>
                                        <p className="break-words">A/C No: {companyInfo?.accountNo || "N/A"}</p>
                                        <p>IFSC: {companyInfo?.ifsc || "N/A"}</p>
                                        <p className="break-words">UPI: {companyInfo?.upiId || "N/A"}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-[var(--foreground)] mb-1">Terms & Conditions:</h4>
                                        <pre className="whitespace-pre-wrap font-sans break-words">{selectedBill.terms}</pre>
                                    </div>
                                </div>

                                <div className="text-right mt-6 md:mt-8 pt-6 md:pt-8">
                                    <div className="inline-block text-center">
                                        <div className="border-t border-zinc-300 pt-2 px-8">
                                            <p className="text-xs text-zinc-500">Authorized Signatory</p>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-center text-xs text-[var(--muted-foreground)] mt-6 md:mt-8">
                                    This is a computer generated invoice.
                                </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* DESKTOP UX REFACTOR — Mobile Bottom Dock (hidden on desktop) */}
                        <div
                          className="flex lg:hidden shrink-0"
                          style={{
                            background: "var(--overlay-sheet-bg, #0D1421)",
                            borderTop: "1px solid var(--overlay-border, rgba(255,255,255,0.08))",
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                            padding: "12px 16px",
                            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
                          }}
                        >
                          <div style={{ display: "flex", gap: 10, width: "100%" }}>
                            <button
                              onClick={() => setIsPreviewOpen(false)}
                              style={{ flex: 1, height: 48, borderRadius: 14, border: "1px solid var(--overlay-border, rgba(255,255,255,0.10))", background: "transparent", color: "var(--overlay-text-secondary, #94a3b8)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                            >
                              Close
                            </button>
                            {selectedBill && (
                              <button
                                onClick={() => generatePDF(selectedBill, 'download')}
                                disabled={pdfGenerating}
                                style={{ flex: 1.4, height: 48, borderRadius: 14, border: "none", background: "#2563EB", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                              >
                                {pdfGenerating ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                {pdfGenerating ? "Generating..." : "Download PDF"}
                              </button>
                            )}
                          </div>
                        </div>

                      </div>{/* end modal shell */}
                    </div>{/* end centering wrapper */}
                </DialogContent>
            </Dialog>

            {/* ─── Mobile Bottom Sheet (Fix 3) ─── */}
            <MobileSheet open={isBillSheetOpen} onClose={closeBillSheet} maxHeight="65dvh">
                {longPressedBill && (
                    <div className="px-5 pb-4 space-y-1">
                        {/* Header */}
                        <div className="pb-3 mb-2 border-b border-white/10">
                            <p className="text-[15px] font-semibold text-[var(--foreground)]">{longPressedBill.clientName}</p>
                            <p className="text-[13px] text-[var(--muted-foreground)]">{longPressedBill.billNumber} · {"\u20B9"}{longPressedBill.totalAmount.toLocaleString('en-IN')}</p>
                        </div>

                        {/* Preview */}
                        <button
                            onClick={() => { closeBillSheet(); setSelectedBill(longPressedBill); setIsPreviewOpen(true); }}
                            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <Eye className="h-[18px] w-[18px] text-blue-400" />
                            <span className="text-[15px] text-[var(--foreground)]">Preview Invoice</span>
                        </button>

                        {/* Download PDF */}
                        <button
                            onClick={() => { closeBillSheet(); generatePDF(longPressedBill, 'download'); }}
                            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <Download className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                            <span className="text-[15px] text-[var(--foreground)]">Download PDF</span>
                        </button>

                        {/* Print */}
                        <button
                            onClick={() => { closeBillSheet(); generatePDF(longPressedBill, 'print'); }}
                            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <Printer className="h-[18px] w-[18px] text-[var(--erp-success)]" />
                            <span className="text-[15px] text-[var(--foreground)]">Print Invoice</span>
                        </button>

                        {/* WhatsApp Share */}
                        <button
                            onClick={() => { closeBillSheet(); handleWhatsAppShare(longPressedBill); }}
                            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <Share2 className="h-[18px] w-[18px] text-green-500" />
                            <span className="text-[15px] text-[var(--foreground)]">Share via WhatsApp</span>
                        </button>

                        <div className="my-1 border-t border-white/10" />

                        {/* Mark as Sent (draft only) */}
                        {longPressedBill.status === 'draft' && (
                            <button
                                onClick={() => { closeBillSheet(); updateStatus(longPressedBill.id, 'sent'); }}
                                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <Send className="h-[18px] w-[18px] text-blue-400" />
                                <span className="text-[15px] text-[var(--foreground)]">Mark as Sent</span>
                            </button>
                        )}

                        {/* Mark as Paid (sent only) */}
                        {longPressedBill.status === 'sent' && (
                            <button
                                onClick={() => { closeBillSheet(); updateStatus(longPressedBill.id, 'paid'); }}
                                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <CheckCircle2 className="h-[18px] w-[18px] text-green-400" />
                                <span className="text-[15px] text-[var(--foreground)]">Mark as Paid</span>
                            </button>
                        )}

                        <div className="my-1 border-t border-white/10" />

                        {/* Delete */}
                        <button
                            onClick={() => { closeBillSheet(); setBillToDelete(longPressedBill.id); setIsDeleteDialogOpen(true); }}
                            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <Trash2 className="h-[18px] w-[18px] text-red-400" />
                            <span className="text-[15px] text-red-400">Delete Invoice</span>
                        </button>
                    </div>
                )}
            </MobileSheet>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-[350px] bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px]">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, rgba(239,68,68,0.4), rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 className="h-[18px] w-[18px] text-[#f87171]" />
                      </div>
                      <div>
                        <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', lineHeight: '22px', margin: 0 }}>Delete Invoice</DialogTitle>
                        <DialogDescription style={{ fontSize: 13, color: '#64748b', lineHeight: '18px', margin: '2px 0 0' }}>This action cannot be undone.</DialogDescription>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, paddingTop: 16 }}>
                      <button onClick={() => setIsDeleteDialogOpen(false)} style={{ flex: 1, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.10)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                      <button onClick={() => billToDelete && handleDelete(billToDelete)} style={{ flex: 1, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 4px 16px rgba(239,68,68,0.25)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
