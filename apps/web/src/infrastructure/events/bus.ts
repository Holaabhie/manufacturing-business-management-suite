/**
 * Domain Event Bus — Interface
 * ─────────────────────────────────────────────────────────
 * Defines the contract for publishing and subscribing to
 * domain events. Implementations can be in-memory, Redis,
 * RabbitMQ, or any message broker.
 */

export interface DomainEvent {
    eventId: string;
    eventType: string;
    aggregateId: string;
    tenantId: string;
    timestamp: string;
    payload: Record<string, unknown>;
    metadata: {
        userId: string;
        correlationId: string;
        version: number;
    };
}

export interface EventHandler {
    handle(event: DomainEvent): Promise<void>;
}

export interface EventBus {
    publish(event: DomainEvent): Promise<void>;
    subscribe(eventType: string, handler: EventHandler): void;
}

// ─── Helper to create events ────────────────────────────────────

export function createDomainEvent(
    params: Pick<DomainEvent, "eventType" | "aggregateId" | "tenantId" | "payload"> & {
        userId: string;
        correlationId: string;
    },
): DomainEvent {
    return {
        eventId: crypto.randomUUID(),
        eventType: params.eventType,
        aggregateId: params.aggregateId,
        tenantId: params.tenantId,
        timestamp: new Date().toISOString(),
        payload: params.payload,
        metadata: {
            userId: params.userId,
            correlationId: params.correlationId,
            version: 1,
        },
    };
}
