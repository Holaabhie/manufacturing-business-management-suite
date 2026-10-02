export type {
    ReminderRule,
    ReminderLog,
    ReminderTriggerType,
    ReminderChannel,
    ReminderLogStatus,
    CreateReminderRuleDTO,
    UpdateReminderRuleDTO,
    ReminderLogsFilter,
    ReminderPreviewCandidate,
    ReminderPreviewResult,
    CronRunSummary,
    IReminderRepository,
} from "./domain/types";

export {
    createReminderRuleSchema,
    updateReminderRuleSchema,
    reminderTriggerTypeSchema,
    reminderChannelSchema,
    type CreateReminderRuleInput,
    type UpdateReminderRuleInput,
} from "./domain/schemas";

export {
    ReminderService,
    DEFAULT_CRON_ORDER_LIMIT,
} from "./application/reminder.service";

export {
    MongoReminderRepository,
    getReminderRepository,
} from "./infrastructure/reminder.repository";

import { ReminderService } from "./application/reminder.service";
import { getReminderRepository } from "./infrastructure/reminder.repository";

let _reminderService: ReminderService | null = null;
export function getReminderService(): ReminderService {
    if (!_reminderService) {
        _reminderService = new ReminderService(getReminderRepository());
    }
    return _reminderService;
}
