import type { IQuoteRepository, Quotation, QuoteStatus } from "../domain/types";
import { createQuoteSchema, updateQuoteSchema } from "../domain/schemas";
import { NotFoundError, ValidationError, ConflictError, type FieldError } from "@/shared/lib/errors";
import { generateSequentialQuotationNumber } from "../infrastructure/quote-sequence";

export class QuoteService {
    constructor(private readonly repo: IQuoteRepository) {}

    async findAll(userId: string): Promise<Quotation[]> {
        return this.repo.findAll(userId);
    }

    async findById(id: string, userId: string): Promise<Quotation> {
        const quote = await this.repo.findById(id, userId);
        if (!quote) throw new NotFoundError("Quotation", id);
        return quote;
    }

    async create(userId: string, createdBy: string, input: unknown): Promise<Quotation> {
        const parsed = createQuoteSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."),
                message: i.message,
            }));
            throw new ValidationError(errs);
        }

        // Generate race-safe sequential quotation number if not provided
        let quotationNumber = parsed.data.quotation_number;
        if (!quotationNumber) {
            quotationNumber = await generateSequentialQuotationNumber(userId);
        }

        // Check for duplicate number within tenant
        const existing = await this.repo.findByNumber(userId, quotationNumber);
        if (existing) {
            // Retry once with new sequential number
            quotationNumber = await generateSequentialQuotationNumber(userId);
        }

        const data = {
            ...parsed.data,
            quotation_number: quotationNumber,
        };

        return this.repo.create(userId, createdBy, data);
    }

    async update(id: string, userId: string, input: unknown): Promise<Quotation> {
        const parsed = updateQuoteSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."),
                message: i.message,
            }));
            throw new ValidationError(errs);
        }

        const existing = await this.repo.findById(id, userId);
        if (!existing) throw new NotFoundError("Quotation", id);

        const hasConvertedLines = existing.converted_lines && existing.converted_lines.length > 0;
        if (hasConvertedLines) {
            // Changes to items/totals/customer not allowed on converted quotes (notes/terms only)
            const attemptedKeys = Object.keys(parsed.data).filter((k) => (parsed.data as any)[k] !== undefined);
            const forbiddenKeys = [
                "items", "subtotal", "total_discount", "total_tax", "grand_total",
                "cgst_amount", "sgst_amount", "igst_amount", "is_igst",
                "customer", "clientId", "clientName", "clientAddress", "clientGSTIN", "clientPhone", "clientEmail",
                "quotation_date", "valid_until"
            ];
            const hasForbidden = attemptedKeys.some((k) => forbiddenKeys.includes(k));
            if (hasForbidden) {
                throw new ConflictError("Cannot modify items, totals, or customer on a quotation with converted lines. Only notes and terms edits are allowed.");
            }
        }

        const updated = await this.repo.update(id, userId, parsed.data);
        if (!updated) throw new NotFoundError("Quotation", id);
        return updated;
    }

    /**
     * Transition quote status.
     * Allowed:
     * - Draft -> Sent
     * - Sent / Expired -> Accepted, Rejected, or Draft
     * - Accepted / Rejected -> Sent or Draft
     */
    async updateStatus(id: string, userId: string, newStatus: QuoteStatus): Promise<Quotation> {
        const quote = await this.repo.findById(id, userId);
        if (!quote) throw new NotFoundError("Quotation", id);

        const hasConvertedLines = quote.converted_lines && quote.converted_lines.length > 0;
        if (hasConvertedLines) {
            throw new ConflictError("Cannot change status of a quotation with converted lines. Converted quotes remain in Accepted status.");
        }

        const currentStatus = quote.status;

        // Validation of state machine
        if (currentStatus === "Draft") {
            if (!["Sent", "Accepted", "Rejected"].includes(newStatus)) {
                throw new ValidationError([{
                    field: "status",
                    message: `Cannot transition from Draft to ${newStatus}`,
                }]);
            }
        } else if (currentStatus === "Sent" || currentStatus === "Expired") {
            if (!["Accepted", "Rejected", "Draft", "Sent"].includes(newStatus)) {
                throw new ValidationError([{
                    field: "status",
                    message: `Cannot transition from ${currentStatus} to ${newStatus}`,
                }]);
            }
        }

        const updated = await this.repo.update(id, userId, { status: newStatus });
        if (!updated) throw new NotFoundError("Quotation", id);
        return updated;
    }

    /**
     * Duplicate a quote into a new Draft quotation.
     */
    async duplicate(id: string, userId: string, createdBy: string): Promise<Quotation> {
        const original = await this.repo.findById(id, userId);
        if (!original) throw new NotFoundError("Quotation", id);

        const newQuotationNumber = await generateSequentialQuotationNumber(userId);
        const today = new Date();
        const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const newQuoteData = {
            quotation_number: newQuotationNumber,
            quotation_date: today.toISOString().split("T")[0],
            valid_until: validUntil.toISOString().split("T")[0],
            customer: original.customer,
            clientId: original.clientId,
            clientName: original.clientName,
            clientAddress: original.clientAddress,
            clientGSTIN: original.clientGSTIN,
            clientPhone: original.clientPhone,
            clientEmail: original.clientEmail,
            items: original.items,
            subtotal: original.subtotal,
            total_discount: original.total_discount,
            total_tax: original.total_tax,
            grand_total: original.grand_total,
            cgst_amount: original.cgst_amount,
            sgst_amount: original.sgst_amount,
            igst_amount: original.igst_amount,
            is_igst: original.is_igst,
            terms: original.terms,
            notes: original.notes,
            status: "Draft" as QuoteStatus,
            converted_order_id: null,
            converted_lines: [],
        };

        return this.repo.create(userId, createdBy, newQuoteData);
    }

    async delete(id: string, userId: string): Promise<void> {
        const existing = await this.repo.findById(id, userId);
        if (!existing) throw new NotFoundError("Quotation", id);
        if (existing.converted_lines && existing.converted_lines.length > 0) {
            throw new ConflictError("Cannot delete quotation with converted lines");
        }
        const deleted = await this.repo.delete(id, userId);
        if (!deleted) throw new NotFoundError("Quotation", id);
    }

    async claimLine(quoteId: string, ownerId: string, lineIndex: number): Promise<Quotation | null> {
        return this.repo.claimLine(quoteId, ownerId, lineIndex);
    }

    async attachOrder(quoteId: string, ownerId: string, lineIndex: number, orderId: string): Promise<{ quote: Quotation; statusChangedToAccepted: boolean } | null> {
        return this.repo.attachOrder(quoteId, ownerId, lineIndex, orderId);
    }

    async releaseClaim(quoteId: string, ownerId: string, lineIndex: number): Promise<boolean> {
        return this.repo.releaseClaim(quoteId, ownerId, lineIndex);
    }
}
