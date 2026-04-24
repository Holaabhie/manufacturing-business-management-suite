"use client";

import { useEffect, useState, useRef } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { NumericInput, parseNumericValue } from "@/components/ui/numeric-input";
import { exportToTally } from "@/lib/tallyExport";

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
        <div className="space-y-8 bg-[var(--bg-page)] min-h-screen p-6 rounded-3xl overflow-x-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <FileText className="h-8 w-8 text-[var(--ios-green)]" />
                        Tally-Style Billing
                    </h1>
                    <p className="text-[var(--label-secondary)] mt-1">Generate professional GST invoices for your orders</p>
                </div>

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
                        <DialogContent className="max-w-4xl max-h-[95vh] p-0 bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px]">
                        <ScrollArea className="max-h-[95vh]">
                            <div className="p-6">
                                <DialogHeader>
                                    <DialogTitle className="text-[20px] font-semibold flex items-center gap-2 text-[var(--label-primary)]">
                                        <Building2 className="h-6 w-6 text-[var(--ios-green)]" />
                                        Create Tax Invoice
                                    </DialogTitle>
                                    <DialogDescription className="text-[15px] pt-1">
                                        Generate a GST compliant invoice with automatic calculations
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                                    {/* Client & Date Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[var(--fill-quaternary)] rounded-[16px] border border-[var(--border-card)]">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--label-secondary)] pl-1">
                                                <User className="h-4 w-4 text-[var(--label-tertiary)]" />
                                                Bill To (Client)
                                            </label>
                                            <div className="relative" ref={clientDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => { setClientDropdownOpen(!clientDropdownOpen); setClientSearch(""); }}
                                                    className={cn(
                                                        'w-full h-[44px] rounded-[10px] text-left flex items-center',
                                                        'bg-[var(--fill-tertiary)] dark:bg-[var(--fill-quaternary)]',
                                                        'text-[15px]',
                                                        'outline-none border-none',
                                                        'pl-4 pr-10',
                                                        'transition-shadow duration-200 cursor-pointer',
                                                        clientDropdownOpen && 'ring-2 ring-[var(--ios-blue)]',
                                                    )}
                                                >
                                                    {formData.client_id
                                                        ? <span className="text-[var(--label-primary)] truncate">{clients.find(c => c.id === formData.client_id)?.name || 'Select client...'}</span>
                                                        : <span className="text-[var(--label-tertiary)]">Select client...</span>
                                                    }
                                                </button>
                                                <ChevronDown
                                                    size={20}
                                                    className={cn(
                                                        "absolute right-3 top-[22px] -translate-y-1/2 text-[var(--label-tertiary)] pointer-events-none transition-transform duration-200",
                                                        clientDropdownOpen && "rotate-180"
                                                    )}
                                                />
                                                {clientDropdownOpen && (
                                                    <div className="absolute z-50 mt-1 w-full rounded-[12px] bg-[var(--bg-card)] border border-[var(--border-card)] shadow-[var(--shadow-lg)] overflow-hidden">
                                                        <div className="p-2 border-b border-[var(--border-card)]">
                                                            <input
                                                                type="text"
                                                                placeholder="Search clients..."
                                                                value={clientSearch}
                                                                onChange={(e) => setClientSearch(e.target.value)}
                                                                className="w-full h-[36px] rounded-[8px] bg-[var(--fill-quaternary)] text-[14px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] outline-none border-none px-3"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="max-h-[200px] overflow-y-auto">
                                                            {clients
                                                                .filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase()))
                                                                .map(c => (
                                                                    <button
                                                                        key={c.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFormData({ ...formData, client_id: c.id });
                                                                            setClientDropdownOpen(false);
                                                                            setClientSearch("");
                                                                        }}
                                                                        className={cn(
                                                                            "w-full text-left px-4 py-2.5 text-[15px] transition-colors duration-150",
                                                                            formData.client_id === c.id
                                                                                ? "bg-[var(--ios-blue)]/20 text-[var(--ios-blue)] font-medium"
                                                                                : "text-[var(--label-primary)] hover:bg-[var(--ios-blue)]/10"
                                                                        )}
                                                                    >
                                                                        {c.name}
                                                                    </button>
                                                                ))
                                                            }
                                                            {clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                                                                <div className="px-4 py-3 text-[13px] text-[var(--label-tertiary)] text-center">No clients found</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--label-secondary)] pl-1">
                                                <Calendar className="h-4 w-4 text-[var(--label-tertiary)]" />
                                                Invoice Date
                                            </label>
                                            <IOSInput
                                                type="date"
                                                value={formData.billDate}
                                                onChange={(e: any) => setFormData({ ...formData, billDate: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--label-secondary)] pl-1">
                                                <Calendar className="h-4 w-4 text-[var(--label-tertiary)]" />
                                                Due Date
                                            </label>
                                            <IOSInput
                                                type="date"
                                                value={formData.dueDate}
                                                onChange={(e: any) => setFormData({ ...formData, dueDate: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Import from Orders */}
                                    {formData.client_id && (
                                        <div className="p-4 bg-[var(--ios-blue)]/5 dark:bg-[var(--ios-blue)]/10 rounded-[16px] border border-[var(--ios-blue)]/20">
                                            <label className="text-[var(--ios-blue)] font-semibold text-[13px]">Quick Import from Orders</label>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {orders.filter(o => (o.client_id || o.clientId || (o.client && o.client._id)) === formData.client_id).slice(0, 5).map(order => {
                                                    const oId = order.id || order._id;
                                                    const oDesc = order.productName ?? order.product_name ?? "Order Item";
                                                    const oTotal = order.totalAmount ?? order.total_amount ?? 0;
                                                    return (
                                                    <IOSButton
                                                        key={oId}
                                                        type="button"
                                                        variant="tinted"
                                                        color="blue"
                                                        className="text-[12px] !py-1 !px-2.5 h-auto truncate max-w-[220px]"
                                                        onClick={() => importFromOrder(oId)}
                                                        title={`${oDesc} (₹${oTotal})`}
                                                    >
                                                        <Package className="h-3 w-3 mr-1 flex-shrink-0" />
                                                        <span className="truncate">{oDesc} (₹{oTotal})</span>
                                                    </IOSButton>
                                                )})}
                                                {orders.filter(o => (o.client_id || o.clientId || (o.client && o.client._id)) === formData.client_id).length === 0 && (
                                                    <span className="text-[13px] text-[var(--ios-blue)] opacity-70">No orders found for this client</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* GST Type Toggle */}
                                    <div className="flex items-center gap-4 p-3 bg-[var(--fill-tertiary)] rounded-[12px]">
                                        <label className="font-semibold text-[13px] text-[var(--label-primary)] pl-1">GST Type:</label>
                                        <div className="flex gap-2">
                                            <IOSButton
                                                type="button"
                                                variant={!formData.isIGST ? "filled" : "gray"}
                                                className={cn("!py-1.5", !formData.isIGST && "!bg-[var(--ios-green)]")}
                                                onClick={() => setFormData({ ...formData, isIGST: false })}
                                            >
                                                CGST + SGST (Intra-State)
                                            </IOSButton>
                                            <IOSButton
                                                type="button"
                                                variant={formData.isIGST ? "filled" : "gray"}
                                                className={cn("!py-1.5", formData.isIGST && "!bg-[var(--ios-green)]")}
                                                onClick={() => setFormData({ ...formData, isIGST: true })}
                                            >
                                                IGST (Inter-State)
                                            </IOSButton>
                                        </div>
                                    </div>

                                    {/* Items Section */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                <Package className="h-5 w-5 text-[var(--label-tertiary)]" />
                                                Line Items
                                            </h3>
                                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                                <Plus className="h-4 w-4 mr-1" />
                                                Add Item
                                            </Button>
                                        </div>

                                        {formData.items.length === 0 ? (
                                            <div className="py-12 text-center bg-[var(--fill-quaternary)] rounded-xl border-2 border-dashed border-[var(--border-card)]">
                                                <Package className="h-10 w-10 mx-auto mb-3 text-[var(--label-quaternary)]" />
                                                <p className="text-[var(--label-secondary)]">No items added yet. Click "Add Item" or import from orders.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {formData.items.map((item, index) => (
                                                    <div key={item.id} className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-card)] space-y-3">
                                                        {/* Description — full width */}
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase text-[var(--label-secondary)] pl-1">Description</label>
                                                            <IOSInput
                                                                placeholder="Product/Service name"
                                                                value={item.description}
                                                                onChange={(e: any) => updateItem(item.id, 'description', e.target.value)}
                                                                className="h-9"
                                                            />
                                                        </div>

                                                        {/* HSN + QTY + Unit */}
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] uppercase text-[var(--label-secondary)] pl-1">HSN</label>
                                                                <IOSInput
                                                                    placeholder="Code"
                                                                    value={item.hsnCode}
                                                                    onChange={(e: any) => updateItem(item.id, 'hsnCode', e.target.value)}
                                                                    className="h-9"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] uppercase text-[var(--label-secondary)] pl-1">QTY</label>
                                                                <NumericInput
                                                                    value={item.quantity || ""}
                                                                    onValueChange={(v: string) => updateItem(item.id, 'quantity', parseNumericValue(v))}
                                                                    className="h-9 bg-[var(--fill-quaternary)] border-none text-[15px]"
                                                                    placeholder="0"
                                                                    allowDecimal={true}
                                                                    min={0}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] uppercase text-[var(--label-secondary)] pl-1">Unit</label>
                                                                <IOSInput
                                                                    placeholder="pcs"
                                                                    value={item.unit}
                                                                    onChange={(e: any) => updateItem(item.id, 'unit', e.target.value)}
                                                                    className="h-9"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Rate (₹) + GST % */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] uppercase text-[var(--label-secondary)] pl-1">Rate (₹)</label>
                                                                <NumericInput
                                                                    value={item.rate || ""}
                                                                    onValueChange={(v: string) => updateItem(item.id, 'rate', parseNumericValue(v))}
                                                                    className="h-9 bg-[var(--fill-quaternary)] border-none text-[15px]"
                                                                    placeholder="0.00"
                                                                    allowDecimal={true}
                                                                    min={0}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] uppercase text-[var(--label-secondary)] pl-1">GST %</label>
                                                                <IOSSelect
                                                                    value={item.gstRate.toString()}
                                                                    onChange={(e: any) => updateItem(item.id, 'gstRate', parseInt(e.target.value))}
                                                                    options={[
                                                                        { label: "0%", value: "0" },
                                                                        { label: "5%", value: "5" },
                                                                        { label: "12%", value: "12" },
                                                                        { label: "18%", value: "18" },
                                                                        { label: "28%", value: "28" }
                                                                    ]}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Delete (left) + Amount (right) */}
                                                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-card)]">
                                                            <IOSButton
                                                                type="button"
                                                                variant="destructive"
                                                                className="h-8 !px-3 !py-0 text-[12px]"
                                                                onClick={() => removeItem(item.id)}
                                                            >
                                                                <X className="h-3.5 w-3.5 mr-1" />
                                                                Remove
                                                            </IOSButton>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[11px] uppercase text-[var(--label-tertiary)] font-medium">Amount</span>
                                                                <span className="text-[17px] font-bold text-[var(--ios-green)]">
                                                                    ₹{item.amount.toLocaleString('en-IN')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Totals Summary */}
                                    <div className="flex justify-end">
                                        <div className="w-80 space-y-2 p-4 bg-[var(--fill-quaternary)] rounded-xl border border-[var(--border-card)]">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--label-secondary)]">Subtotal</span>
                                                <span className="font-bold">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                                            </div>
                                            {!formData.isIGST ? (
                                                <>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-[var(--label-secondary)]">CGST</span>
                                                        <span className="font-medium">₹{totals.cgstAmount.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-[var(--label-secondary)]">SGST</span>
                                                        <span className="font-medium">₹{totals.sgstAmount.toLocaleString('en-IN')}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--label-secondary)]">IGST</span>
                                                    <span className="font-medium">₹{totals.igstAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                            )}
                                            <Separator />
                                            <div className="flex justify-between text-lg pt-2">
                                                <span className="font-bold">Grand Total</span>
                                                <span className="font-black text-[var(--ios-green)]">₹{totals.totalAmount.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes & Terms */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--label-secondary)] pl-1">Notes / Remarks</label>
                                            <Textarea
                                                placeholder="Additional notes for the client..."
                                                value={formData.notes}
                                                onChange={(e: any) => setFormData({ ...formData, notes: e.target.value })}
                                                rows={4}
                                                className="bg-[var(--fill-quaternary)] border-none text-[15px]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--label-secondary)] pl-1">Terms & Conditions</label>
                                            <Textarea
                                                value={formData.terms}
                                                onChange={(e: any) => setFormData({ ...formData, terms: e.target.value })}
                                                rows={4}
                                                className="bg-[var(--fill-quaternary)] border-none text-[15px]"
                                            />
                                        </div>
                                    </div>

                                    <DialogFooter className="pt-4 border-t border-[var(--border-card)]">
                                        <IOSButton type="button" variant="gray" onClick={() => setIsDialogOpen(false)}>
                                            Cancel
                                        </IOSButton>
                                        <IOSButton type="submit" variant="filled">
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Create Invoice
                                        </IOSButton>
                                    </DialogFooter>
                                </form>
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <IOSCard variant="elevated" className="!bg-gradient-to-br from-[var(--ios-green)]/10 to-[var(--ios-green)]/5 dark:from-[var(--ios-green)]/20 dark:to-[var(--ios-green)]/10 border border-[var(--ios-green)]/20">
                    <IOSCardHeader title="Total Invoiced" className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--ios-green)] pb-0" />
                    <IOSCardContent className="pt-2">
                        <div className="text-[28px] font-bold tracking-tight text-[var(--label-primary)]">₹{stats.totalValue.toLocaleString('en-IN')}</div>
                        <p className="text-[13px] text-[var(--label-secondary)] font-medium mt-1">{stats.total} invoices generated</p>
                    </IOSCardContent>
                </IOSCard>

                <IOSCard variant="elevated">
                    <IOSCardHeader title="Paid" className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--label-secondary)] pb-0" />
                    <IOSCardContent className="pt-2">
                        <div className="text-[28px] font-bold tracking-tight text-[var(--label-primary)]">{stats.paid}</div>
                        <p className="text-[13px] text-[var(--ios-green)] font-medium mt-1">₹{stats.paidValue.toLocaleString('en-IN')} collected</p>
                    </IOSCardContent>
                </IOSCard>

                <IOSCard variant="elevated">
                    <IOSCardHeader title="Pending" className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--label-secondary)] pb-0" />
                    <IOSCardContent className="pt-2">
                        <div className="text-[28px] font-bold tracking-tight text-[var(--ios-orange)]">{stats.sent}</div>
                        <p className="text-[13px] text-[var(--label-secondary)] font-medium mt-1">Awaiting payment</p>
                    </IOSCardContent>
                </IOSCard>

                <IOSCard variant="elevated">
                    <IOSCardHeader title="Drafts" className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--label-secondary)] pb-0" />
                    <IOSCardContent className="pt-2">
                        <div className="text-[28px] font-bold tracking-tight text-[var(--label-tertiary)]">{stats.draft}</div>
                        <p className="text-[13px] text-[var(--label-secondary)] font-medium mt-1">Ready to send</p>
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
            <div className="hidden md:block rounded-2xl border bg-[var(--bg-card)] shadow-[var(--shadow-card)] overflow-hidden border-[var(--border-card)]">
                <Table>
                    <TableHeader className="bg-[var(--fill-quaternary)] border-b border-[var(--border-card)]">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-medium text-[var(--label-secondary)] py-4 pl-6">Invoice</TableHead>
                            <TableHead className="font-medium text-[var(--label-secondary)] py-4">Client</TableHead>
                            <TableHead className="font-medium text-[var(--label-secondary)] py-4">Date</TableHead>
                            <TableHead className="font-medium text-[var(--label-secondary)] py-4 text-right">Amount</TableHead>
                            <TableHead className="font-medium text-[var(--label-secondary)] py-4 text-center">Status</TableHead>
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
                                <TableCell colSpan={6} className="text-center py-20 text-[var(--label-secondary)]">
                                    <FileText className="h-10 w-10 mx-auto mb-3 text-[var(--label-tertiary)]" />
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
                                className="group bg-[var(--bg-card)] hover:bg-[var(--fill-quaternary)] border-b border-[var(--border-card)] transition-all shadow-sm hover:shadow-[var(--shadow-card-hover)]"
                            >
                                <TableCell className="pl-6 py-4">
                                    <span className="font-semibold text-[15px] text-blue-600 tracking-tight">{bill.billNumber}</span>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-[15px] text-[var(--label-primary)]">{bill.clientName}</span>
                                        {bill.clientGSTIN && (
                                            <span className="text-[12px] text-[var(--label-secondary)]">GSTIN: {bill.clientGSTIN}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-[14px] text-[var(--label-primary)]">{new Date(bill.billDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        <span className="text-[12px] text-[var(--label-secondary)]">Due: {new Date(bill.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 text-right pr-6">
                                    <span className="font-semibold text-[17px] tracking-tight">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
                                </TableCell>
                                <TableCell className="py-4 text-center">
                                    <IOSBadge
                                        variant={bill.status === 'paid' ? 'filled' : bill.status === 'sent' ? 'tinted' : bill.status === 'draft' ? 'outline' : 'filled'}
                                        color={bill.status === 'paid' ? 'green' : bill.status === 'sent' ? 'blue' : bill.status === 'draft' ? 'gray' : 'red'}
                                        className="uppercase tracking-widest text-[10px]"
                                    >
                                        {bill.status}
                                    </IOSBadge>
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
                                                <Printer className="mr-2 h-4 w-4 text-[var(--ios-green)]" />
                                                Print Invoice
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
                        <FileText className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                        <p className="text-gray-400 text-sm">No invoices found. Create your first invoice to get started.</p>
                    </div>
                ) : filteredBills.map((bill) => (
                    <div
                        key={bill.id}
                        className={cn(
                            "bg-[#1a1f2e] rounded-xl px-4 py-3 border-l-4",
                            bill.status === 'paid' ? 'border-green-500'
                                : bill.status === 'sent' ? 'border-blue-500'
                                : bill.status === 'overdue' ? 'border-red-500'
                                : 'border-gray-500'
                        )}
                        onClick={() => { setSelectedBill(bill); setIsPreviewOpen(true); }}
                    >
                        {/* Row 1: Invoice number + Status badge */}
                        <div className="flex justify-between items-center">
                            <span className="text-blue-400 text-xs font-mono">{bill.billNumber}</span>
                            <span className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-semibold",
                                bill.status === 'paid' ? 'bg-green-500/20 text-green-400'
                                    : bill.status === 'sent' ? 'bg-blue-500/20 text-blue-400'
                                    : bill.status === 'overdue' ? 'bg-red-500/20 text-red-400'
                                    : 'bg-gray-500/20 text-gray-400'
                            )}>
                                {bill.status.toUpperCase()}
                            </span>
                        </div>
                        {/* Row 2: Client name + Amount */}
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-white text-sm font-semibold truncate mr-2">{bill.clientName}</span>
                            <span className="text-white text-sm font-bold whitespace-nowrap">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        {/* Row 3: Dates */}
                        <div className="flex justify-between mt-1">
                            <span className="text-gray-400 text-xs">{new Date(bill.billDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="text-gray-400 text-xs">Due: {new Date(bill.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="w-full max-w-3xl max-h-[90vh] p-0 overflow-x-hidden overflow-y-auto bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px] md:rounded-[24px]">
                    <ScrollArea className="max-h-[80vh]">
                        {selectedBill && (
                            <div className="p-4 md:p-8 pb-8 md:pb-12 overflow-x-hidden" ref={printRef}>
                                {/* Invoice Header */}
                                <div className="text-center border-b border-[var(--border-card)] pb-4 md:pb-6 mb-4 md:mb-6">
                                    <h1 className="text-lg md:text-[24px] font-bold tracking-tight text-[var(--ios-green)] break-words">{companyInfo?.companyName || "Your Company Name"}</h1>
                                    <p className="text-[12px] md:text-[13px] text-[var(--label-secondary)] mt-1 break-words">{companyInfo?.address?.replace('\n', ', ') || "Company Address"}</p>
                                    <p className="text-[11px] md:text-[12px] text-[var(--label-tertiary)] mt-1 break-words">Phone: {companyInfo?.phone || "N/A"} | Email: {companyInfo?.email || "N/A"}</p>
                                    <p className="text-[11px] md:text-[12px] text-[var(--label-tertiary)] break-words">GSTIN: {companyInfo?.gstin || "N/A"} | PAN: {companyInfo?.pan || "N/A"}</p>
                                </div>

                                <div className="bg-[var(--ios-green)] w-full text-center py-3 text-white font-bold text-lg tracking-widest rounded mb-4 md:mb-6">
                                    TAX INVOICE
                                </div>

                                {/* Bill To + Invoice Info — stacked on mobile, side by side on desktop */}
                                <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-6">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm text-[var(--label-secondary)] mb-2">BILL TO:</h3>
                                        <p className="font-bold text-base md:text-lg text-[var(--label-primary)] break-words">{selectedBill.clientName}</p>
                                        {selectedBill.clientAddress && <p className="text-sm text-[var(--label-secondary)] break-words">{selectedBill.clientAddress}</p>}
                                        {selectedBill.clientGSTIN && <p className="text-sm text-[var(--label-secondary)] break-words">GSTIN: {selectedBill.clientGSTIN}</p>}
                                        {selectedBill.clientPhone && <p className="text-sm text-[var(--label-secondary)]">Phone: {selectedBill.clientPhone}</p>}
                                    </div>
                                    <div className="min-w-0 md:text-right">
                                        <p className="text-sm break-words"><span className="text-[var(--label-secondary)]">Invoice No:</span> <span className="font-bold">{selectedBill.billNumber}</span></p>
                                        <p className="text-sm"><span className="text-[var(--label-secondary)]">Date:</span> {new Date(selectedBill.billDate).toLocaleDateString('en-IN')}</p>
                                        <p className="text-sm"><span className="text-[var(--label-secondary)]">Due Date:</span> {new Date(selectedBill.dueDate).toLocaleDateString('en-IN')}</p>
                                    </div>
                                </div>

                                {/* Items Table — Desktop only */}
                                <table className="hidden md:table w-full mb-6">
                                    <thead>
                                        <tr className="bg-[var(--fill-tertiary)]">
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
                                            <tr key={item.id} className="border-b">
                                                <td className="p-2 text-sm">{idx + 1}</td>
                                                <td className="p-2 text-sm font-medium">{item.description}</td>
                                                <td className="p-2 text-sm">{item.hsnCode || '-'}</td>
                                                <td className="p-2 text-sm text-right">{item.quantity} {item.unit}</td>
                                                <td className="p-2 text-sm text-right">₹{item.rate.toLocaleString('en-IN')}</td>
                                                <td className="p-2 text-sm text-right">{item.gstRate}%</td>
                                                <td className="p-2 text-sm text-right font-bold">₹{item.amount.toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Items Cards — Mobile only */}
                                <div className="block md:hidden mb-4 space-y-2">
                                    {selectedBill.items.map((item, idx) => (
                                        <div key={item.id} className="bg-white/5 rounded-lg px-3 py-2">
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm font-bold text-[var(--label-primary)] break-words min-w-0 flex-1 mr-2">{item.description}</span>
                                                <span className="text-sm font-bold text-[var(--label-primary)] whitespace-nowrap">₹{item.amount.toLocaleString('en-IN')}</span>
                                            </div>
                                            {item.hsnCode && (
                                                <p className="text-xs text-gray-400 mt-0.5">HSN: {item.hsnCode}</p>
                                            )}
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-xs text-gray-400">{item.quantity} {item.unit} × ₹{item.rate.toLocaleString('en-IN')}</span>
                                                <span className="text-xs text-gray-400 bg-white/10 rounded px-1.5 py-0.5">{item.gstRate}% GST</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals — responsive */}
                                <div className="flex justify-end mb-4 md:mb-6">
                                    <div className="w-full md:w-64 space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[var(--label-secondary)]">Subtotal</span>
                                            <span className="font-bold">₹{selectedBill.subtotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        {selectedBill.igstAmount > 0 ? (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--label-secondary)]">IGST</span>
                                                <span>₹{selectedBill.igstAmount.toLocaleString('en-IN')}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--label-secondary)]">CGST</span>
                                                    <span>₹{selectedBill.cgstAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--label-secondary)]">SGST</span>
                                                    <span>₹{selectedBill.sgstAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="flex justify-between text-base md:text-lg font-bold text-green-400 border-t border-white/20 pt-2 mt-1">
                                            <span>Total</span>
                                            <span className="font-black text-[var(--ios-green)]">₹{selectedBill.totalAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs md:text-sm italic text-[var(--label-secondary)] mb-4 md:mb-6 break-words">
                                    Amount in words: <span className="font-medium">{selectedBill.amountInWords}</span>
                                </p>

                                {/* Bank Details + Terms — stacked on mobile */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 text-xs text-[var(--label-secondary)] border-t border-[var(--border-card)] pt-4">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-[var(--label-primary)] mb-1">Bank Details:</h4>
                                        <p className="break-words">Bank: {companyInfo?.bankName || "N/A"}</p>
                                        <p className="break-words">A/C No: {companyInfo?.accountNo || "N/A"}</p>
                                        <p>IFSC: {companyInfo?.ifsc || "N/A"}</p>
                                        <p className="break-words">UPI: {companyInfo?.upiId || "N/A"}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-[var(--label-primary)] mb-1">Terms & Conditions:</h4>
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

                                <p className="text-center text-xs text-[var(--label-tertiary)] mt-6 md:mt-8">
                                    This is a computer generated invoice.
                                </p>
                            </div>
                        )}
                    </ScrollArea>
                    <div className="p-3 md:p-4 border-t border-[var(--border-card)] flex flex-wrap justify-end gap-2 bg-[var(--fill-quaternary)]/50 rounded-b-[24px]">
                        <IOSButton variant="gray" onClick={() => setIsPreviewOpen(false)}>
                            Close
                        </IOSButton>
                        {selectedBill && (
                            <>
                                <IOSButton variant="tinted" color="green" onClick={() => generatePDF(selectedBill, 'print')} disabled={pdfGenerating}>
                                    {pdfGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                                    {pdfGenerating ? "Generating..." : "Print"}
                                </IOSButton>
                                <IOSButton variant="filled" onClick={() => generatePDF(selectedBill, 'download')} disabled={pdfGenerating}>
                                    {pdfGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    {pdfGenerating ? "Generating..." : "Download"}
                                </IOSButton>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-[350px] bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle className="text-[20px] font-semibold text-[var(--label-primary)]">Delete Invoice</DialogTitle>
                        <DialogDescription className="text-[15px] pt-1 text-[var(--label-secondary)]">
                            Are you sure you want to delete this invoice? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 pt-4 border-t border-[var(--border-card)]">
                        <IOSButton variant="gray" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1">
                            Cancel
                        </IOSButton>
                        <IOSButton
                            variant="destructive"
                            onClick={() => billToDelete && handleDelete(billToDelete)}
                            className="flex-1"
                        >
                            Delete
                        </IOSButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
