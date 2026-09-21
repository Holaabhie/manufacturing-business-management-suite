/**
 * Polling Loop & State Machine
 * ─────────────────────────────────────────────────────────
 * Rule: Self-rescheduling setTimeout chain (never setInterval, never overlapping).
 * Checks Tally health before each poll.
 * POST {cloud}/api/tally/bridge/poll with Authorization: Bearer <token>.
 * Next delay = server's pollAfterSec clamped to [2, 60] seconds.
 * On network error / 5xx: exponential backoff [5, 10, 20, 40, 60] capped at 60.
 * On 429: wait 30s.
 * On 401 UNAUTHORIZED / DEVICE_REVOKED: stop polling permanently,
 *   set state "auth_failed", clear token, require re-pairing.
 * Jobs handled serially: next poll only after current job ack finishes.
 */

import {
    TokenStore,
    ConfigStore,
    Logger,
    Clock,
    JobExecutor,
    TallyHealth,
    BridgeStatus,
    ConnectionState,
} from "./types";
import { checkTallyHealth } from "./tally-health";
import { executeJobWithTimeout, StubJobExecutor } from "./job-executor";
import { ackJobClient } from "./ack";

export interface PollerOptions {
    tokenStore: TokenStore;
    configStore: ConfigStore;
    logger: Logger;
    clock?: Clock;
    executor?: JobExecutor;
    appVersion?: string;
    backoffSchedule?: number[]; // default [5, 10, 20, 40, 60]
    rateLimitDelaySec?: number; // default 30
    executorTimeoutMs?: number; // default 90_000
    ackRetryDelays?: number[];   // default [2000, 5000, 10000]
    onStatusChange?: (status: BridgeStatus) => void;
    onPollComplete?: () => void;
}

export function clampPollDelay(pollAfterSec: unknown): number {
    const parsed = Number(pollAfterSec);
    if (isNaN(parsed) || parsed < 2) return 2;
    if (parsed > 60) return 60;
    return parsed;
}

export class PollManager {
    private tokenStore: TokenStore;
    private configStore: ConfigStore;
    private logger: Logger;
    private clock: Clock;
    private executor: JobExecutor;
    private appVersion: string;
    private backoffSchedule: number[];
    private rateLimitDelaySec: number;
    private executorTimeoutMs: number;
    private ackRetryDelays: number[];
    private onStatusChange?: (status: BridgeStatus) => void;
    private onPollComplete?: () => void;

    private activeTimer: unknown = null;
    private isPolling = false;
    private isStopped = true;
    private isAbortedDuringPoll = false;
    private consecutiveErrors = 0;

    private state: ConnectionState = "unpaired";
    private cloudOk = false;
    private cloudError: string | null = null;
    private lastSuccessfulPoll: string | null = null;
    private authFailedReason: string | null = null;
    private currentTallyHealth: TallyHealth = {
        reachable: false,
        host: "localhost",
        port: 9000,
        companies: [],
        activeCompany: null,
        lastError: null,
    };

    constructor(options: PollerOptions) {
        this.tokenStore = options.tokenStore;
        this.configStore = options.configStore;
        this.logger = options.logger;
        this.executor = options.executor || new StubJobExecutor();
        this.appVersion = options.appVersion || "0.1.0";
        this.backoffSchedule = options.backoffSchedule || [5, 10, 20, 40, 60];
        this.rateLimitDelaySec = options.rateLimitDelaySec ?? 30;
        this.executorTimeoutMs = options.executorTimeoutMs ?? 90_000;
        this.ackRetryDelays = options.ackRetryDelays ?? [2000, 5000, 10000];
        this.onStatusChange = options.onStatusChange;
        this.onPollComplete = options.onPollComplete;

        this.clock = options.clock || {
            now: () => Date.now(),
            setTimeout: (cb, ms) => setTimeout(cb, ms),
            clearTimeout: (id) => clearTimeout(id as any),
        };
    }

    getStatus(): BridgeStatus {
        return {
            state: this.state,
            cloudOk: this.cloudOk,
            cloudError: this.cloudError,
            lastSuccessfulPoll: this.lastSuccessfulPoll,
            authFailedReason: this.authFailedReason,
            tally: this.currentTallyHealth,
            config: null, // Controller populates full config
        };
    }

    private emitStatus() {
        this.onStatusChange?.(this.getStatus());
    }

    start() {
        if (!this.isStopped) return;
        this.isStopped = false;
        this.state = "paired";
        this.authFailedReason = null;
        this.consecutiveErrors = 0;
        this.scheduleNext(0);
    }

    stop() {
        this.isStopped = true;
        this.isAbortedDuringPoll = true;
        if (this.activeTimer !== null) {
            this.clock.clearTimeout(this.activeTimer);
            this.activeTimer = null;
        }
    }

    private scheduleNext(delayMs: number) {
        if (this.isStopped) return;
        if (this.activeTimer !== null) {
            this.clock.clearTimeout(this.activeTimer);
            this.activeTimer = null;
        }
        this.activeTimer = this.clock.setTimeout(() => {
            this.activeTimer = null;
            void this.pollOnce();
        }, delayMs);
    }

    /**
     * Executes a single poll cycle.
     * Guarantees non-overlapping execution.
     */
    async pollOnce(): Promise<void> {
        if (this.isPolling) return;
        this.isPolling = true;
        this.isAbortedDuringPoll = false;

        try {
            const config = await this.configStore.getConfig();
            const token = await this.tokenStore.getToken();

            if (!token || !config) {
                this.state = "unpaired";
                this.stop();
                this.emitStatus();
                return;
            }

            if (this.state === "unpaired") {
                this.state = "paired";
            }

            // 1. Check local Tally health
            this.currentTallyHealth = await checkTallyHealth({
                host: config.tallyHost,
                port: config.tallyPort,
                activeCompany: config.tallyCompany,
            });

            // 2. Build poll payload
            const payload: Record<string, unknown> = {
                appVersion: this.appVersion,
                maxJobs: 1,
                tally: {
                    reachable: this.currentTallyHealth.reachable,
                    host: this.currentTallyHealth.host,
                    port: this.currentTallyHealth.port,
                    companies: [],
                    lastError: this.currentTallyHealth.lastError,
                },
            };
            if (this.currentTallyHealth.activeCompany) {
                (payload.tally as any).activeCompany = this.currentTallyHealth.activeCompany;
            }

            // 3. Send poll request
            const endpoint = `${config.cloudUrl}/api/tally/bridge/poll`;
            let res: Response;

            try {
                res = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });
            } catch {
                this.handleNetworkOr5xxError("Cloud server unreachable");
                return;
            }

            // 4. Handle 401 Auth Failure
            if (res.status === 401) {
                let errCode = "UNAUTHORIZED";
                let errMsg = "Authorization failed";
                try {
                    const errJson = await res.json();
                    if (errJson?.error?.code) errCode = errJson.error.code;
                    if (errJson?.error?.message) errMsg = errJson.error.message;
                } catch {
                    // non-json response
                }

                this.logger.error("Authentication failed: stopping poller", { statusCode: 401, errCode });
                this.state = "auth_failed";
                this.cloudOk = false;
                this.cloudError = errMsg;
                this.authFailedReason = errCode === "DEVICE_REVOKED"
                    ? "Device has been revoked in IND Manager"
                    : "Session expired or invalid authorization token";

                await this.tokenStore.clearToken();
                this.stop();
                this.emitStatus();
                return;
            }

            // 5. Handle 429 Rate Limit
            if (res.status === 429) {
                this.logger.warn("Poll rate limited (429), waiting", { delaySec: this.rateLimitDelaySec });
                this.cloudOk = false;
                this.cloudError = "Rate limited by cloud server";
                this.emitStatus();
                this.scheduleNext(this.rateLimitDelaySec * 1000);
                return;
            }

            // 6. Handle 5xx server error
            if (res.status >= 500) {
                this.handleNetworkOr5xxError(`Cloud server error (HTTP ${res.status})`);
                return;
            }

            // 7. Handle other non-200
            if (!res.ok) {
                this.handleNetworkOr5xxError(`Cloud error (HTTP ${res.status})`);
                return;
            }

            // 8. Success: parse response
            let json: any;
            try {
                json = await res.json();
            } catch {
                this.handleNetworkOr5xxError("Invalid JSON from cloud server");
                return;
            }

            // Reset error backoff sequence on success
            this.consecutiveErrors = 0;
            this.cloudOk = true;
            this.cloudError = null;
            this.lastSuccessfulPoll = new Date(this.clock.now()).toISOString();
            this.emitStatus();

            const jobs = Array.isArray(json?.data?.jobs) ? json.data.jobs : [];
            const serverPollAfter = json?.data?.pollAfterSec;
            const clampedDelaySec = clampPollDelay(serverPollAfter);

            // 9. Execute jobs serially; ack MUST complete before scheduling next poll
            for (const job of jobs) {
                if (this.isAbortedDuringPoll) break;
                this.logger.info("Received sync job", { jobId: job.id, jobType: job.type });

                // Execute with timeout
                const execResult = await executeJobWithTimeout(
                    this.executor,
                    job,
                    this.executorTimeoutMs,
                );

                // Acknowledge result
                await ackJobClient({
                    cloudUrl: config.cloudUrl,
                    token,
                    jobId: job.id,
                    result: execResult,
                    logger: this.logger,
                    clock: this.clock,
                    retryDelays: this.ackRetryDelays,
                });
            }

            // Schedule next poll only AFTER all job executions and acks have completed
            this.scheduleNext(clampedDelaySec * 1000);

        } finally {
            this.isPolling = false;
            this.onPollComplete?.();
        }
    }

    private handleNetworkOr5xxError(errorText: string) {
        this.cloudOk = false;
        this.cloudError = errorText;
        this.emitStatus();

        const delayIndex = Math.min(this.consecutiveErrors, this.backoffSchedule.length - 1);
        const delaySec = this.backoffSchedule[delayIndex];
        this.consecutiveErrors++;

        this.logger.warn("Poll failed, scheduling backoff", {
            error: errorText,
            consecutiveErrors: this.consecutiveErrors,
            retryInSec: delaySec,
        });

        this.scheduleNext(delaySec * 1000);
    }
}
