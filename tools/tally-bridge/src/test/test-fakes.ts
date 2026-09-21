/**
 * Test Fakes & In-Memory Implementations
 * ─────────────────────────────────────────────────────────
 * For deterministic node:test suites without electron dependencies.
 */

import * as http from "node:http";
import { AddressInfo } from "node:net";
import {
    TokenStore,
    ConfigStore,
    Logger,
    BridgeConfig,
    Clock,
} from "../core/types";

export class InMemoryTokenStore implements TokenStore {
    private token: string | null = null;

    async getToken(): Promise<string | null> {
        return this.token;
    }

    async setToken(token: string): Promise<void> {
        this.token = token;
    }

    async clearToken(): Promise<void> {
        this.token = null;
    }
}

export class InMemoryConfigStore implements ConfigStore {
    private config: BridgeConfig | null = null;

    constructor(initialConfig?: BridgeConfig) {
        if (initialConfig) this.config = { ...initialConfig };
    }

    async getConfig(): Promise<BridgeConfig | null> {
        return this.config ? { ...this.config } : null;
    }

    async saveConfig(config: BridgeConfig): Promise<void> {
        this.config = { ...config };
    }

    async clearConfig(): Promise<void> {
        this.config = null;
    }
}

export class MockLogger implements Logger {
    public logs: Array<{ level: string; message: string; meta?: Record<string, unknown> }> = [];

    info(message: string, meta?: Record<string, unknown>) {
        this.logs.push({ level: "INFO", message, meta });
    }

    warn(message: string, meta?: Record<string, unknown>) {
        this.logs.push({ level: "WARN", message, meta });
    }

    error(message: string, meta?: Record<string, unknown>) {
        this.logs.push({ level: "ERROR", message, meta });
    }

    getAllText(): string {
        return this.logs.map((l) => `${l.level}: ${l.message} ${JSON.stringify(l.meta || {})}`).join("\n");
    }
}

export class ManualClock implements Clock {
    private currentTime: number;
    private timers = new Map<number, { callback: () => void; dueTime: number }>();
    private nextId = 1;

    constructor(startTime = 1700000000000) {
        this.currentTime = startTime;
    }

    now(): number {
        return this.currentTime;
    }

    setTimeout(callback: () => void, ms: number): number {
        const id = this.nextId++;
        this.timers.set(id, { callback, dueTime: this.currentTime + ms });
        return id;
    }

    clearTimeout(id: unknown): void {
        this.timers.delete(Number(id));
    }

    async tick(ms: number): Promise<void> {
        this.currentTime += ms;
        const due: Array<() => void> = [];
        for (const [id, timer] of Array.from(this.timers.entries())) {
            if (timer.dueTime <= this.currentTime) {
                due.push(timer.callback);
                this.timers.delete(id);
            }
        }
        for (const cb of due) {
            cb();
            // Let microtasks run
            await new Promise((r) => setImmediate(r));
        }
    }

    hasPendingTimers(): boolean {
        return this.timers.size > 0;
    }

    getNextTimerDelay(): number | null {
        let minDelay: number | null = null;
        for (const timer of this.timers.values()) {
            const delay = timer.dueTime - this.currentTime;
            if (minDelay === null || delay < minDelay) {
                minDelay = delay;
            }
        }
        return minDelay;
    }
}

export interface FakeCloudRouteHandler {
    (req: http.IncomingMessage, res: http.ServerResponse, body: any): void | Promise<void>;
}

export class FakeCloudServer {
    private server: http.Server;
    private port = 0;
    public pairHandler?: FakeCloudRouteHandler;
    public pollHandler?: FakeCloudRouteHandler;
    public ackHandler?: FakeCloudRouteHandler;
    public customHandler?: FakeCloudRouteHandler;

    public pollRequests: Array<{ headers: http.IncomingHttpHeaders; body: any }> = [];
    public ackRequests: Array<{ url: string; headers: http.IncomingHttpHeaders; body: any }> = [];

    constructor() {
        this.server = http.createServer(async (req, res) => {
            const chunks: Buffer[] = [];
            req.on("data", (c) => chunks.push(c));
            req.on("end", async () => {
                const raw = Buffer.concat(chunks).toString("utf-8");
                let body: any = {};
                try {
                    body = raw ? JSON.parse(raw) : {};
                } catch {
                    body = raw;
                }

                const url = req.url || "";

                if (url === "/api/tally/bridge/pair") {
                    if (this.pairHandler) {
                        await this.pairHandler(req, res, body);
                    } else {
                        res.writeHead(201, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            success: true,
                            data: { token: "tbr_mock_token_123", deviceId: "dev_mock_1", pollIntervalSec: 5 },
                            meta: { timestamp: new Date().toISOString() },
                        }));
                    }
                    return;
                }

                if (url === "/api/tally/bridge/poll") {
                    this.pollRequests.push({ headers: req.headers, body });
                    if (this.pollHandler) {
                        await this.pollHandler(req, res, body);
                    } else {
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            success: true,
                            data: { jobs: [], pollAfterSec: 5, serverTime: new Date().toISOString() },
                            meta: { timestamp: new Date().toISOString() },
                        }));
                    }
                    return;
                }

                if (url.startsWith("/api/tally/bridge/jobs/") && url.endsWith("/ack")) {
                    this.ackRequests.push({ url, headers: req.headers, body });
                    if (this.ackHandler) {
                        await this.ackHandler(req, res, body);
                    } else {
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            success: true,
                            data: { acknowledged: true },
                            meta: { timestamp: new Date().toISOString() },
                        }));
                    }
                    return;
                }

                if (this.customHandler) {
                    await this.customHandler(req, res, body);
                    return;
                }

                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: { message: "Not found", code: "NOT_FOUND" } }));
            });
        });
    }

    async start(): Promise<string> {
        return new Promise((resolve) => {
            this.server.listen(0, "127.0.0.1", () => {
                const addr = this.server.address() as AddressInfo;
                this.port = addr.port;
                resolve(`http://127.0.0.1:${this.port}`);
            });
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (typeof (this.server as any).closeAllConnections === "function") {
                (this.server as any).closeAllConnections();
            }
            this.server.close(() => resolve());
        });
    }

    getUrl(): string {
        return `http://127.0.0.1:${this.port}`;
    }
}
