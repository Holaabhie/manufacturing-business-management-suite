import { ObjectId, MongoServerError } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ensureReminderIndexes } from "@/lib/migrations/ensureReminderIndexes";
import type {
    ReminderRule,
    ReminderLog,
    CreateReminderRuleDTO,
    UpdateReminderRuleDTO,
    ReminderLogsFilter,
    IReminderRepository,
} from "../domain/types";

function mapRuleDoc(doc: any): ReminderRule {
    return {
        id: doc._id.toString(),
        userId: doc.userId,
        name: doc.name,
        trigger_type: doc.trigger_type,
        days: doc.days,
        channels: doc.channels,
        min_outstanding_paise: doc.min_outstanding_paise ?? 0,
        active: doc.active ?? true,
        created_by: doc.created_by,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
    };
}

function mapLogDoc(doc: any): ReminderLog {
    return {
        id: doc._id.toString(),
        userId: doc.userId,
        rule_id: doc.rule_id,
        order_id: doc.order_id,
        client_id: doc.client_id ?? null,
        channel: doc.channel,
        recipient: doc.recipient,
        outstanding_paise: doc.outstanding_paise,
        days_past_due: doc.days_past_due,
        scheduled_date: doc.scheduled_date,
        dedupe_key: doc.dedupe_key,
        status: doc.status,
        skip_reason: doc.skip_reason ?? null,
        notification_job_id: doc.notification_job_id ?? null,
        created_at: doc.created_at,
        sent_at: doc.sent_at ?? null,
    };
}

export class MongoReminderRepository implements IReminderRepository {
    private async init() {
        await ensureReminderIndexes();
    }

    async listRules(userId: string): Promise<ReminderRule[]> {
        await this.init();
        const db = await getDb();
        const docs = await db
            .collection("reminder_rules")
            .find({ userId })
            .sort({ created_at: -1 })
            .toArray();

        return docs.map(mapRuleDoc);
    }

    async findRuleById(userId: string, id: string): Promise<ReminderRule | null> {
        await this.init();
        if (!ObjectId.isValid(id)) return null;

        const db = await getDb();
        const doc = await db
            .collection("reminder_rules")
            .findOne({ _id: new ObjectId(id), userId });

        if (!doc) return null;
        return mapRuleDoc(doc);
    }

    async createRule(
        userId: string,
        createdBy: string,
        data: CreateReminderRuleDTO
    ): Promise<ReminderRule> {
        await this.init();
        const db = await getDb();
        const now = new Date();

        const docToInsert = {
            userId,
            name: data.name.trim(),
            trigger_type: data.trigger_type,
            days: data.days,
            channels: data.channels,
            min_outstanding_paise: data.min_outstanding_paise ?? 0,
            active: data.active ?? true,
            created_by: createdBy,
            created_at: now,
            updated_at: now,
        };

        const result = await db.collection("reminder_rules").insertOne(docToInsert);
        return {
            id: result.insertedId.toString(),
            ...docToInsert,
        };
    }

    async updateRule(
        userId: string,
        id: string,
        data: UpdateReminderRuleDTO
    ): Promise<ReminderRule | null> {
        await this.init();
        if (!ObjectId.isValid(id)) return null;

        const db = await getDb();
        const updates: Record<string, any> = {
            updated_at: new Date(),
        };

        if (data.name !== undefined) updates.name = data.name.trim();
        if (data.trigger_type !== undefined) updates.trigger_type = data.trigger_type;
        if (data.days !== undefined) updates.days = data.days;
        if (data.channels !== undefined) updates.channels = data.channels;
        if (data.min_outstanding_paise !== undefined)
            updates.min_outstanding_paise = data.min_outstanding_paise;
        if (data.active !== undefined) updates.active = data.active;

        const result = await db.collection("reminder_rules").findOneAndUpdate(
            { _id: new ObjectId(id), userId },
            { $set: updates },
            { returnDocument: "after" }
        );

        if (!result) return null;
        return mapRuleDoc(result);
    }

    async deleteRule(userId: string, id: string): Promise<boolean> {
        await this.init();
        if (!ObjectId.isValid(id)) return false;

        const db = await getDb();
        const result = await db
            .collection("reminder_rules")
            .deleteOne({ _id: new ObjectId(id), userId });

        return result.deletedCount > 0;
    }

    async getActiveRules(userId: string): Promise<ReminderRule[]> {
        await this.init();
        const db = await getDb();
        const docs = await db
            .collection("reminder_rules")
            .find({ userId, active: true })
            .sort({ created_at: -1 })
            .toArray();

        return docs.map(mapRuleDoc);
    }

    async insertLogAtomic(
        log: Omit<ReminderLog, "id" | "created_at">
    ): Promise<{
        inserted: boolean;
        id?: string;
        error?: string;
        isDuplicate?: boolean;
    }> {
        await this.init();
        const db = await getDb();
        const now = new Date();

        const doc = {
            userId: log.userId,
            rule_id: log.rule_id,
            order_id: log.order_id,
            client_id: log.client_id,
            channel: log.channel,
            recipient: log.recipient,
            outstanding_paise: log.outstanding_paise,
            days_past_due: log.days_past_due,
            scheduled_date: log.scheduled_date,
            dedupe_key: log.dedupe_key,
            status: log.status,
            skip_reason: log.skip_reason,
            notification_job_id: log.notification_job_id,
            created_at: now,
            sent_at: log.sent_at,
        };

        try {
            const result = await db.collection("reminder_logs").insertOne(doc);
            return {
                inserted: true,
                id: result.insertedId.toString(),
            };
        } catch (err: any) {
            // Check for MongoDB duplicate key error (code 11000)
            if (err instanceof MongoServerError && err.code === 11000) {
                return {
                    inserted: false,
                    isDuplicate: true,
                };
            }
            if (err?.code === 11000) {
                return {
                    inserted: false,
                    isDuplicate: true,
                };
            }
            return {
                inserted: false,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }

    async updateLog(
        userId: string,
        logId: string,
        updates: Partial<ReminderLog>
    ): Promise<void> {
        await this.init();
        if (!ObjectId.isValid(logId)) return;

        const db = await getDb();
        const fields: Record<string, any> = {};

        if (updates.status !== undefined) fields.status = updates.status;
        if (updates.skip_reason !== undefined) fields.skip_reason = updates.skip_reason;
        if (updates.notification_job_id !== undefined)
            fields.notification_job_id = updates.notification_job_id;
        if (updates.sent_at !== undefined) fields.sent_at = updates.sent_at;

        if (Object.keys(fields).length === 0) return;

        await db
            .collection("reminder_logs")
            .updateOne({ _id: new ObjectId(logId), userId }, { $set: fields });
    }

    async findLogs(
        userId: string,
        filters: ReminderLogsFilter
    ): Promise<{ logs: ReminderLog[]; total: number }> {
        await this.init();
        const db = await getDb();
        const query: Record<string, any> = { userId };

        if (filters.order_id) {
            query.order_id = filters.order_id;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.from || filters.to) {
            query.scheduled_date = {};
            if (filters.from) query.scheduled_date.$gte = filters.from;
            if (filters.to) query.scheduled_date.$lte = filters.to;
        }

        const limit = filters.limit ? Math.min(Math.max(1, filters.limit), 100) : 50;
        const skip = filters.skip ? Math.max(0, filters.skip) : 0;

        const [docs, total] = await Promise.all([
            db
                .collection("reminder_logs")
                .find(query)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            db.collection("reminder_logs").countDocuments(query),
        ]);

        const enrichedLogs = await this.enrichLogsWithDerivedStatus(db, docs);

        return {
            logs: enrichedLogs,
            total,
        };
    }

    private async enrichLogsWithDerivedStatus(
        db: any,
        docs: any[]
    ): Promise<ReminderLog[]> {
        const logs = docs.map(mapLogDoc);
        const queuedWithJobId = logs.filter(
            (l) => l.status === "queued" && l.notification_job_id
        );

        if (queuedWithJobId.length === 0) {
            return logs;
        }

        const jobIds = queuedWithJobId.map((l) => l.notification_job_id!);
        const jobObjectIds = jobIds
            .filter((id) => ObjectId.isValid(id))
            .map((id) => new ObjectId(id));

        const jobs = await db
            .collection("notification_jobs")
            .find(
                { _id: { $in: jobObjectIds } },
                { projection: { _id: 1, status: 1 } }
            )
            .toArray();

        const statusMap = new Map<string, string>();
        for (const job of jobs) {
            statusMap.set(job._id.toString(), job.status);
        }

        return logs.map((log) => {
            if (log.status === "queued" && log.notification_job_id) {
                const jobStatus = statusMap.get(log.notification_job_id);
                if (jobStatus === "completed") {
                    return { ...log, status: "sent" as const };
                } else if (jobStatus === "dead_letter" || jobStatus === "failed") {
                    return { ...log, status: "failed" as const };
                }
            }
            return log;
        });
    }

    async findLastLogForOrder(
        userId: string,
        orderId: string
    ): Promise<ReminderLog | null> {
        await this.init();
        const db = await getDb();
        const doc = await db
            .collection("reminder_logs")
            .findOne({ userId, order_id: orderId }, { sort: { created_at: -1 } });

        if (!doc) return null;
        const [enriched] = await this.enrichLogsWithDerivedStatus(db, [doc]);
        return enriched;
    }

    async hasLogWithDedupeKey(
        userId: string,
        dedupeKey: string
    ): Promise<boolean> {
        await this.init();
        const db = await getDb();
        const count = await db.collection("reminder_logs").countDocuments(
            { userId, dedupe_key: dedupeKey },
            { limit: 1 }
        );
        return count > 0;
    }

    async findExistingDedupeKeys(
        userId: string,
        scheduledDate: string
    ): Promise<Set<string>> {
        await this.init();
        const db = await getDb();
        const docs = await db
            .collection("reminder_logs")
            .find(
                { userId, scheduled_date: scheduledDate },
                { projection: { dedupe_key: 1 } }
            )
            .toArray();

        return new Set(docs.map((d: any) => d.dedupe_key).filter(Boolean));
    }

    async findDistinctTenantsWithActiveRules(): Promise<string[]> {
        await this.init();
        const db = await getDb();
        const userIds = await db
            .collection("reminder_rules")
            .distinct("userId", { active: true });

        return userIds.map(String);
    }
}

let _reminderRepo: MongoReminderRepository | null = null;
export function getReminderRepository(): MongoReminderRepository {
    if (!_reminderRepo) {
        _reminderRepo = new MongoReminderRepository();
    }
    return _reminderRepo;
}
