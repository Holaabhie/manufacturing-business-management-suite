import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
    toKolkataDateString,
    addDaysToKolkataDateString,
    differenceInDays,
    DEFAULT_CREDIT_DAYS,
} from "@/lib/reports/receivables";
import { sendNotification } from "@/lib/notifications/dispatcher";
import type {
    ReminderRule,
    ReminderLog,
    ReminderLogsFilter,
    ReminderPreviewResult,
    ReminderPreviewCandidate,
    CronRunSummary,
    IReminderRepository,
} from "../domain/types";
import type {
    CreateReminderRuleInput,
    UpdateReminderRuleInput,
} from "../domain/schemas";

export const DEFAULT_CRON_ORDER_LIMIT = 100;

interface CandidateOrder {
    orderId: string;
    clientId: string | null;
    clientName: string;
    clientEmail: string;
    totalAmountPaise: number;
    outstandingPaise: number;
    orderDateStr: string;
    dueDateStr: string;
    daysPastDue: number;
    rule: ReminderRule;
    dedupeKey: string;
}

export class ReminderService {
    constructor(private readonly repo: IReminderRepository) {}

    async listRules(userId: string): Promise<ReminderRule[]> {
        return this.repo.listRules(userId);
    }

    async getRule(userId: string, id: string): Promise<ReminderRule | null> {
        return this.repo.findRuleById(userId, id);
    }

    async createRule(
        userId: string,
        createdBy: string,
        input: CreateReminderRuleInput
    ): Promise<ReminderRule> {
        return this.repo.createRule(userId, createdBy, input);
    }

    async updateRule(
        userId: string,
        id: string,
        input: UpdateReminderRuleInput
    ): Promise<ReminderRule | null> {
        return this.repo.updateRule(userId, id, input);
    }

    async deleteRule(userId: string, id: string): Promise<boolean> {
        return this.repo.deleteRule(userId, id);
    }

    async listLogs(
        userId: string,
        filters: ReminderLogsFilter
    ): Promise<{ logs: ReminderLog[]; total: number }> {
        return this.repo.findLogs(userId, filters);
    }

    async getLastLogForOrder(
        userId: string,
        orderId: string
    ): Promise<ReminderLog | null> {
        return this.repo.findLastLogForOrder(userId, orderId);
    }

    /**
     * Internal helper to evaluate all candidate orders against active reminder rules
     * using Phase 3a receivables logic and IST date math.
     */
    private async evaluateCandidateOrders(
        userId: string,
        asOfDateStr?: string
    ): Promise<{
        todayIST: string;
        candidates: CandidateOrder[];
        activeRules: ReminderRule[];
    }> {
        const todayIST = asOfDateStr || toKolkataDateString(new Date()) || "2026-10-02";
        const activeRules = await this.repo.getActiveRules(userId);

        if (activeRules.length === 0) {
            return { todayIST, candidates: [], activeRules: [] };
        }

        const db = await getDb();

        // 1. Fetch tenant clients
        const rawClients = await db
            .collection("clients")
            .find({ userId })
            .toArray();

        const clientMap = new Map<
            string,
            { name: string; company: string; email: string; phone: string }
        >();
        const sampleClientIds = new Set<string>();

        for (const c of rawClients) {
            const id = String(c._id);
            if (c.is_sample === true) {
                sampleClientIds.add(id);
                continue;
            }
            clientMap.set(id, {
                name: c.name || "Unnamed Client",
                company: c.company || "",
                email: (c.email || "").trim(),
                phone: (c.phone || "").trim(),
            });
        }

        // 2. Fetch tenant orders
        const rawOrders = await db
            .collection("orders")
            .find({ userId })
            .toArray();

        // 3. Fetch tenant payments (legacy payments collection only)
        const rawPayments = await db
            .collection("payments")
            .find({ userId })
            .toArray();

        interface OrderEntry {
            id: string;
            clientId: string | null;
            amountPaise: number;
            paymentsAppliedPaise: number;
            outstandingPaise: number;
            orderDateStr: string;
            dueDateStr: string;
        }

        const validOrdersMap = new Map<string, OrderEntry>();
        const sampleOrderIds = new Set<string>();

        for (const order of rawOrders) {
            const clientId = order.client_id
                ? String(order.client_id)
                : order.clientId
                ? String(order.clientId)
                : order.customer_id
                ? String(order.customer_id)
                : null;

            // Exclude sample orders or orders belonging to sample clients
            if (order.is_sample === true || (clientId && sampleClientIds.has(clientId))) {
                sampleOrderIds.add(String(order._id));
                continue;
            }

            // Exclude cancelled / canceled
            const status = (order.status || "").toLowerCase().trim();
            if (status === "cancelled" || status === "canceled") {
                continue;
            }

            // Skip orders whose amount is absent/non-finite
            const rawAmount = order.total_amount ?? order.totalAmount;
            if (typeof rawAmount !== "number" || isNaN(rawAmount) || !isFinite(rawAmount)) {
                continue;
            }

            const amountPaise = Math.round(rawAmount * 100);
            const rawDate =
                order.order_date ?? order.orderDate ?? order.createdAt ?? order.created_at;
            const orderDateStr = toKolkataDateString(rawDate) || todayIST;

            // Due date: order.payment_due_date if present, else order date + DEFAULT_CREDIT_DAYS (30)
            const rawDueDate = order.payment_due_date ?? order.paymentDueDate;
            const dueDateStr =
                toKolkataDateString(rawDueDate) ||
                addDaysToKolkataDateString(orderDateStr, DEFAULT_CREDIT_DAYS);

            const orderId = String(order._id);
            validOrdersMap.set(orderId, {
                id: orderId,
                clientId,
                amountPaise,
                paymentsAppliedPaise: 0,
                outstandingPaise: 0,
                orderDateStr,
                dueDateStr,
            });
        }

        // Apply payments
        const seenPaymentIds = new Set<string>();
        for (const payment of rawPayments) {
            const pid = String(payment._id);
            if (seenPaymentIds.has(pid)) continue;
            seenPaymentIds.add(pid);

            if (payment.is_sample === true) continue;

            const orderId = payment.order_id
                ? String(payment.order_id)
                : payment.orderId
                ? String(payment.orderId)
                : null;

            if (orderId && sampleOrderIds.has(orderId)) continue;

            const cId = payment.client_id
                ? String(payment.client_id)
                : payment.clientId
                ? String(payment.clientId)
                : null;

            if (cId && sampleClientIds.has(cId)) continue;

            const rawAmount = payment.amount;
            if (typeof rawAmount !== "number" || isNaN(rawAmount) || !isFinite(rawAmount)) {
                continue;
            }
            const paymentAmountPaise = Math.round(rawAmount * 100);

            if (orderId && validOrdersMap.has(orderId)) {
                const ord = validOrdersMap.get(orderId)!;
                ord.paymentsAppliedPaise += paymentAmountPaise;
            }
        }

        // Calculate outstanding balance per order
        for (const ord of validOrdersMap.values()) {
            ord.outstandingPaise = Math.max(0, ord.amountPaise - ord.paymentsAppliedPaise);
        }

        // Evaluate orders against active reminder rules
        const candidates: CandidateOrder[] = [];

        for (const ord of validOrdersMap.values()) {
            if (ord.outstandingPaise <= 0) {
                continue;
            }

            const daysPastDue = differenceInDays(todayIST, ord.dueDateStr);

            for (const rule of activeRules) {
                // Check minimum outstanding threshold
                if (ord.outstandingPaise < rule.min_outstanding_paise) {
                    continue;
                }

                let matches = false;

                if (rule.trigger_type === "on_due_date") {
                    matches = daysPastDue === 0;
                } else if (rule.trigger_type === "days_after_due") {
                    matches = rule.days > 0 && daysPastDue === rule.days;
                } else if (rule.trigger_type === "days_before_due") {
                    matches = rule.days > 0 && daysPastDue === -rule.days;
                }

                if (matches) {
                    const client = ord.clientId ? clientMap.get(ord.clientId) : null;
                    const dedupeKey = `${userId}_${ord.id}_${rule.id}_${todayIST}_email`;

                    candidates.push({
                        orderId: ord.id,
                        clientId: ord.clientId,
                        clientName: client?.name || "Client",
                        clientEmail: client?.email || "",
                        totalAmountPaise: ord.amountPaise,
                        outstandingPaise: ord.outstandingPaise,
                        orderDateStr: ord.orderDateStr,
                        dueDateStr: ord.dueDateStr,
                        daysPastDue,
                        rule,
                        dedupeKey,
                    });
                }
            }
        }

        return { todayIST, candidates, activeRules };
    }

    /**
     * Read-only preview dry run. Computes which orders would be reminded today.
     * Does not write any logs or send notifications.
     */
    async previewReminders(
        userId: string,
        asOfDateStr?: string
    ): Promise<ReminderPreviewResult> {
        const { todayIST, candidates } = await this.evaluateCandidateOrders(
            userId,
            asOfDateStr
        );

        const db = await getDb();

        // Check user preferences
        const userDoc = await db.collection("users").findOne({
            $or: [
                { _id: userId as any },
                ...(ObjectId.isValid(userId) ? [{ _id: new ObjectId(userId) as any }] : []),
                { id: userId },
            ],
        });
        const emailPrefsDisabled =
            userDoc?.notification_preferences?.emailNotifications === false;

        // Check template status
        const template = await db.collection("notification_templates").findOne({
            userId,
            trigger: "payment_overdue",
        });
        const templateActive = template ? template.active !== false : true;
        const templateHasEmail = template?.channels
            ? Array.isArray(template.channels) && template.channels.includes("email")
            : true;

        let wouldQueueCount = 0;
        let wouldSkipCount = 0;
        let alreadySentCount = 0;

        const previewCandidates: ReminderPreviewCandidate[] = [];

        for (const c of candidates) {
            const alreadySent = await this.repo.hasLogWithDedupeKey(
                userId,
                c.dedupeKey
            );

            let status: "would_queue" | "would_skip" = "would_queue";
            let skipReason: string | null = null;

            if (alreadySent) {
                alreadySentCount++;
            }

            if (emailPrefsDisabled) {
                status = "would_skip";
                skipReason = "skipped: channel_disabled (email_notifications_off)";
            } else if (!templateActive || !templateHasEmail) {
                status = "would_skip";
                skipReason = "skipped: channel_disabled (template_inactive)";
            } else if (!c.clientEmail) {
                status = "would_skip";
                skipReason = "missing_recipient_email";
            }

            if (status === "would_queue") {
                wouldQueueCount++;
            } else {
                wouldSkipCount++;
            }

            previewCandidates.push({
                order_id: c.orderId,
                client_id: c.clientId,
                client_name: c.clientName,
                recipient_email: c.clientEmail,
                total_amount_paise: c.totalAmountPaise,
                outstanding_paise: c.outstandingPaise,
                due_date: c.dueDateStr,
                days_past_due: c.daysPastDue,
                rule_id: c.rule.id,
                rule_name: c.rule.name,
                trigger_type: c.rule.trigger_type,
                rule_days: c.rule.days,
                status,
                skip_reason: skipReason,
                already_sent: alreadySent,
            });
        }

        return {
            asOf: todayIST,
            totalCandidates: candidates.length,
            wouldQueueCount,
            wouldSkipCount,
            alreadySentCount,
            candidates: previewCandidates,
        };
    }

    /**
     * Executes the payment reminder cron job.
     * Evaluates active rules across tenants in bounded batches.
     * Safe to run multiple times: unique index on dedupe_key prevents duplicates.
     */
    async runCron(options?: {
        orderLimit?: number;
        asOfDateStr?: string;
        tenantIdFilter?: string;
    }): Promise<CronRunSummary> {
        const orderLimit = options?.orderLimit ?? DEFAULT_CRON_ORDER_LIMIT;
        const asOfDateStr = options?.asOfDateStr;

        let tenants: string[];
        if (options?.tenantIdFilter) {
            tenants = [options.tenantIdFilter];
        } else {
            tenants = await this.repo.findDistinctTenantsWithActiveRules();
        }

        const summary: CronRunSummary = {
            tenants: tenants.length,
            evaluated: 0,
            queued: 0,
            skipped: 0,
            failed: 0,
            already_sent: 0,
            truncated: false,
        };

        const db = await getDb();

        for (const tenantId of tenants) {
            if (summary.truncated) break;

            const { todayIST, candidates } = await this.evaluateCandidateOrders(
                tenantId,
                asOfDateStr
            );

            if (candidates.length === 0) continue;

            // Load tenant notification preferences
            const userDoc = await db.collection("users").findOne({
                $or: [
                    { _id: tenantId as any },
                    ...(ObjectId.isValid(tenantId) ? [{ _id: new ObjectId(tenantId) as any }] : []),
                    { id: tenantId },
                ],
            });
            const emailPrefsDisabled =
                userDoc?.notification_preferences?.emailNotifications === false;

            // Load template
            const template = await db.collection("notification_templates").findOne({
                userId: tenantId,
                trigger: "payment_overdue",
            });
            const templateActive = template ? template.active !== false : true;
            const templateHasEmail = template?.channels
                ? Array.isArray(template.channels) && template.channels.includes("email")
                : true;

            // Pre-fetch dedupe keys already recorded for this tenant and scheduled date to prevent batch starvation
            const existingDedupeKeys = await this.repo.findExistingDedupeKeys(
                tenantId,
                todayIST
            );

            for (const candidate of candidates) {
                // If this reminder was already processed today, count as already_sent
                // without consuming the new-work batch quota
                if (existingDedupeKeys.has(candidate.dedupeKey)) {
                    summary.already_sent++;
                    continue;
                }

                // Check bounded batch limit for new work
                if (summary.evaluated >= orderLimit) {
                    summary.truncated = true;
                    break;
                }

                summary.evaluated++;

                // Determine whether this should be skipped
                let initialStatus: "queued" | "skipped" = "queued";
                let skipReason: string | null = null;

                if (emailPrefsDisabled) {
                    initialStatus = "skipped";
                    skipReason = "skipped: channel_disabled (email_notifications_off)";
                } else if (!templateActive || !templateHasEmail) {
                    initialStatus = "skipped";
                    skipReason = "skipped: channel_disabled (template_inactive)";
                } else if (!candidate.clientEmail) {
                    initialStatus = "skipped";
                    skipReason = "missing_recipient_email";
                }

                // 1. Atomic insert into reminder_logs with dedupe_key guard
                const insertRes = await this.repo.insertLogAtomic({
                    userId: tenantId,
                    rule_id: candidate.rule.id,
                    order_id: candidate.orderId,
                    client_id: candidate.clientId,
                    channel: "email",
                    recipient: candidate.clientEmail,
                    outstanding_paise: candidate.outstandingPaise,
                    days_past_due: candidate.daysPastDue,
                    scheduled_date: todayIST,
                    dedupe_key: candidate.dedupeKey,
                    status: initialStatus,
                    skip_reason: skipReason,
                    notification_job_id: null,
                    sent_at: null,
                });

                if (insertRes.isDuplicate) {
                    summary.already_sent++;
                    continue;
                }

                if (!insertRes.inserted || !insertRes.id) {
                    summary.failed++;
                    continue;
                }

                if (initialStatus === "skipped") {
                    summary.skipped++;
                    continue;
                }

                // 2. Enqueue notification through existing path
                try {
                    const sendRes = await sendNotification({
                        userId: tenantId,
                        templateId: template?._id ? String(template._id) : undefined,
                        eventType: "payment_reminder",
                        channel: "email",
                        recipientContact: candidate.clientEmail,
                        payload: {
                            amount: (candidate.outstandingPaise / 100).toFixed(2),
                            order_id: candidate.orderId,
                            due_date: candidate.dueDateStr,
                            client_name: candidate.clientName,
                        },
                    });

                    await this.repo.updateLog(tenantId, insertRes.id, {
                        status: "queued",
                        notification_job_id: sendRes.jobId,
                        sent_at: new Date(),
                    });

                    summary.queued++;
                } catch (err: any) {
                    console.error(
                        `[PaymentReminders] Failed to dispatch notification for order ${candidate.orderId}:`,
                        err
                    );
                    await this.repo.updateLog(tenantId, insertRes.id, {
                        status: "failed",
                        skip_reason: err?.message || "Notification dispatch failed",
                    });
                    summary.failed++;
                }
            }
        }

        return summary;
    }
}
