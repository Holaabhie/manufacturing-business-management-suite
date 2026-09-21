/**
 * Job Executor & Timeout Wrapper
 * ─────────────────────────────────────────────────────────
 * Rule: For each returned job call JobExecutor.execute(job) wrapped
 * in a hard 90-second timeout.
 * P3a stub executor returns permanent_error with errorCode "EXECUTOR_NOT_IMPLEMENTED"
 * and errorMessage "Bridge executor not installed in this version".
 * On executor timeout ack retryable_error with errorCode "EXECUTOR_TIMEOUT".
 */

import { JobExecutor, JobExecutionResult, TallySyncJob } from "./types";

export class StubJobExecutor implements JobExecutor {
    async execute(_job: TallySyncJob): Promise<JobExecutionResult> {
        return {
            outcome: "permanent_error",
            errorCode: "EXECUTOR_NOT_IMPLEMENTED",
            errorMessage: "Bridge executor not installed in this version",
        };
    }
}

export async function executeJobWithTimeout(
    executor: JobExecutor,
    job: TallySyncJob,
    timeoutMs: number = 90_000,
): Promise<JobExecutionResult> {
    let timer: NodeJS.Timeout;

    const timeoutPromise = new Promise<JobExecutionResult>((resolve) => {
        timer = setTimeout(() => {
            resolve({
                outcome: "retryable_error",
                errorCode: "EXECUTOR_TIMEOUT",
                errorMessage: `Job execution timed out after ${timeoutMs}ms`,
            });
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([executor.execute(job), timeoutPromise]);
        clearTimeout(timer!);
        return result;
    } catch (err: any) {
        clearTimeout(timer!);
        return {
            outcome: "retryable_error",
            errorCode: "EXECUTOR_EXCEPTION",
            errorMessage: err?.message ? String(err.message).slice(0, 100) : "Executor thrown error",
        };
    }
}
