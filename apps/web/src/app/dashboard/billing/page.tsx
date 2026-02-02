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
    AlertTriangle
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
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

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
    client_id: string;
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
    created_at: string;
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
    const printRef = useRef<HTMLDivElement>(null);

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
                fetch("/api/clients").then(r => r.json()),
                fetch("/api/orders").then(r => r.json()),
                fetch("/api/billing").then(r => r.json()).catch(() => [])
            ]);

            setClients(clientsRes || []);
            setOrders(ordersRes || []);
            setBills(billsRes || []);
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

    const generateBillNumber = () => {
        const prefix = "INV";
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}/${year}${month}/${random}`;
    };

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
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const newItem: BillItem = {
            id: Date.now().toString(),
            description: order.product_name,
            hsnCode: "",
            quantity: order.quantity,
            unit: "pcs",
            rate: order.rate,
            amount: order.total_amount,
            gstRate: 18
        };

        setFormData({
            ...formData,
            client_id: order.client_id,
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

        const billData: Omit<Bill, 'id' | 'created_at'> = {
            billNumber: generateBillNumber(),
            billDate: formData.billDate,
            dueDate: formData.dueDate,
            client_id: formData.client_id,
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
            status: 'draft'
        };

        try {
            const res = await fetch("/api/billing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(billData)
            });
            const data = await res.json();

            if (data.error) {
                toast.error("Failed to create bill");
            } else {
                toast.success(`Bill ${billData.billNumber} created successfully`);
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
            const res = await fetch(`/api/billing/${id}`, { method: "DELETE" });
            const data = await res.json();

            if (data.error) {
                toast.error("Failed to delete bill");
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
            const res = await fetch(`/api/billing/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            const data = await res.json();

            if (data.error) {
                toast.error("Failed to update status");
            } else {
                toast.success(`Bill marked as ${status}`);
                fetchData();
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const generatePDF = (bill: Bill) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 15;

        // Header - Company Name
        doc.setFontSize(20);
        doc.setTextColor(22, 163, 74); // Emerald color
        doc.setFont("helvetica", "bold");
        doc.text(companyInfo?.companyName || "Your Company Name", pageWidth / 2, y, { align: "center" });

        y += 8;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text(companyInfo?.address?.replace('\n', ', ') || "Company Address", pageWidth / 2, y, { align: "center" });

        y += 5;
        doc.text(`Phone: ${companyInfo?.phone || "N/A"} | Email: ${companyInfo?.email || "N/A"}`, pageWidth / 2, y, { align: "center" });

        y += 5;
        doc.text(`GSTIN: ${companyInfo?.gstin || "N/A"} | PAN: ${companyInfo?.pan || "N/A"}`, pageWidth / 2, y, { align: "center" });

        // Tax Invoice Title
        y += 12;
        doc.setFillColor(22, 163, 74);
        doc.rect(0, y - 5, pageWidth, 10, 'F');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("TAX INVOICE", pageWidth / 2, y + 1, { align: "center" });

        // Bill Info
        y += 15;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        // Left side - Client details
        doc.setFont("helvetica", "bold");
        doc.text("Bill To:", 15, y);
        doc.setFont("helvetica", "normal");
        y += 5;
        doc.text(bill.clientName, 15, y);
        y += 4;
        if (bill.clientAddress) {
            const addressLines = bill.clientAddress.split('\n');
            addressLines.forEach(line => {
                doc.text(line, 15, y);
                y += 4;
            });
        }
        if (bill.clientGSTIN) {
            doc.text(`GSTIN: ${bill.clientGSTIN}`, 15, y);
            y += 4;
        }
        if (bill.clientPhone) {
            doc.text(`Phone: ${bill.clientPhone}`, 15, y);
        }

        // Right side - Invoice details
        let rightY = y - 20;
        doc.setFont("helvetica", "bold");
        doc.text("Invoice No:", 120, rightY);
        doc.setFont("helvetica", "normal");
        doc.text(bill.billNumber, 155, rightY);

        rightY += 5;
        doc.setFont("helvetica", "bold");
        doc.text("Date:", 120, rightY);
        doc.setFont("helvetica", "normal");
        doc.text(new Date(bill.billDate).toLocaleDateString('en-IN'), 155, rightY);

        rightY += 5;
        doc.setFont("helvetica", "bold");
        doc.text("Due Date:", 120, rightY);
        doc.setFont("helvetica", "normal");
        doc.text(new Date(bill.dueDate).toLocaleDateString('en-IN'), 155, rightY);

        // Items Table
        y += 15;

        // Table Header
        doc.setFillColor(243, 244, 246);
        doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("S.No", 18, y);
        doc.text("Description", 30, y);
        doc.text("HSN", 90, y);
        doc.text("Qty", 110, y);
        doc.text("Rate", 130, y);
        doc.text("GST%", 150, y);
        doc.text("Amount", 170, y);

        // Table Rows
        y += 8;
        doc.setFont("helvetica", "normal");
        bill.items.forEach((item, index) => {
            doc.text((index + 1).toString(), 18, y);
            doc.text(item.description.substring(0, 35), 30, y);
            doc.text(item.hsnCode || "-", 90, y);
            doc.text(`${item.quantity} ${item.unit}`, 110, y);
            doc.text(`₹${item.rate.toLocaleString('en-IN')}`, 130, y);
            doc.text(`${item.gstRate}%`, 150, y);
            doc.text(`₹${item.amount.toLocaleString('en-IN')}`, 170, y);
            y += 6;
        });

        // Totals
        y += 5;
        doc.line(15, y - 3, pageWidth - 15, y - 3);

        doc.setFont("helvetica", "bold");
        doc.text("Subtotal:", 140, y);
        doc.text(`₹${bill.subtotal.toLocaleString('en-IN')}`, 170, y);

        y += 5;
        if (bill.igstAmount > 0) {
            doc.text("IGST:", 140, y);
            doc.text(`₹${bill.igstAmount.toLocaleString('en-IN')}`, 170, y);
        } else {
            doc.text("CGST:", 140, y);
            doc.text(`₹${bill.cgstAmount.toLocaleString('en-IN')}`, 170, y);
            y += 5;
            doc.text("SGST:", 140, y);
            doc.text(`₹${bill.sgstAmount.toLocaleString('en-IN')}`, 170, y);
        }

        y += 8;
        doc.setFillColor(22, 163, 74);
        doc.rect(130, y - 5, pageWidth - 145, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text("Total:", 140, y + 1);
        doc.text(`₹${bill.totalAmount.toLocaleString('en-IN')}`, 170, y + 1);

        // Amount in Words
        y += 15;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text(`Amount in words: ${bill.amountInWords}`, 15, y);

        // Bank Details
        y += 12;
        doc.setFont("helvetica", "bold");
        doc.text("Bank Details:", 15, y);
        doc.setFont("helvetica", "normal");
        y += 5;
        doc.text(`Bank: ${companyInfo?.bankName || "N/A"}`, 15, y);
        y += 4;
        doc.text(`A/C No: ${companyInfo?.accountNo || "N/A"}`, 15, y);
        y += 4;
        doc.text(`IFSC: ${companyInfo?.ifsc || "N/A"}`, 15, y);
        y += 4;
        doc.text(`UPI: ${companyInfo?.upiId || "N/A"}`, 15, y);

        // Terms
        y += 12;
        doc.setFont("helvetica", "bold");
        doc.text("Terms & Conditions:", 15, y);
        doc.setFont("helvetica", "normal");
        y += 5;
        const termsLines = bill.terms.split('\n');
        termsLines.forEach(line => {
            doc.setFontSize(8);
            doc.text(line, 15, y);
            y += 4;
        });

        // Signature
        y += 10;
        doc.setFontSize(9);
        doc.text("Authorized Signatory", pageWidth - 50, y);
        doc.line(pageWidth - 70, y - 10, pageWidth - 20, y - 10);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("This is a computer generated invoice.", pageWidth / 2, 285, { align: "center" });

        doc.save(`${bill.billNumber.replace(/\//g, '_')}.pdf`);
        toast.success("Invoice PDF downloaded");
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
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <FileText className="h-8 w-8 text-emerald-600" />
                        Tally-Style Billing
                    </h1>
                    <p className="text-zinc-500 mt-1">Generate professional GST invoices for your orders</p>
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

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 gap-2">
                            <Plus className="h-5 w-5" />
                            Create New Invoice
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[95vh] p-0">
                        <ScrollArea className="max-h-[95vh]">
                            <div className="p-6">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                        <Building2 className="h-6 w-6 text-emerald-600" />
                                        Create Tax Invoice
                                    </DialogTitle>
                                    <DialogDescription>
                                        Generate a GST compliant invoice with automatic calculations
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                                    {/* Client & Date Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-zinc-400" />
                                                Bill To (Client)
                                            </Label>
                                            <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                                                <SelectTrigger className="h-11 bg-white dark:bg-zinc-950">
                                                    <SelectValue placeholder="Select client..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {clients.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-zinc-400" />
                                                Invoice Date
                                            </Label>
                                            <Input
                                                type="date"
                                                value={formData.billDate}
                                                onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                                                className="h-11 bg-white dark:bg-zinc-950"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-zinc-400" />
                                                Due Date
                                            </Label>
                                            <Input
                                                type="date"
                                                value={formData.dueDate}
                                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                                className="h-11 bg-white dark:bg-zinc-950"
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Import from Orders */}
                                    {formData.client_id && (
                                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                            <Label className="text-blue-700 dark:text-blue-300 font-bold text-sm">Quick Import from Orders</Label>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {orders.filter(o => o.client_id === formData.client_id).slice(0, 5).map(order => (
                                                    <Button
                                                        key={order.id}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs"
                                                        onClick={() => importFromOrder(order.id)}
                                                    >
                                                        <Package className="h-3 w-3 mr-1" />
                                                        {order.product_name} (₹{order.total_amount})
                                                    </Button>
                                                ))}
                                                {orders.filter(o => o.client_id === formData.client_id).length === 0 && (
                                                    <span className="text-sm text-blue-600">No orders found for this client</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* GST Type Toggle */}
                                    <div className="flex items-center gap-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
                                        <Label className="font-bold text-amber-700">GST Type:</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant={!formData.isIGST ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setFormData({ ...formData, isIGST: false })}
                                                className={!formData.isIGST ? "bg-emerald-600" : ""}
                                            >
                                                CGST + SGST (Intra-State)
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={formData.isIGST ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setFormData({ ...formData, isIGST: true })}
                                                className={formData.isIGST ? "bg-emerald-600" : ""}
                                            >
                                                IGST (Inter-State)
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Items Section */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                <Package className="h-5 w-5 text-zinc-400" />
                                                Line Items
                                            </h3>
                                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                                <Plus className="h-4 w-4 mr-1" />
                                                Add Item
                                            </Button>
                                        </div>

                                        {formData.items.length === 0 ? (
                                            <div className="py-12 text-center bg-zinc-100 dark:bg-zinc-900 rounded-xl border-2 border-dashed">
                                                <Package className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
                                                <p className="text-zinc-500">No items added yet. Click "Add Item" or import from orders.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {formData.items.map((item, index) => (
                                                    <div key={item.id} className="grid grid-cols-12 gap-2 p-3 bg-white dark:bg-zinc-950 rounded-lg border items-end">
                                                        <div className="col-span-4 space-y-1">
                                                            <Label className="text-[10px] uppercase text-zinc-500">Description</Label>
                                                            <Input
                                                                placeholder="Product/Service name"
                                                                value={item.description}
                                                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="col-span-1 space-y-1">
                                                            <Label className="text-[10px] uppercase text-zinc-500">HSN</Label>
                                                            <Input
                                                                placeholder="Code"
                                                                value={item.hsnCode}
                                                                onChange={(e) => updateItem(item.id, 'hsnCode', e.target.value)}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="col-span-1 space-y-1">
                                                            <Label className="text-[10px] uppercase text-zinc-500">Qty</Label>
                                                            <Input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="col-span-1 space-y-1">
                                                            <Label className="text-[10px] uppercase text-zinc-500">Unit</Label>
                                                            <Input
                                                                placeholder="pcs"
                                                                value={item.unit}
                                                                onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="col-span-2 space-y-1">
                                                            <Label className="text-[10px] uppercase text-zinc-500">Rate (₹)</Label>
                                                            <Input
                                                                type="number"
                                                                value={item.rate}
                                                                onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="col-span-1 space-y-1">
                                                            <Label className="text-[10px] uppercase text-zinc-500">GST %</Label>
                                                            <Select value={item.gstRate.toString()} onValueChange={(v) => updateItem(item.id, 'gstRate', parseInt(v))}>
                                                                <SelectTrigger className="h-9">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="0">0%</SelectItem>
                                                                    <SelectItem value="5">5%</SelectItem>
                                                                    <SelectItem value="12">12%</SelectItem>
                                                                    <SelectItem value="18">18%</SelectItem>
                                                                    <SelectItem value="28">28%</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="col-span-1 space-y-1">
                                                            <Label className="text-[10px] uppercase text-zinc-500">Amount</Label>
                                                            <div className="h-9 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-md flex items-center font-bold text-emerald-600">
                                                                ₹{item.amount.toLocaleString('en-IN')}
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1 flex items-end justify-center">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => removeItem(item.id)}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Totals Summary */}
                                    <div className="flex justify-end">
                                        <div className="w-80 space-y-2 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-500">Subtotal</span>
                                                <span className="font-bold">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                                            </div>
                                            {!formData.isIGST ? (
                                                <>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-zinc-500">CGST</span>
                                                        <span className="font-medium">₹{totals.cgstAmount.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-zinc-500">SGST</span>
                                                        <span className="font-medium">₹{totals.sgstAmount.toLocaleString('en-IN')}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-zinc-500">IGST</span>
                                                    <span className="font-medium">₹{totals.igstAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                            )}
                                            <Separator />
                                            <div className="flex justify-between text-lg pt-2">
                                                <span className="font-bold">Grand Total</span>
                                                <span className="font-black text-emerald-600">₹{totals.totalAmount.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes & Terms */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Notes / Remarks</Label>
                                            <Textarea
                                                placeholder="Additional notes for the client..."
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                rows={4}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Terms & Conditions</Label>
                                            <Textarea
                                                value={formData.terms}
                                                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                                                rows={4}
                                            />
                                        </div>
                                    </div>

                                    <DialogFooter className="pt-4 border-t">
                                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Create Invoice
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-emerald-600">Total Invoiced</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-700">₹{stats.totalValue.toLocaleString('en-IN')}</div>
                        <p className="text-xs text-emerald-600 mt-1">{stats.total} invoices generated</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">Paid</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{stats.paid}</div>
                        <p className="text-xs text-emerald-600 mt-1">₹{stats.paidValue.toLocaleString('en-IN')} collected</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-amber-600">{stats.sent}</div>
                        <p className="text-xs text-zinc-500 mt-1">Awaiting payment</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">Drafts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-zinc-400">{stats.draft}</div>
                        <p className="text-xs text-zinc-500 mt-1">Ready to send</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                    placeholder="Search invoices by number or client..."
                    className="pl-10 h-11 bg-white dark:bg-zinc-900 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Bills Table */}
            <div className="rounded-2xl border bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
                        <TableRow>
                            <TableHead className="font-bold py-4 pl-6">Invoice</TableHead>
                            <TableHead className="font-bold py-4">Client</TableHead>
                            <TableHead className="font-bold py-4">Date</TableHead>
                            <TableHead className="font-bold py-4 text-right">Amount</TableHead>
                            <TableHead className="font-bold py-4 text-center">Status</TableHead>
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
                                <TableCell colSpan={6} className="text-center py-20 text-zinc-500">
                                    <FileText className="h-10 w-10 mx-auto mb-3 text-zinc-200" />
                                    <p>No invoices found. Create your first invoice to get started.</p>
                                </TableCell>
                            </TableRow>
                        ) : filteredBills.map((bill) => (
                            <TableRow key={bill.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                <TableCell className="pl-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-emerald-600">{bill.billNumber}</span>
                                        <span className="text-[10px] text-zinc-400 font-mono">{bill.id.slice(0, 8)}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{bill.clientName}</span>
                                        {bill.clientGSTIN && (
                                            <span className="text-[10px] text-zinc-500">GSTIN: {bill.clientGSTIN}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{new Date(bill.billDate).toLocaleDateString('en-IN')}</span>
                                        <span className="text-[10px] text-zinc-500">Due: {new Date(bill.dueDate).toLocaleDateString('en-IN')}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 text-right">
                                    <span className="font-black text-lg">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
                                </TableCell>
                                <TableCell className="py-4 text-center">
                                    <Badge className={cn(
                                        "rounded-full text-[10px] font-bold uppercase px-3",
                                        bill.status === 'paid' && "bg-emerald-500 hover:bg-emerald-600",
                                        bill.status === 'sent' && "bg-blue-500 hover:bg-blue-600",
                                        bill.status === 'draft' && "bg-zinc-400 hover:bg-zinc-500",
                                        bill.status === 'overdue' && "bg-red-500 hover:bg-red-600"
                                    )}>
                                        {bill.status}
                                    </Badge>
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
                                            <DropdownMenuItem onClick={() => generatePDF(bill)}>
                                                <Download className="mr-2 h-4 w-4" />
                                                Download PDF
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
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-3xl max-h-[95vh] p-0">
                    <ScrollArea className="max-h-[95vh]">
                        {selectedBill && (
                            <div className="p-8" ref={printRef}>
                                {/* Invoice Header */}
                                <div className="text-center border-b pb-6 mb-6">
                                    <h1 className="text-2xl font-bold text-emerald-600">{companyInfo?.companyName || "Your Company Name"}</h1>
                                    <p className="text-sm text-zinc-500 mt-1">{companyInfo?.address?.replace('\n', ', ') || "Company Address"}</p>
                                    <p className="text-xs text-zinc-400 mt-1">Phone: {companyInfo?.phone || "N/A"} | Email: {companyInfo?.email || "N/A"}</p>
                                    <p className="text-xs text-zinc-400">GSTIN: {companyInfo?.gstin || "N/A"} | PAN: {companyInfo?.pan || "N/A"}</p>
                                </div>

                                <div className="bg-emerald-600 text-white text-center py-2 font-bold text-lg mb-6 rounded">
                                    TAX INVOICE
                                </div>

                                <div className="grid grid-cols-2 gap-8 mb-6">
                                    <div>
                                        <h3 className="font-bold text-sm text-zinc-500 mb-2">BILL TO:</h3>
                                        <p className="font-bold text-lg">{selectedBill.clientName}</p>
                                        {selectedBill.clientAddress && <p className="text-sm text-zinc-600">{selectedBill.clientAddress}</p>}
                                        {selectedBill.clientGSTIN && <p className="text-sm text-zinc-500">GSTIN: {selectedBill.clientGSTIN}</p>}
                                        {selectedBill.clientPhone && <p className="text-sm text-zinc-500">Phone: {selectedBill.clientPhone}</p>}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm"><span className="text-zinc-500">Invoice No:</span> <span className="font-bold">{selectedBill.billNumber}</span></p>
                                        <p className="text-sm"><span className="text-zinc-500">Date:</span> {new Date(selectedBill.billDate).toLocaleDateString('en-IN')}</p>
                                        <p className="text-sm"><span className="text-zinc-500">Due Date:</span> {new Date(selectedBill.dueDate).toLocaleDateString('en-IN')}</p>
                                    </div>
                                </div>

                                <table className="w-full mb-6">
                                    <thead>
                                        <tr className="bg-zinc-100">
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

                                <div className="flex justify-end mb-6">
                                    <div className="w-64 space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-500">Subtotal</span>
                                            <span className="font-bold">₹{selectedBill.subtotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        {selectedBill.igstAmount > 0 ? (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-500">IGST</span>
                                                <span>₹{selectedBill.igstAmount.toLocaleString('en-IN')}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-zinc-500">CGST</span>
                                                    <span>₹{selectedBill.cgstAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-zinc-500">SGST</span>
                                                    <span>₹{selectedBill.sgstAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="flex justify-between text-lg pt-2 border-t mt-2">
                                            <span className="font-bold">Total</span>
                                            <span className="font-black text-emerald-600">₹{selectedBill.totalAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm italic text-zinc-600 mb-6">
                                    Amount in words: <span className="font-medium">{selectedBill.amountInWords}</span>
                                </p>

                                <div className="grid grid-cols-2 gap-8 text-xs text-zinc-500 border-t pt-4">
                                    <div>
                                        <h4 className="font-bold text-zinc-700 mb-1">Bank Details:</h4>
                                        <p>Bank: {companyInfo?.bankName || "N/A"}</p>
                                        <p>A/C No: {companyInfo?.accountNo || "N/A"}</p>
                                        <p>IFSC: {companyInfo?.ifsc || "N/A"}</p>
                                        <p>UPI: {companyInfo?.upiId || "N/A"}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-zinc-700 mb-1">Terms & Conditions:</h4>
                                        <pre className="whitespace-pre-wrap font-sans">{selectedBill.terms}</pre>
                                    </div>
                                </div>

                                <div className="text-right mt-8 pt-8">
                                    <div className="inline-block text-center">
                                        <div className="border-t border-zinc-300 pt-2 px-8">
                                            <p className="text-xs text-zinc-500">Authorized Signatory</p>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-center text-xs text-zinc-400 mt-8">
                                    This is a computer generated invoice.
                                </p>
                            </div>
                        )}
                    </ScrollArea>
                    <div className="p-4 border-t flex justify-end gap-2 bg-zinc-50">
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                            Close
                        </Button>
                        {selectedBill && (
                            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => generatePDF(selectedBill)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-[350px]">
                    <DialogHeader>
                        <DialogTitle>Delete Invoice</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this invoice? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => billToDelete && handleDelete(billToDelete)}
                            className="flex-1"
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
