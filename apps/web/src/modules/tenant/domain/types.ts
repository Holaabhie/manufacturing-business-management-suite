/**
 * Tenant Domain — Types
 * ─────────────────────────────────────────────────────────
 * Pure TypeScript types with ZERO framework dependencies.
 * Defines the core tenant vocabulary.
 */

// ─── Entity ─────────────────────────────────────────────────────

export interface Tenant {
    id: string;
    slug: string;
    name: string;
    plan: TenantPlan;
    status: TenantStatus;
    settings: TenantSettings;
    limits: TenantLimits;
    createdAt: Date;
}

// ─── Value Objects ──────────────────────────────────────────────

export type TenantPlan = "free" | "starter" | "professional" | "enterprise";
export type TenantStatus = "active" | "suspended" | "cancelled";

export interface TenantSettings {
    timezone: string;
    currency: string;
    locale: string;
    features: Record<string, boolean>;
}

export interface TenantLimits {
    maxUsers: number;
    maxItems: number;
    maxStorageBytes: number;
    apiRateLimit: number;
}

// ─── DTOs ───────────────────────────────────────────────────────

export interface CreateTenantDTO {
    slug: string;
    name: string;
    plan?: TenantPlan;
}

export interface UpdateTenantDTO {
    name?: string;
    plan?: TenantPlan;
    status?: TenantStatus;
    settings?: Partial<TenantSettings>;
    limits?: Partial<TenantLimits>;
}

// ─── Repository Interface ───────────────────────────────────────

export interface ITenantRepository {
    findById(id: string): Promise<Tenant | null>;
    findBySlug(slug: string): Promise<Tenant | null>;
    create(data: CreateTenantDTO): Promise<Tenant>;
    update(id: string, data: UpdateTenantDTO): Promise<Tenant | null>;
}
