export interface PlanLimits {
    inventory: number | null;
    orders: number | null;
    clients: number | null;
}

export const PLAN_LIMITS: Record<"starter" | "pro", PlanLimits> = {
    starter: {
        inventory: 5,
        orders: 5,
        clients: 5,
    },
    pro: {
        inventory: null,
        orders: null,
        clients: null,
    },
};

export const STARTER_LIMIT = 5;
