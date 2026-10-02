/**
 * Tally Bridge Test Suite (node:test)
 * ─────────────────────────────────────────────────────────
 * Tests T1 through T11 using in-memory fakes and local HTTP servers.
 * NO electron imports. Runs directly via node --test.
 */

import { test, describe, before, after } from "node:test";
import * as assert from "node:assert";
import { validateAndNormalizeCloudUrl } from "../core/url";
import { pairDeviceClient } from "../core/pairing";
import { clampPollDelay, PollManager } from "../core/poller";
import { StubJobExecutor, TallyJobExecutor, buildJobXml, parseTallyResponseXml } from "../core/job-executor";
import { ackJobClient } from "../core/ack";
import { createFakeTallyServer } from "../scripts/fake-tally";
import {
    InMemoryTokenStore,
    InMemoryConfigStore,
    MockLogger,
    ManualClock,
    FakeCloudServer,
} from "./test-fakes";

describe("Tally Bridge P3a Test Suite", () => {
    let cloud: FakeCloudServer;
    let cloudUrl: string;

    before(async () => {
        cloud = new FakeCloudServer();
        cloudUrl = await cloud.start();
    });

    after(async () => {
        await cloud.stop();
    });

    // ─── T1: Cloud URL Validation ─────────────────────────────────
    test("T1: cloud URL validation (allowed and rejected cases)", () => {
        // Allowed
        const t1 = validateAndNormalizeCloudUrl("http://localhost:3000");
        assert.strictEqual(t1.valid, true);
        assert.strictEqual(t1.normalized, "http://localhost:3000");

        const t2 = validateAndNormalizeCloudUrl("http://localhost:3000/");
        assert.strictEqual(t2.valid, true);
        assert.strictEqual(t2.normalized, "http://localhost:3000");

        const t3 = validateAndNormalizeCloudUrl("http://127.0.0.1:8080/api/");
        assert.strictEqual(t3.valid, true);
        assert.strictEqual(t3.normalized, "http://127.0.0.1:8080/api");

        const t4 = validateAndNormalizeCloudUrl("https://app.indmanager.in");
        assert.strictEqual(t4.valid, true);
        assert.strictEqual(t4.normalized, "https://app.indmanager.in");

        const t5 = validateAndNormalizeCloudUrl("https://app.indmanager.in/");
        assert.strictEqual(t5.valid, true);
        assert.strictEqual(t5.normalized, "https://app.indmanager.in");

        // Rejected
        const t6 = validateAndNormalizeCloudUrl("http://example.com");
        assert.strictEqual(t6.valid, false);
        assert.match(t6.error!, /http:\/\/ is allowed only for localhost or 127\.0\.0\.1/);

        const t7 = validateAndNormalizeCloudUrl("http://192.168.1.5:3000");
        assert.strictEqual(t7.valid, false);

        const t8 = validateAndNormalizeCloudUrl("ftp://localhost:3000");
        assert.strictEqual(t8.valid, false);
        assert.match(t8.error!, /Only http:\/\/ and https:\/\//);

        const t9 = validateAndNormalizeCloudUrl("not-a-valid-url");
        assert.strictEqual(t9.valid, false);

        const t10 = validateAndNormalizeCloudUrl("");
        assert.strictEqual(t10.valid, false);
    });

    // ─── T2: Pairing Success, Errors, and Rate Limit ──────────────
    test("T2: pairing success; INVALID_CODE; 429; network failure", async () => {
        const tokenStore = new InMemoryTokenStore();
        const logger = new MockLogger();

        // 1. Success
        cloud.pairHandler = (_req, res) => {
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: true,
                data: { token: "tbr_secret_device_token_xyz", deviceId: "dev_999", pollIntervalSec: 5 },
            }));
        };

        const r1 = await pairDeviceClient({
            cloudUrl,
            rawCode: "ab-12-cd-34",
            deviceName: "TestPC",
            appVersion: "0.1.0",
            tokenStore,
            logger,
        });

        assert.strictEqual(r1.success, true);
        assert.strictEqual(r1.deviceId, "dev_999");
        assert.strictEqual(r1.pollIntervalSec, 5);
        assert.strictEqual(await tokenStore.getToken(), "tbr_secret_device_token_xyz");

        // 2. INVALID_CODE
        cloud.pairHandler = (_req, res) => {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: false,
                error: { code: "INVALID_CODE", message: "Invalid, expired, or already used pairing code" },
            }));
        };
        const tokenStore2 = new InMemoryTokenStore();
        const r2 = await pairDeviceClient({
            cloudUrl,
            rawCode: "XX99-ZZ11",
            deviceName: "TestPC",
            appVersion: "0.1.0",
            tokenStore: tokenStore2,
            logger,
        });
        assert.strictEqual(r2.success, false);
        assert.strictEqual(r2.error, "Invalid or expired code");
        assert.strictEqual(await tokenStore2.getToken(), null);

        // 3. HTTP 429 Rate Limit
        cloud.pairHandler = (_req, res) => {
            res.writeHead(429, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: false,
                error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests" },
            }));
        };
        const r3 = await pairDeviceClient({
            cloudUrl,
            rawCode: "XX99-ZZ11",
            deviceName: "TestPC",
            appVersion: "0.1.0",
            tokenStore: tokenStore2,
            logger,
        });
        assert.strictEqual(r3.success, false);
        assert.strictEqual(r3.error, "Too many attempts, wait a minute and try again");

        // 4. Network Failure
        const r4 = await pairDeviceClient({
            cloudUrl: "http://127.0.0.1:54321", // Unused port
            rawCode: "XX99-ZZ11",
            deviceName: "TestPC",
            appVersion: "0.1.0",
            tokenStore: tokenStore2,
            logger,
        });
        assert.strictEqual(r4.success, false);
        assert.strictEqual(r4.error, "Cannot reach the server");
    });

    // ─── T3: Poll Contract & Token Redaction in Logs ───────────────
    test("T3: poll request body/headers exactly match contract; Authorization present; token never logged", async () => {
        const testToken = "tbr_sensitive_token_do_not_leak_456";
        const tokenStore = new InMemoryTokenStore();
        await tokenStore.setToken(testToken);

        const configStore = new InMemoryConfigStore({
            cloudUrl,
            deviceId: "dev_t3",
            deviceName: "PC_T3",
            tallyHost: "127.0.0.1",
            tallyPort: 9000,
            autoStart: true,
        });

        const logger = new MockLogger();
        cloud.pollRequests = [];
        cloud.pollHandler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: true,
                data: { jobs: [], pollAfterSec: 5 },
                meta: { timestamp: new Date().toISOString() },
            }));
        };

        const poller = new PollManager({
            tokenStore,
            configStore,
            logger,
            appVersion: "0.1.0",
        });

        await poller.pollOnce();

        assert.strictEqual(cloud.pollRequests.length, 1);
        const req = cloud.pollRequests[0];

        // Headers
        assert.strictEqual(req.headers["authorization"], `Bearer ${testToken}`);
        assert.strictEqual(req.headers["content-type"], "application/json");

        // Body shape
        assert.strictEqual(req.body.appVersion, "0.1.0");
        assert.strictEqual(req.body.maxJobs, 1);
        assert.ok(typeof req.body.tally === "object");
        assert.strictEqual(typeof req.body.tally.reachable, "boolean");
        assert.strictEqual(req.body.tally.host, "127.0.0.1");
        assert.strictEqual(req.body.tally.port, 9000);
        assert.deepStrictEqual(req.body.tally.companies, []);

        // Log safety check: token MUST NOT appear anywhere in the logs
        const logText = logger.getAllText();
        assert.strictEqual(logText.includes(testToken), false, "Token was found in log text!");
    });

    // ─── T4: pollAfterSec Clamping ────────────────────────────────
    test("T4: pollAfterSec clamping (1 => 2, 300 => 60, 5 => 5)", () => {
        assert.strictEqual(clampPollDelay(1), 2);
        assert.strictEqual(clampPollDelay(0), 2);
        assert.strictEqual(clampPollDelay(-5), 2);
        assert.strictEqual(clampPollDelay(300), 60);
        assert.strictEqual(clampPollDelay(61), 60);
        assert.strictEqual(clampPollDelay(5), 5);
        assert.strictEqual(clampPollDelay(2), 2);
        assert.strictEqual(clampPollDelay(60), 60);
        assert.strictEqual(clampPollDelay("not-a-number"), 2);
    });

    // ─── T5: Backoff Sequence and Reset After Success ─────────────
    test("T5: backoff sequence on 500 and network error, reset after success", async () => {
        const tokenStore = new InMemoryTokenStore();
        await tokenStore.setToken("tbr_token_t5");

        const configStore = new InMemoryConfigStore({
            cloudUrl,
            deviceId: "dev_t5",
            deviceName: "PC_T5",
            tallyHost: "localhost",
            tallyPort: 9000,
            autoStart: true,
        });

        const clock = new ManualClock();
        const logger = new MockLogger();
        const backoffSchedule = [5, 10, 20, 40, 60];

        let resolvePoll: () => void;
        let pollDone = new Promise<void>((r) => { resolvePoll = r; });

        const poller = new PollManager({
            tokenStore,
            configStore,
            logger,
            clock,
            backoffSchedule,
            onPollComplete: () => {
                resolvePoll();
                pollDone = new Promise<void>((r) => { resolvePoll = r; });
            },
        });

        // 1. Error 1: Server 500
        cloud.pollHandler = (_req, res) => {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: { message: "Server error" } }));
        };

        poller.start();
        await clock.tick(0); // Run initial poll
        await pollDone;      // Wait for async poll execution
        assert.strictEqual(clock.getNextTimerDelay(), 5000, "1st failure should backoff 5s");

        // 2. Error 2: Server 503
        cloud.pollHandler = (_req, res) => {
            res.writeHead(503, { "Content-Type": "application/json" });
            res.end();
        };
        await clock.tick(5000);
        await pollDone;
        assert.strictEqual(clock.getNextTimerDelay(), 10000, "2nd failure should backoff 10s");

        // 3. Error 3: Network Error (destroyed connection)
        cloud.pollHandler = (req) => {
            (req.socket as any)?.destroy();
        };
        await clock.tick(10000);
        await pollDone;
        assert.strictEqual(clock.getNextTimerDelay(), 20000, "3rd failure should backoff 20s");

        // 4. Success 200 => Resets backoff!
        cloud.pollHandler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: true,
                data: { jobs: [], pollAfterSec: 5 },
            }));
        };
        await clock.tick(20000);
        await pollDone;
        assert.strictEqual(clock.getNextTimerDelay(), 5000, "Success should schedule pollAfterSec (5s)");

        // 5. Subsequent failure should restart backoff at 5s!
        cloud.pollHandler = (_req, res) => {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end();
        };
        await clock.tick(5000);
        await pollDone;
        assert.strictEqual(clock.getNextTimerDelay(), 5000, "After success, backoff resets to 5s on failure");

        poller.stop();
    });

    // ─── T6: 401 Auth Failure Stops Polling and Clears Token ──────
    test("T6: 401 UNAUTHORIZED and 401 DEVICE_REVOKED stop polling permanently and clear token", async () => {
        // Case A: UNAUTHORIZED
        const tokenStoreA = new InMemoryTokenStore();
        await tokenStoreA.setToken("tbr_token_unauth");
        const configStoreA = new InMemoryConfigStore({
            cloudUrl,
            deviceId: "dev_t6a",
            deviceName: "PC_T6A",
            tallyHost: "localhost",
            tallyPort: 9000,
            autoStart: true,
        });

        cloud.pollHandler = (_req, res) => {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: false,
                error: { code: "UNAUTHORIZED", message: "Invalid authorization token" },
            }));
        };

        const pollerA = new PollManager({
            tokenStore: tokenStoreA,
            configStore: configStoreA,
            logger: new MockLogger(),
        });

        await pollerA.pollOnce();

        const statusA = pollerA.getStatus();
        assert.strictEqual(statusA.state, "auth_failed");
        assert.strictEqual(statusA.cloudOk, false);
        assert.strictEqual(await tokenStoreA.getToken(), null, "Token must be cleared from storage");

        // Case B: DEVICE_REVOKED
        const tokenStoreB = new InMemoryTokenStore();
        await tokenStoreB.setToken("tbr_token_revoked");
        const configStoreB = new InMemoryConfigStore({
            cloudUrl,
            deviceId: "dev_t6b",
            deviceName: "PC_T6B",
            tallyHost: "localhost",
            tallyPort: 9000,
            autoStart: true,
        });

        cloud.pollHandler = (_req, res) => {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: false,
                error: { code: "DEVICE_REVOKED", message: "Device has been revoked" },
            }));
        };

        const pollerB = new PollManager({
            tokenStore: tokenStoreB,
            configStore: configStoreB,
            logger: new MockLogger(),
        });

        await pollerB.pollOnce();

        const statusB = pollerB.getStatus();
        assert.strictEqual(statusB.state, "auth_failed");
        assert.match(statusB.authFailedReason!, /revoked/i);
        assert.strictEqual(await tokenStoreB.getToken(), null, "Token must be cleared from storage");
    });

    // ─── T7: Tally Health in Poll Request ──────────────────────────
    test("T7: Tally unreachable => poll reachable=false; reachable=true when fake Tally is up", async () => {
        const tokenStore = new InMemoryTokenStore();
        await tokenStore.setToken("tbr_token_t7");

        // Start local fake tally server
        const fakeTally = createFakeTallyServer(0);
        await new Promise<void>((resolve) => fakeTally.listen(0, "127.0.0.1", () => resolve()));
        const tallyPort = (fakeTally.address() as any).port;

        cloud.pollRequests = [];
        cloud.pollHandler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, data: { jobs: [], pollAfterSec: 5 } }));
        };

        // 1. Tally Reachable
        const configStore = new InMemoryConfigStore({
            cloudUrl,
            deviceId: "dev_t7",
            deviceName: "PC_T7",
            tallyHost: "127.0.0.1",
            tallyPort,
            autoStart: true,
        });

        const poller = new PollManager({
            tokenStore,
            configStore,
            logger: new MockLogger(),
        });

        await poller.pollOnce();
        assert.strictEqual(cloud.pollRequests.length, 1);
        assert.strictEqual(cloud.pollRequests[0].body.tally.reachable, true);
        assert.strictEqual(cloud.pollRequests[0].body.tally.lastError, null);

        // 2. Tally Unreachable (close fake tally forcibly)
        await new Promise<void>((resolve) => {
            if (typeof (fakeTally as any).closeAllConnections === "function") {
                (fakeTally as any).closeAllConnections();
            }
            fakeTally.close(() => resolve());
        });

        await poller.pollOnce();
        assert.strictEqual(cloud.pollRequests.length, 2);
        assert.strictEqual(cloud.pollRequests[1].body.tally.reachable, false);
        assert.ok(cloud.pollRequests[1].body.tally.lastError !== null);
    });

    // ─── T8: Job Execution & Ack Serialization ────────────────────
    test("T8: job received => stub executor => ack permanent_error EXECUTOR_NOT_IMPLEMENTED at correct path/body; next poll after ack", async () => {
        const tokenStore = new InMemoryTokenStore();
        await tokenStore.setToken("tbr_token_t8");

        const configStore = new InMemoryConfigStore({
            cloudUrl,
            deviceId: "dev_t8",
            deviceName: "PC_T8",
            tallyHost: "localhost",
            tallyPort: 9000,
            autoStart: true,
        });

        let ackDoneTime = 0;
        let nextPollScheduledTime = 0;
        const clock = new ManualClock();

        let resolvePoll: () => void;
        let pollDone = new Promise<void>((r) => { resolvePoll = r; });

        cloud.ackRequests = [];
        cloud.pollHandler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: true,
                data: {
                    jobs: [
                        {
                            id: "job_t8_alpha",
                            type: "master.ledger",
                            requestXml: "<ENVELOPE>xml</ENVELOPE>",
                            attempts: 1,
                            leaseExpiresAt: new Date(Date.now() + 60000).toISOString(),
                        },
                    ],
                    pollAfterSec: 5,
                },
            }));
        };

        cloud.ackHandler = async (_req, res) => {
            ackDoneTime = clock.now();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, data: { acknowledged: true } }));
        };

        const poller = new PollManager({
            tokenStore,
            configStore,
            logger: new MockLogger(),
            clock,
            executor: new StubJobExecutor(),
            onPollComplete: () => {
                resolvePoll();
                pollDone = new Promise<void>((r) => { resolvePoll = r; });
            },
        });

        poller.start();
        await clock.tick(0); // trigger first poll
        await pollDone;      // wait for poll and ack to finish

        // Verify ack request was sent
        assert.strictEqual(cloud.ackRequests.length, 1);
        const ack = cloud.ackRequests[0];
        assert.strictEqual(ack.url, "/api/tally/bridge/jobs/job_t8_alpha/ack");
        assert.strictEqual(ack.headers["authorization"], "Bearer tbr_token_t8");
        assert.strictEqual(ack.body.outcome, "permanent_error");
        assert.strictEqual(ack.body.errorCode, "EXECUTOR_NOT_IMPLEMENTED");
        assert.strictEqual(ack.body.errorMessage, "Bridge executor not installed in this version");

        // Verify next poll is scheduled only AFTER ack
        nextPollScheduledTime = clock.now();
        assert.ok(nextPollScheduledTime >= ackDoneTime);
        assert.strictEqual(clock.getNextTimerDelay(), 5000);

        poller.stop();
    });

    // ─── T9: Executor Timeout => Retryable Error Ack ──────────────
    test("T9: executor timeout => ack retryable_error EXECUTOR_TIMEOUT", async () => {
        const tokenStore = new InMemoryTokenStore();
        await tokenStore.setToken("tbr_token_t9");

        const configStore = new InMemoryConfigStore({
            cloudUrl,
            deviceId: "dev_t9",
            deviceName: "PC_T9",
            tallyHost: "localhost",
            tallyPort: 9000,
            autoStart: true,
        });

        cloud.ackRequests = [];
        cloud.pollHandler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: true,
                data: {
                    jobs: [
                        {
                            id: "job_t9_timeout",
                            type: "voucher.sales",
                            requestXml: "<ENVELOPE>slow</ENVELOPE>",
                            attempts: 1,
                            leaseExpiresAt: new Date(Date.now() + 60000).toISOString(),
                        },
                    ],
                    pollAfterSec: 5,
                },
            }));
        };

        cloud.ackHandler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, data: { acknowledged: true } }));
        };

        // Hanging executor
        const slowExecutor = {
            execute: async () => {
                await new Promise((r) => setTimeout(r, 200));
                return { outcome: "success" as const };
            },
        };

        const poller = new PollManager({
            tokenStore,
            configStore,
            logger: new MockLogger(),
            executor: slowExecutor,
            executorTimeoutMs: 25, // 25ms timeout for fast testing
        });

        await poller.pollOnce();

        assert.strictEqual(cloud.ackRequests.length, 1);
        const ack = cloud.ackRequests[0];
        assert.strictEqual(ack.url, "/api/tally/bridge/jobs/job_t9_timeout/ack");
        assert.strictEqual(ack.body.outcome, "retryable_error");
        assert.strictEqual(ack.body.errorCode, "EXECUTOR_TIMEOUT");
    });

    // ─── T10: Ack Retries on Failure & 409 Conflict Safety ────────
    test("T10: ack network failure retries 3 times then gives up; ack 409 does not crash", async () => {
        const logger = new MockLogger();

        // 1. Retry up to 3 times on 500, then give up
        let ackAttempts = 0;
        cloud.ackHandler = (_req, res) => {
            ackAttempts++;
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: { message: "Bad Gateway" } }));
        };

        const r1 = await ackJobClient({
            cloudUrl,
            token: "tbr_t10",
            jobId: "job_retry",
            result: { outcome: "permanent_error" },
            logger,
            retryDelays: [5, 5, 5], // fast retries
        });

        assert.strictEqual(ackAttempts, 4, "Initial attempt + 3 retries = 4 total attempts");
        assert.strictEqual(r1.gaveUp, true);
        assert.strictEqual(r1.success, false);

        // 2. Ack 409 Conflict (stale ack): handled smoothly without crashing
        cloud.ackHandler = (_req, res) => {
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: false,
                error: { code: "CONFLICT", message: "Job not found or not claimed by this device" },
            }));
        };

        const r2 = await ackJobClient({
            cloudUrl,
            token: "tbr_t10",
            jobId: "job_409",
            result: { outcome: "success" },
            logger,
        });

        assert.strictEqual(r2.conflict409, true);
        assert.strictEqual(r2.statusCode, 409);
        assert.strictEqual(r2.success, false);
    });

    // ─── T11: Non-overlapping Polls ───────────────────────────────
    test("T11: no two polls ever overlap", async () => {
        const tokenStore = new InMemoryTokenStore();
        await tokenStore.setToken("tbr_token_t11");

        const configStore = new InMemoryConfigStore({
            cloudUrl,
            deviceId: "dev_t11",
            deviceName: "PC_T11",
            tallyHost: "localhost",
            tallyPort: 9000,
            autoStart: true,
        });

        let pollCount = 0;
        let simultaneous = 0;
        let maxSimultaneous = 0;

        cloud.pollHandler = async (_req, res) => {
            simultaneous++;
            if (simultaneous > maxSimultaneous) maxSimultaneous = simultaneous;
            pollCount++;

            // Simulate server response latency
            await new Promise((r) => setTimeout(r, 40));
            simultaneous--;

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, data: { jobs: [], pollAfterSec: 5 } }));
        };

        const poller = new PollManager({
            tokenStore,
            configStore,
            logger: new MockLogger(),
        });

        // Fire multiple pollOnce concurrently
        await Promise.all([
            poller.pollOnce(),
            poller.pollOnce(),
            poller.pollOnce(),
        ]);

        assert.strictEqual(pollCount, 1, "Only 1 poll executed while in progress");
        assert.strictEqual(maxSimultaneous, 1, "Max simultaneous polls was strictly 1");
    });

    // ─── T12: Real Executor XML Generation for Each Job Type ───────
    test("T12: job of each type builds expected XML shape", () => {
        // 1. master.unit
        const unitXml = buildJobXml({
            id: "job_unit_1",
            type: "master.unit",
            requestXml: "",
            attempts: 0,
            leaseExpiresAt: "",
            payload: { unitSymbol: "NOS", decimalPlaces: 0, companyName: "Ind Manager" },
        } as any);
        assert.match(unitXml, /<UNIT NAME="NOS" ACTION="Create or Alter">/);
        assert.match(unitXml, /<ISSIMPLEUNIT>Yes<\/ISSIMPLEUNIT>/);
        assert.match(unitXml, /<SVCURRENTCOMPANY>Ind Manager<\/SVCURRENTCOMPANY>/);

        // 2. master.stock_item
        const stockXml = buildJobXml({
            id: "job_stock_1",
            type: "master.stock_item",
            requestXml: "",
            attempts: 0,
            leaseExpiresAt: "",
            payload: {
                name: "Widget Alpha",
                unit: "NOS",
                hsnCode: "8471",
                gstRate: 18,
                companyName: "Ind Manager",
            },
        } as any);
        assert.match(stockXml, /<STOCKGROUP NAME="Primary" ACTION="Create or Alter">/);
        assert.match(stockXml, /<UNIT NAME="NOS" ACTION="Create or Alter">/);
        assert.match(stockXml, /<STOCKITEM NAME="Widget Alpha" ACTION="Create or Alter">/);
        assert.match(stockXml, /<HSNCODE>8471<\/HSNCODE>/);
        assert.match(stockXml, /<GSTRATE>18<\/GSTRATE>/);

        // 3. master.ledger
        const ledgerXml = buildJobXml({
            id: "job_led_1",
            type: "master.ledger",
            requestXml: "",
            attempts: 0,
            leaseExpiresAt: "",
            payload: {
                clientName: "Spike Traders",
                alias: "client_123",
                gstin: "27AABCS1429B1ZV",
                state: "Maharashtra",
                companyName: "Ind Manager",
            },
        } as any);
        assert.match(ledgerXml, /<LEDGER NAME="Spike Traders" ACTION="Create or Alter">/);
        assert.match(ledgerXml, /<ALIAS>client_123<\/ALIAS>/);
        assert.match(ledgerXml, /<PARENT>Sundry Debtors<\/PARENT>/);
        assert.match(ledgerXml, /<LEDSTATENAME>Maharashtra<\/LEDSTATENAME>/);

        // 4. voucher.sales
        const salesXml = buildJobXml({
            id: "job_vch_1",
            type: "voucher.sales",
            requestXml: "",
            attempts: 0,
            leaseExpiresAt: "",
            payload: {
                invoiceId: "inv_999",
                invoiceNumber: "INV-2026-001",
                partyLedgerName: "Spike Traders",
                invoiceDate: "20260901",
                state: "Maharashtra",
                totalAmount: 118,
                subtotal: 100,
                cgstAmount: 9,
                sgstAmount: 9,
                companyName: "Ind Manager",
            },
        } as any);
        assert.match(salesXml, /<VOUCHER VCHTYPE="Sales" ACTION="Create or Alter" OBJVIEW="Invoice Voucher View" REMOTEID="ind-manager-inv_999">/);
        assert.match(salesXml, /<VOUCHERTYPENAME>Sales<\/VOUCHERTYPENAME>/);
        assert.match(salesXml, /<STATENAME>Maharashtra<\/STATENAME>/);
        assert.match(salesXml, /<PLACEOFSUPPLY>Maharashtra<\/PLACEOFSUPPLY>/);
        assert.match(salesXml, /<LEDGERNAME>Spike Traders<\/LEDGERNAME>/);
        assert.match(salesXml, /<ISPARTYLEDGER>Yes<\/ISPARTYLEDGER>/);
        assert.match(salesXml, /<LEDGERNAME>CGST<\/LEDGERNAME>/);
        assert.match(salesXml, /<ISPARTYLEDGER>No<\/ISPARTYLEDGER>/);
        assert.match(salesXml, /<ACCOUNTINGALLOCATIONS.LIST>/);
        assert.match(salesXml, /<LEDGERNAME>Sales Account<\/LEDGERNAME>/);
    });

    // ─── T13: Executor Success on CREATED:1 Response ──────────────
    test("T13: executor CREATED:1 response acks success", async () => {
        const executor = new TallyJobExecutor({
            poster: async () => ({
                status: 200,
                body: "<RESPONSE><CREATED>1</CREATED><ALTERED>0</ALTERED><DELETED>0</DELETED><ERRORS>0</ERRORS><EXCEPTIONS>0</EXCEPTIONS></RESPONSE>",
            }),
        });

        const result = await executor.execute({
            id: "job_exec_1",
            type: "master.unit",
            requestXml: "",
            attempts: 0,
            leaseExpiresAt: "",
            payload: { unitSymbol: "NOS" },
        } as any);

        assert.strictEqual(result.outcome, "success");
        assert.strictEqual(result.created, 1);
        assert.strictEqual(result.altered, 0);
    });

    // ─── T14: Executor Permanent Error on EXCEPTIONS:1 No Detail ──
    test("T14: executor EXCEPTIONS:1 (no detail) acks permanent_error with TALLY_REJECTED_NO_DETAIL", async () => {
        const executor = new TallyJobExecutor({
            poster: async () => ({
                status: 200,
                body: "<RESPONSE><CREATED>0</CREATED><ALTERED>0</ALTERED><DELETED>0</DELETED><ERRORS>0</ERRORS><EXCEPTIONS>1</EXCEPTIONS></RESPONSE>",
            }),
        });

        const result = await executor.execute({
            id: "job_exec_2",
            type: "voucher.sales",
            requestXml: "",
            attempts: 0,
            leaseExpiresAt: "",
            payload: { invoiceNumber: "INV-1" },
        } as any);

        assert.strictEqual(result.outcome, "permanent_error");
        assert.strictEqual(result.errorCode, "TALLY_REJECTED_NO_DETAIL");
        assert.match(result.errorMessage!, /Tally rejected the import with EXCEPTIONS but gave no detailed reason/);
    });

    // ─── T15: Executor Retryable Error on Network Timeout ──────────
    test("T15: executor network timeout acks retryable_error", async () => {
        const executor = new TallyJobExecutor({
            poster: async () => {
                const err = new Error("Request to Tally timed out after 15000ms");
                (err as any).code = "ETIMEDOUT";
                throw err;
            },
        });

        const result = await executor.execute({
            id: "job_exec_3",
            type: "master.ledger",
            requestXml: "",
            attempts: 0,
            leaseExpiresAt: "",
            payload: { clientName: "Client A" },
        } as any);

        assert.strictEqual(result.outcome, "retryable_error");
        assert.strictEqual(result.errorCode, "TALLY_TIMEOUT");
        assert.match(result.errorMessage!, /timed out/);
    });
});

