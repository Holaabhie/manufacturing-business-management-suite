/**
 * Core Types & Injected Interfaces
 * ─────────────────────────────────────────────────────────
 * NO Electron imports in src/core/.
 */

export interface TokenStore {
    getToken(): Promise<string | null>;
    setToken(token: string): Promise<void>;
    clearToken(): Promise<void>;
}

export interface BridgeConfig {
    cloudUrl: string;
    deviceId: string;
    deviceName: string;
    tallyHost: string;
    tallyPort: number;
    tallyCompany?: string;
    autoStart: boolean;
}

export interface ConfigStore {
    getConfig(): Promise<BridgeConfig | null>;
    saveConfig(config: BridgeConfig): Promise<void>;
    clearConfig(): Promise<void>;
}

export interface Logger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}

export interface Clock {
    now(): number;
    setTimeout(callback: () => void, ms: number): unknown;
    clearTimeout(id: unknown): void;
}

export interface TallySyncJob {
    id: string;
    type: string;
    requestXml: string;
    attempts: number;
    leaseExpiresAt: string;
}

export type AckOutcome = "success" | "retryable_error" | "permanent_error";

export interface JobExecutionResult {
    outcome: AckOutcome;
    tallyResponse?: string;
    created?: number;
    altered?: number;
    errors?: number;
    errorCode?: string;
    errorMessage?: string;
}

export interface JobExecutor {
    execute(job: TallySyncJob): Promise<JobExecutionResult>;
}

export interface TallyHealth {
    reachable: boolean;
    host: string;
    port: number;
    companies: string[];
    activeCompany?: string | null;
    lastError: string | null;
}

export type ConnectionState = "unpaired" | "paired" | "auth_failed";

export interface BridgeStatus {
    state: ConnectionState;
    cloudOk: boolean;
    cloudError: string | null;
    lastSuccessfulPoll: string | null;
    authFailedReason: string | null;
    tally: TallyHealth;
    config: BridgeConfig | null;
}
