import type { IBillingRepository, Bill } from "../domain/types";
import { createBillSchema, updateBillSchema } from "../domain/schemas";
import { NotFoundError, AlreadyExistsError, ValidationError, type FieldError } from "@/shared/lib/errors";

export class BillingService {
    constructor(private readonly repo: IBillingRepository) { }

    async findAll(userId: string): Promise<Bill[]> {
        return this.repo.findAll(userId);
    }

    async findById(id: string, userId: string): Promise<Bill> {
        const bill = await this.repo.findById(id, userId);
        if (!bill) throw new NotFoundError("Bill", id);
        return bill;
    }

    /**
     * Generate a sequential invoice number in format INV/YYYY-MM/XXXX
     * where XXXX resets each month.
     */
    private async generateInvoiceNumber(userId: string): Promise<string> {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `INV/${year}-${month}`;

        // Count existing invoices this month for this user
        const count = await this.repo.countByBillNumberPrefix(userId, prefix);
        const sequence = String(count + 1).padStart(4, '0');
        return `${prefix}/${sequence}`;
    }

    async create(userId: string, input: unknown): Promise<Bill> {
        const parsed = createBillSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."), message: i.message,
            }));
            throw new ValidationError(errs);
        }

        // Always generate a proper sequential invoice number server-side
        const billNumber = await this.generateInvoiceNumber(userId);
        const data = { ...parsed.data, billNumber };

        // Check for duplicate bill number (safety net for race conditions)
        const existing = await this.repo.findByBillNumber(userId, billNumber);
        if (existing) {
            // Retry once with incremented sequence
            const retryNumber = await this.generateInvoiceNumber(userId);
            data.billNumber = retryNumber;
        }

        return this.repo.create(userId, data);
    }

    async update(id: string, userId: string, input: unknown): Promise<Bill> {
        const parsed = updateBillSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."), message: i.message,
            }));
            throw new ValidationError(errs);
        }
        const updated = await this.repo.update(id, userId, parsed.data);
        if (!updated) throw new NotFoundError("Bill", id);
        return updated;
    }

    async delete(id: string, userId: string): Promise<void> {
        const deleted = await this.repo.delete(id, userId);
        if (!deleted) throw new NotFoundError("Bill", id);
    }
}
