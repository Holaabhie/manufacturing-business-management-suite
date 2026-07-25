import { ObjectId } from "mongodb";
import type { IProductionRepository, Production } from "../domain/types";
import { createProductionSchema, updateProductionSchema } from "../domain/schemas";
import { NotFoundError, ValidationError, InsufficientStockError, type FieldError } from "@/shared/lib/errors";

export class ProductionService {
    constructor(private readonly repo: IProductionRepository) { }

    async findAll(userId: string): Promise<Production[]> {
        return this.repo.findAll(userId);
    }

    async findById(id: string, userId: string): Promise<Production> {
        const prod = await this.repo.findById(id, userId);
        if (!prod) throw new NotFoundError("Production", id);
        return prod;
    }

    async create(userId: string, userName: string, userRole: string, input: unknown): Promise<Production> {
        const parsed = createProductionSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."), message: i.message,
            }));
            throw new ValidationError(errs);
        }

        // Generate batch number
        const count = await this.repo.getProductionCount(userId);
        const batchNumber =
            parsed.data.batchNumber ||
            `PRD-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

        // Generate production ID early so deductMaterials can reference it
        const productionId = new ObjectId().toString();

        // Deduct materials from inventory (with context for usageHistory)
        if (parsed.data.materials && parsed.data.materials.length > 0) {
            await this.repo.deductMaterials(parsed.data.materials, {
                productionId,
                orderId: parsed.data.orderId,
                orderProductName: parsed.data.orderProductName,
            });
        }

        // Create initial activity log entry
        const initialLog = {
            id: new ObjectId().toString(),
            timestamp: new Date().toISOString(),
            action: "Production Created",
            performedBy: userName,
            performedByRole: userRole,
            details: `Production batch ${batchNumber} created for order ${parsed.data.orderProductName}`,
        };

        return this.repo.create(userId, parsed.data, batchNumber, userName, initialLog);
    }

    async update(id: string, userId: string, input: unknown): Promise<Production> {
        const parsed = updateProductionSchema.safeParse(input);
        if (!parsed.success) {
            const errs: FieldError[] = parsed.error.issues.map((i) => ({
                field: i.path.join("."), message: i.message,
            }));
            throw new ValidationError(errs);
        }
        const updated = await this.repo.update(id, userId, parsed.data);
        if (!updated) throw new NotFoundError("Production", id);
        return updated;
    }

    async delete(id: string, userId: string): Promise<void> {
        const deleted = await this.repo.delete(id, userId);
        if (!deleted) throw new NotFoundError("Production", id);
    }
}
