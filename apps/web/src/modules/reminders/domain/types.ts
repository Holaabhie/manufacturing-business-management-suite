export type ReminderTriggerType = "days_before_due" | "on_due_date" | "days_after_due";
export type ReminderChannel = "email";
export type ReminderLogStatus = "queued" | "sent" | "failed" | "skipped";

export interface ReminderRule {
    id: string;
    userId: string;
    name: string;
    trigger_type: ReminderTriggerType;
    days: number;
    channels: ReminderChannel[];
    min_outstanding_paise: number;
    active: boolean;
    created_by: string;
    created_at: Date;
    updated_at: Date;
}

export interface ReminderLog {
    id: string;
    userId: string;
    rule_id: string;
    order_id: string;
    client_id: string | null;
    channel: ReminderChannel;
    recipient: string;
    outstanding_paise: number;
    days_past_due: number;
    scheduled_date: string; // IST YYYY-MM-DD
    dedupe_key: string;
    status: ReminderLogStatus;
    skip_reason: string | null;
    notification_job_id: string | null;
    created_at: Date;
    sent_at: Date | null;
}

export type CreateReminderRuleDTO = {
    name: string;
    trigger_type: ReminderTriggerType;
    days: number;
    channels: ReminderChannel[];
    min_outstanding_paise?: number;
    active?: boolean;
};

export type UpdateReminderRuleDTO = {
    name?: string;
    trigger_type?: ReminderTriggerType;
    days?: number;
    channels?: ReminderChannel[];
    min_outstanding_paise?: number;
    active?: boolean;
};

export interface ReminderLogsFilter {
    order_id?: string;
    status?: ReminderLogStatus;
    from?: string; // YYYY-MM-DD
    to?: string;   // YYYY-MM-DD
    limit?: number;
    skip?: number;
}

export interface ReminderPreviewCandidate {
    order_id: string;
    client_id: string | null;
    client_name: string;
    recipient_email: string;
    total_amount_paise: number;
    outstanding_paise: number;
    due_date: string;
    days_past_due: number;
    rule_id: string;
    rule_name: string;
    trigger_type: ReminderTriggerType;
    rule_days: number;
    status: "would_queue" | "would_skip";
    skip_reason: string | null;
    already_sent: boolean;
}

export interface ReminderPreviewResult {
    asOf: string;
    totalCandidates: number;
    wouldQueueCount: number;
    wouldSkipCount: number;
    alreadySentCount: number;
    candidates: ReminderPreviewCandidate[];
}

export interface CronRunSummary {
    tenants: number;
    evaluated: number;
    queued: number;
    skipped: number;
    failed: number;
    already_sent: number;
    truncated: boolean;
}

export interface IReminderRepository {
    listRules(userId: string): Promise<ReminderRule[]>;
    findRuleById(userId: string, id: string): Promise<ReminderRule | null>;
    createRule(userId: string, createdBy: string, data: CreateReminderRuleDTO): Promise<ReminderRule>;
    updateRule(userId: string, id: string, data: UpdateReminderRuleDTO): Promise<ReminderRule | null>;
    deleteRule(userId: string, id: string): Promise<boolean>;
    getActiveRules(userId: string): Promise<ReminderRule[]>;

    insertLogAtomic(log: Omit<ReminderLog, "id" | "created_at">): Promise<{
        inserted: boolean;
        id?: string;
        error?: string;
        isDuplicate?: boolean;
    }>;
    updateLog(userId: string, logId: string, updates: Partial<ReminderLog>): Promise<void>;
    findLogs(userId: string, filters: ReminderLogsFilter): Promise<{ logs: ReminderLog[]; total: number }>;
    findLastLogForOrder(userId: string, orderId: string): Promise<ReminderLog | null>;
    hasLogWithDedupeKey(userId: string, dedupeKey: string): Promise<boolean>;
    findExistingDedupeKeys(userId: string, scheduledDate: string): Promise<Set<string>>;
    findDistinctTenantsWithActiveRules(): Promise<string[]>;
}
