/**
 * Job Acknowledgement Service Client
 * ─────────────────────────────────────────────────────────
 * POST {cloud}/api/tally/bridge/jobs/{id}/ack
 * Auth: Bearer <token>
 * Retry on network error or 5xx: up to 3 times (2s, 5s, 10s), then give up.
 * On 409: log and continue (not fatal).
 */

import { JobExecutionResult, Logger, Clock } from "./types";

export interface AckJobParams {
    cloudUrl: string;
    token: string;
    jobId: string;
    result: JobExecutionResult;
    logger?: Logger;
    clock?: Clock;
    retryDelays?: number[]; // defaults to [2000, 5000, 10000]
}

export interface AckResult {
    success: boolean;
    statusCode?: number;
    conflict409?: boolean;
    gaveUp?: boolean;
    error?: string;
}

export async function ackJobClient(params: AckJobParams): Promise<AckResult> {
    const { cloudUrl, token, jobId, result, logger, clock } = params;
    const retryDelays = params.retryDelays ?? [2000, 5000, 10000];
    const endpoint = `${cloudUrl}/api/tally/bridge/jobs/${jobId}/ack`;

    const body: Record<string, unknown> = {
        outcome: result.outcome,
    };
    if (result.tallyResponse !== undefined) body.tallyResponse = result.tallyResponse;
    if (result.created !== undefined) body.created = result.created;
    if (result.altered !== undefined) body.altered = result.altered;
    if (result.errors !== undefined) body.errors = result.errors;
    if (result.errorCode !== undefined) body.errorCode = result.errorCode;
    if (result.errorMessage !== undefined) body.errorMessage = result.errorMessage;

    const bodyStr = JSON.stringify(body);

    const sleep = (ms: number): Promise<void> => {
        if (clock) {
            return new Promise((resolve) => clock.setTimeout(resolve, ms));
        }
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    let attempt = 0;
    const maxAttempts = 1 + retryDelays.length; // 1 initial + 3 retries = 4 attempts total

    while (attempt < maxAttempts) {
        attempt++;
        let res: Response;

        try {
            res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: bodyStr,
            });
        } catch {
            logger?.warn(`Ack request network error (attempt ${attempt}/${maxAttempts})`, { jobId });
            if (attempt < maxAttempts) {
                await sleep(retryDelays[attempt - 1]);
                continue;
            }
            logger?.error("Ack network failure: gave up after max retries", { jobId });
            return { success: false, gaveUp: true, error: "Network failure" };
        }

        if (res.status === 409) {
            logger?.warn("Job ack returned 409 conflict (stale or reclaimed lease)", { jobId });
            return { success: false, statusCode: 409, conflict409: true };
        }

        if (res.status >= 500) {
            logger?.warn(`Ack server error ${res.status} (attempt ${attempt}/${maxAttempts})`, { jobId });
            if (attempt < maxAttempts) {
                await sleep(retryDelays[attempt - 1]);
                continue;
            }
            logger?.error("Ack server 5xx: gave up after max retries", { jobId, status: res.status });
            return { success: false, statusCode: res.status, gaveUp: true };
        }

        if (!res.ok) {
            logger?.warn(`Ack rejected with status ${res.status}`, { jobId });
            return { success: false, statusCode: res.status, error: `HTTP ${res.status}` };
        }

        logger?.info("Job acknowledged successfully", { jobId, outcome: result.outcome });
        return { success: true, statusCode: res.status };
    }

    return { success: false, gaveUp: true };
}
