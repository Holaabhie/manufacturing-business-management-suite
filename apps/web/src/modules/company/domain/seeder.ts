import { TaxSlab, UnitOfMeasure } from '@/models/TaxSlab';
import { LedgerGroup, Ledger } from '@/models/Ledger';
import { getDb } from '@/lib/mongodb';

export const INDIAN_GST_SLABS = [
    { name: 'GST 0%', rate: 0, tax_type: 'GST' },
    { name: 'GST 0.25%', rate: 0.25, tax_type: 'GST' },
    { name: 'GST 3%', rate: 3, tax_type: 'GST' },
    { name: 'GST 5%', rate: 5, tax_type: 'GST' },
    { name: 'GST 12%', rate: 12, tax_type: 'GST' },
    { name: 'GST 18%', rate: 18, tax_type: 'GST' },
    { name: 'GST 28%', rate: 28, tax_type: 'GST' },
];

export const STANDARD_UNITS = [
    { name: 'Pieces', symbol: 'Pcs', category: 'Quantity', is_default: true },
    { name: 'Kilograms', symbol: 'Kg', category: 'Weight', is_default: false },
    { name: 'Meters', symbol: 'm', category: 'Length', is_default: false },
    { name: 'Liters', symbol: 'L', category: 'Volume', is_default: false },
    { name: 'Boxes', symbol: 'Box', category: 'Quantity', is_default: false },
    { name: 'Sets', symbol: 'Set', category: 'Quantity', is_default: false },
];

export const TALLY_LEDGER_GROUPS = [
    { name: 'Current Assets', parent: null, nature: 'Assets', is_system: true },
    { name: 'Cash-in-Hand', parent: 'Current Assets', nature: 'Assets', is_system: true },
    { name: 'Bank Accounts', parent: 'Current Assets', nature: 'Assets', is_system: true },
    { name: 'Sundry Debtors', parent: 'Current Assets', nature: 'Assets', is_system: true },
    { name: 'Stock-in-Hand', parent: 'Current Assets', nature: 'Assets', is_system: true },
    { name: 'Deposits', parent: 'Current Assets', nature: 'Assets', is_system: true },
    { name: 'Loans & Advances (Asset)', parent: 'Current Assets', nature: 'Assets', is_system: true },

    { name: 'Fixed Assets', parent: null, nature: 'Assets', is_system: true },
    { name: 'Plant & Machinery', parent: 'Fixed Assets', nature: 'Assets', is_system: true },
    { name: 'Furniture & Fixtures', parent: 'Fixed Assets', nature: 'Assets', is_system: true },
    { name: 'Vehicles', parent: 'Fixed Assets', nature: 'Assets', is_system: true },
    { name: 'Computers & IT Equipment', parent: 'Fixed Assets', nature: 'Assets', is_system: true },

    { name: 'Current Liabilities', parent: null, nature: 'Liabilities', is_system: true },
    { name: 'Sundry Creditors', parent: 'Current Liabilities', nature: 'Liabilities', is_system: true },
    { name: 'Duties & Taxes', parent: 'Current Liabilities', nature: 'Liabilities', is_system: true },
    { name: 'Other Current Liabilities', parent: 'Current Liabilities', nature: 'Liabilities', is_system: true },

    { name: 'Loans (Liability)', parent: null, nature: 'Liabilities', is_system: true },
    { name: 'Bank Loans', parent: 'Loans (Liability)', nature: 'Liabilities', is_system: true },

    { name: 'Sales Accounts', parent: null, nature: 'Income', is_system: true },
    { name: 'Direct Income', parent: null, nature: 'Income', is_system: true },
    { name: 'Indirect Income', parent: null, nature: 'Income', is_system: true },
    { name: 'Interest Received', parent: 'Indirect Income', nature: 'Income', is_system: true },
    { name: 'Discount Received', parent: 'Indirect Income', nature: 'Income', is_system: true },

    { name: 'Direct Expenses', parent: null, nature: 'Expense', is_system: true, affects_gross_profit: true },
    { name: 'Purchases', parent: 'Direct Expenses', nature: 'Expense', is_system: true, affects_gross_profit: true },
    { name: 'Freight & Transport', parent: 'Direct Expenses', nature: 'Expense', is_system: true, affects_gross_profit: true },
    { name: 'Manufacturing Expenses', parent: 'Direct Expenses', nature: 'Expense', is_system: true, affects_gross_profit: true },

    { name: 'Indirect Expenses', parent: null, nature: 'Expense', is_system: true },
    { name: 'Salaries & Wages', parent: 'Indirect Expenses', nature: 'Expense', is_system: true },
    { name: 'Rent', parent: 'Indirect Expenses', nature: 'Expense', is_system: true },
    { name: 'Electricity', parent: 'Indirect Expenses', nature: 'Expense', is_system: true },
    { name: 'Bank Charges', parent: 'Indirect Expenses', nature: 'Expense', is_system: true },
];

export const TALLY_DEFAULT_LEDGERS = [
    { name: 'Cash', group: 'Cash-in-Hand', is_system: true, balance_type: 'Debit' },
    { name: 'GST Payable — CGST', group: 'Duties & Taxes', is_system: true, balance_type: 'Credit' },
    { name: 'GST Payable — SGST', group: 'Duties & Taxes', is_system: true, balance_type: 'Credit' },
    { name: 'GST Payable — IGST', group: 'Duties & Taxes', is_system: true, balance_type: 'Credit' },
    { name: 'CGST Input Credit', group: 'Current Assets', is_system: true, balance_type: 'Debit' }, // Technically Duties & Taxes but often tracked separately
    { name: 'SGST Input Credit', group: 'Current Assets', is_system: true, balance_type: 'Debit' },
    { name: 'IGST Input Credit', group: 'Current Assets', is_system: true, balance_type: 'Debit' },
    { name: 'TDS Payable', group: 'Duties & Taxes', is_system: true, balance_type: 'Credit' },
    { name: 'TCS Payable', group: 'Duties & Taxes', is_system: true, balance_type: 'Credit' },
    { name: 'Round Off', group: 'Indirect Expenses', is_system: true, balance_type: 'Debit' },
];

export async function seedCompanyDefaults(organizationId: string) {
    // 1. Seed Tax Slabs
    for (const slab of INDIAN_GST_SLABS) {
        await TaxSlab.updateOne(
            { organizationId, name: slab.name },
            { $setOnInsert: { ...slab, organizationId, is_active: true } },
            { upsert: true }
        );
    }

    // 2. Seed Units
    for (const unit of STANDARD_UNITS) {
        await UnitOfMeasure.updateOne(
            { organizationId, name: unit.name },
            { $setOnInsert: { ...unit, organizationId } },
            { upsert: true }
        );
    }

    // 3. Seed Ledger Groups
    // Need to do this sequentially to respect parent relationships
    const groupNameMap = new Map<string, string>(); // name -> _id

    // First pass: parentless
    for (const group of TALLY_LEDGER_GROUPS.filter(g => !g.parent)) {
        const doc = await LedgerGroup.findOneAndUpdate(
            { organizationId, name: group.name },
            {
                $setOnInsert: {
                    name: group.name,
                    nature: group.nature,
                    is_system: group.is_system,
                    affects_gross_profit: group.affects_gross_profit || false,
                    organizationId
                }
            },
            { upsert: true, new: true }
        );
        if (doc) groupNameMap.set(group.name, doc._id.toString());
    }

    // Second pass: with parents
    for (const group of TALLY_LEDGER_GROUPS.filter(g => g.parent)) {
        const parentId = group.parent ? groupNameMap.get(group.parent) : undefined;
        const doc = await LedgerGroup.findOneAndUpdate(
            { organizationId, name: group.name },
            {
                $setOnInsert: {
                    name: group.name,
                    parent_id: parentId,
                    nature: group.nature,
                    is_system: group.is_system,
                    affects_gross_profit: group.affects_gross_profit || false,
                    organizationId
                }
            },
            { upsert: true, new: true }
        );
        if (doc) groupNameMap.set(group.name, doc._id.toString());
    }

    // 4. Seed Default Ledgers
    for (const ledger of TALLY_DEFAULT_LEDGERS) {
        const groupId = groupNameMap.get(ledger.group);
        if (!groupId) continue;

        await Ledger.updateOne(
            { organizationId, name: ledger.name },
            {
                $setOnInsert: {
                    name: ledger.name,
                    ledger_group_id: groupId,
                    is_system: ledger.is_system,
                    balance_type: ledger.balance_type,
                    opening_balance: 0,
                    current_balance: 0,
                    organizationId,
                    is_active: true
                }
            },
            { upsert: true }
        );
    }
}
