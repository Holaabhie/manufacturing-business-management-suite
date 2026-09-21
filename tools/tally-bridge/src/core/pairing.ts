/**
 * Pairing Service Client
 * ─────────────────────────────────────────────────────────
 * POST {cloud}/api/tally/bridge/pair
 * Normalizes code client-side before sending.
 * Stores token ONLY via TokenStore.
 * Never exposes token in return value or logs.
 */

import { TokenStore, Logger } from "./types";
import { validateAndNormalizeCloudUrl } from "./url";

export interface PairParams {
    cloudUrl: string;
    rawCode: string;
    deviceName: string;
    platform?: string;
    appVersion: string;
    tokenStore: TokenStore;
    logger?: Logger;
}

export interface PairResult {
    success: boolean;
    deviceId?: string;
    pollIntervalSec?: number;
    error?: string;
}

export function normalizePairingCode(code: string): string {
    return code.trim().toUpperCase().replace(/[-\s]/g, "");
}

export async function pairDeviceClient(params: PairParams): Promise<PairResult> {
    const { cloudUrl, rawCode, deviceName, appVersion, tokenStore, logger } = params;
    const platform = params.platform || process.platform;

    const urlCheck = validateAndNormalizeCloudUrl(cloudUrl);
    if (!urlCheck.valid || !urlCheck.normalized) {
        return { success: false, error: urlCheck.error || "Invalid cloud URL" };
    }

    const normalizedCode = normalizePairingCode(rawCode);
    if (!normalizedCode || normalizedCode.length !== 8) {
        return { success: false, error: "Pairing code must be an 8-character code" };
    }

    const endpoint = `${urlCheck.normalized}/api/tally/bridge/pair`;
    const payload = {
        code: normalizedCode,
        deviceName,
        platform,
        appVersion,
    };

    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    } catch {
        logger?.error("Pairing request failed: network unreachable", { endpoint });
        return { success: false, error: "Cannot reach the server" };
    }

    if (response.status === 429) {
        logger?.warn("Pairing rate limited (429)", { endpoint });
        return { success: false, error: "Too many attempts, wait a minute and try again" };
    }

    let json: any;
    try {
        json = await response.json();
    } catch {
        logger?.error("Pairing failed: invalid JSON response", { status: response.status });
        return { success: false, error: "Cannot reach the server" };
    }

    if (!response.ok || !json?.success) {
        const errorCode = json?.error?.code;
        const errorMsg = json?.error?.message;
        logger?.warn("Pairing rejected by server", { status: response.status, errorCode });

        if (errorCode === "INVALID_CODE") {
            return { success: false, error: "Invalid or expired code" };
        }
        return { success: false, error: errorMsg || "Pairing failed" };
    }

    const { token, deviceId, pollIntervalSec } = json.data || {};
    if (!token || !deviceId) {
        return { success: false, error: "Server response missing credentials" };
    }

    // Save token strictly to TokenStore
    await tokenStore.setToken(token);
    logger?.info("Device paired successfully", { deviceId, pollIntervalSec });

    return {
        success: true,
        deviceId,
        pollIntervalSec: pollIntervalSec || 5,
    };
}
