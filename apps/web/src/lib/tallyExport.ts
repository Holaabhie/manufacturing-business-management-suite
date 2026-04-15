import * as XLSX from 'xlsx';

// Define the interface based on the BillingPage's Bill type to match data exactly
export interface TallyInvoice {
    billNumber: string;
    billDate: string;
    clientName: string;
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    notes?: string;
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch {
        return dateStr;
    }
}

export function exportToTally(invoices: TallyInvoice[]) {
    const rows = invoices.map(inv => ({
        'Date': formatDate(inv.billDate),           // DD-MM-YYYY
        'Voucher Type': 'Sales',
        'Voucher No': inv.billNumber,
        'Party Name': inv.clientName,
        'Ledger Name': 'Sales Account',
        'Amount': inv.subtotal,
        'GST %': inv.igstAmount > 0 ? 18 : 18,      // Standard assumption unless specific item breakdowns
        'CGST': inv.cgstAmount || 0,
        'SGST': inv.sgstAmount || 0,
        'IGST': inv.igstAmount || 0,
        'Narration': `Invoice ${inv.billNumber}${inv.notes ? ` - ${inv.notes}` : ''}`
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Vouchers');
    XLSX.writeFile(wb, `Tally_Export_${Date.now()}.xlsx`);
}
