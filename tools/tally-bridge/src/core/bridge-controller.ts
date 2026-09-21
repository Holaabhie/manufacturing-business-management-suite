/**
 * Bridge Controller
 * ─────────────────────────────────────────────────────────
 * High-level coordinator between storage, pairing, and polling.
 * Used by Electron main process and test suites.
 */

import {
    TokenStore,
    ConfigStore,
    Logger,
    Clock,
    JobExecutor,
    BridgeConfig,
    BridgeStatus,
} from "./types";
import { PollManager } from "./poller";
import { pairDeviceClient, PairResult } from "./pairing";
import { validateAndNormalizeCloudUrl } from "./url";

export interface BridgeControllerOptions {
    tokenStore: TokenStore;
    configStore: ConfigStore;
    logger: Logger;
    clock?: Clock;
    executor?: JobExecutor;
    appVersion?: string;
    backoffSchedule?: number[];
    executorTimeoutMs?: number;
    ackRetryDelays?: number[];
    onStatusChange?: (status: BridgeStatus) => void;
}

export class BridgeController {
    private tokenStore: TokenStore;
    private configStore: ConfigStore;
    private logger: Logger;
    private poller: PollManager;
    private onStatusChange?: (status: BridgeStatus) => void;
    private currentConfig: BridgeConfig | null = null;

    constructor(options: BridgeControllerOptions) {
        this.tokenStore = options.tokenStore;
        this.configStore = options.configStore;
        this.logger = options.logger;
        this.onStatusChange = options.onStatusChange;

        this.poller = new PollManager({
            tokenStore: options.tokenStore,
            configStore: options.configStore,
            logger: options.logger,
            clock: options.clock,
            executor: options.executor,
            appVersion: options.appVersion,
            backoffSchedule: options.backoffSchedule,
            executorTimeoutMs: options.executorTimeoutMs,
            ackRetryDelays: options.ackRetryDelays,
            onStatusChange: (status) => this.handlePollerStatusChange(status),
        });
    }

    private handlePollerStatusChange(status: BridgeStatus) {
        status.config = this.currentConfig;
        this.onStatusChange?.(status);
    }

    async init(): Promise<BridgeStatus> {
        this.currentConfig = await this.configStore.getConfig();
        const token = await this.tokenStore.getToken();

        if (this.currentConfig && token) {
            this.logger.info("Initializing with saved configuration", {
                deviceId: this.currentConfig.deviceId,
                cloudUrl: this.currentConfig.cloudUrl,
            });
            this.poller.start();
        } else {
            this.logger.info("Starting in unpaired state");
        }

        return this.getStatus();
    }

    async pair(cloudUrl: string, pairingCode: string, deviceName: string): Promise<PairResult> {
        const urlRes = validateAndNormalizeCloudUrl(cloudUrl);
        if (!urlRes.valid || !urlRes.normalized) {
            return { success: false, error: urlRes.error || "Invalid cloud URL" };
        }

        const pairResult = await pairDeviceClient({
            cloudUrl: urlRes.normalized,
            rawCode: pairingCode,
            deviceName,
            appVersion: "0.1.0",
            tokenStore: this.tokenStore,
            logger: this.logger,
        });

        if (!pairResult.success || !pairResult.deviceId) {
            return pairResult;
        }

        // Save new config
        const newConfig: BridgeConfig = {
            cloudUrl: urlRes.normalized,
            deviceId: pairResult.deviceId,
            deviceName,
            tallyHost: "localhost",
            tallyPort: 9000,
            autoStart: true,
        };

        await this.configStore.saveConfig(newConfig);
        this.currentConfig = newConfig;

        // Start poller
        this.poller.start();
        return pairResult;
    }

    async updateTallyConfig(tallyHost: string, tallyPort: number, tallyCompany?: string): Promise<boolean> {
        if (!this.currentConfig) return false;

        this.currentConfig.tallyHost = tallyHost || "localhost";
        this.currentConfig.tallyPort = Number(tallyPort) || 9000;
        this.currentConfig.tallyCompany = tallyCompany?.trim() || undefined;

        await this.configStore.saveConfig(this.currentConfig);
        this.logger.info("Updated Tally connection settings", {
            host: this.currentConfig.tallyHost,
            port: this.currentConfig.tallyPort,
            company: this.currentConfig.tallyCompany,
        });

        this.handlePollerStatusChange(this.poller.getStatus());
        return true;
    }

    async forgetDevice(): Promise<void> {
        this.logger.info("Forgetting device locally");
        this.poller.stop();
        await this.tokenStore.clearToken();
        await this.configStore.clearConfig();
        this.currentConfig = null;

        const status = this.poller.getStatus();
        status.state = "unpaired";
        status.config = null;
        status.cloudOk = false;
        status.cloudError = null;
        this.handlePollerStatusChange(status);
    }

    getStatus(): BridgeStatus {
        const status = this.poller.getStatus();
        status.config = this.currentConfig;
        if (!this.currentConfig) {
            status.state = "unpaired";
        }
        return status;
    }

    getPoller(): PollManager {
        return this.poller;
    }
}
