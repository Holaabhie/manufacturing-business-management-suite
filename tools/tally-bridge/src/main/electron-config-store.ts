/**
 * File-based Configuration Store
 * ─────────────────────────────────────────────────────────
 * Manages config.json in <userData>.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { ConfigStore, BridgeConfig } from "../core/types";

export class ElectronConfigStore implements ConfigStore {
    private configPath: string;

    constructor(userDataPath: string) {
        this.configPath = path.join(userDataPath, "config.json");
    }

    async getConfig(): Promise<BridgeConfig | null> {
        try {
            if (!fs.existsSync(this.configPath)) {
                return null;
            }
            const raw = fs.readFileSync(this.configPath, "utf-8");
            const data = JSON.parse(raw);
            if (!data.cloudUrl || !data.deviceId) return null;

            return {
                cloudUrl: String(data.cloudUrl),
                deviceId: String(data.deviceId),
                deviceName: String(data.deviceName || ""),
                tallyHost: String(data.tallyHost || "localhost"),
                tallyPort: Number(data.tallyPort) || 9000,
                tallyCompany: data.tallyCompany ? String(data.tallyCompany) : undefined,
                autoStart: Boolean(data.autoStart ?? true),
            };
        } catch {
            return null;
        }
    }

    async saveConfig(config: BridgeConfig): Promise<void> {
        const json = JSON.stringify(config, null, 2);
        fs.writeFileSync(this.configPath, json, "utf-8");
    }

    async clearConfig(): Promise<void> {
        try {
            if (fs.existsSync(this.configPath)) {
                fs.unlinkSync(this.configPath);
            }
        } catch {
            // Ignore error
        }
    }
}
