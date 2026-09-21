/**
 * SafeStorage Encrypted Token Store
 * ─────────────────────────────────────────────────────────
 * Rule: Token stored in a separate file encrypted with Electron safeStorage.
 * If safeStorage.isEncryptionAvailable() is false, REFUSE to store the token,
 * show an error, and do not fall back to plaintext.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { safeStorage } from "electron";
import { TokenStore } from "../core/types";
import { STRINGS } from "./strings";

export class ElectronTokenStore implements TokenStore {
    private tokenPath: string;

    constructor(userDataPath: string) {
        this.tokenPath = path.join(userDataPath, "token.enc");
    }

    async getToken(): Promise<string | null> {
        try {
            if (!fs.existsSync(this.tokenPath)) {
                return null;
            }
            if (!safeStorage.isEncryptionAvailable()) {
                return null;
            }
            const encrypted = fs.readFileSync(this.tokenPath);
            return safeStorage.decryptString(encrypted);
        } catch {
            return null;
        }
    }

    async setToken(token: string): Promise<void> {
        if (!safeStorage.isEncryptionAvailable()) {
            throw new Error(STRINGS.encryptionUnavailableError);
        }
        const encrypted = safeStorage.encryptString(token);
        fs.writeFileSync(this.tokenPath, encrypted);
    }

    async clearToken(): Promise<void> {
        try {
            if (fs.existsSync(this.tokenPath)) {
                fs.unlinkSync(this.tokenPath);
            }
        } catch {
            // Ignore error
        }
    }
}
