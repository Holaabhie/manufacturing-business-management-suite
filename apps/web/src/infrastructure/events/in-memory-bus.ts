/**
 * In-Memory Event Bus
 * ─────────────────────────────────────────────────────────
 * Simple in-process event bus for development and single-server
 * deployments. Replace with Redis Pub/Sub, RabbitMQ, or SQS
 * for distributed environments.
 *
 * Handlers are fire-and-forget — failures are logged but
 * do not propagate to the publisher.
 */

import type { DomainEvent, EventBus, EventHandler } from "./bus";
import { logger } from "../logging/logger";

export class InMemoryEventBus implements EventBus {
    private handlers = new Map<string, EventHandler[]>();

    subscribe(eventType: string, handler: EventHandler): void {
        const existing = this.handlers.get(eventType) ?? [];
        existing.push(handler);
        this.handlers.set(eventType, existing);
        logger.debug("Event handler registered", { eventType });
    }

    async publish(event: DomainEvent): Promise<void> {
        logger.debug("Event published", {
            eventType: event.eventType,
            aggregateId: event.aggregateId,
            tenantId: event.tenantId,
        });

        const handlers = this.handlers.get(event.eventType) ?? [];

        // Fire and forget — handlers should not block the publisher
        for (const handler of handlers) {
            try {
                await handler.handle(event);
            } catch (error) {
                logger.error("Event handler failed", {
                    eventType: event.eventType,
                    aggregateId: event.aggregateId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
}

export const eventBus: EventBus = new InMemoryEventBus();
