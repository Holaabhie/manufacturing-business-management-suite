import type { IPaymentRepository, Payment } from "../domain/types";
import { createPaymentSchema } from "../domain/schemas";
import { ValidationError, type FieldError } from "@/shared/lib/errors";

export class PaymentService {
    constructor(private readonly repo: IPaymentRepository) { }

    async findAll(userId: string): Promise<Payment[]> {
        return this.repo.findAll(userId);
    }

    async findById(id: string, userId: string): Promise<Payment | null> {
        return this.repo.findById(id, userId);
    }

    async create(userId: string, input: unknown): Promise<Payment> {
        const parsed = createPaymentSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."), message: i.message,
            }));
            throw new ValidationError(errs);
        }
        return this.repo.create(userId, parsed.data);
    }

    async delete(id: string, userId: string): Promise<boolean> {
        return this.repo.delete(id, userId);
    }
}
