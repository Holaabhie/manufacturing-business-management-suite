export interface BillItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gstRate: number;
}

export interface Bill {
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

export interface CompanyInfo {
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

export interface BillingStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  totalValue: number;
  paidValue: number;
}

