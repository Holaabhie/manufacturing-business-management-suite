/**
 * Automated Screenshot Capture for Verification Item 5
 * Runs via Electron to capture:
 * (a) Unpaired window
 * (b) Paired + connected state with fake Tally running
 * (c) Paired state with Tally stopped
 */

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { MongoClient, ObjectId } = require("mongodb");
const http = require("http");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "ind_manager";
const CLOUD_URL = "http://localhost:3000";
const FAKE_TALLY_PORT = 9911;

// Screenshot output directory
const outDir = path.join(__dirname, "../screenshots");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256(input) {
    return crypto.createHash("sha256").update(input, "utf-8").digest("hex");
}

// 1. Create a fake Tally server
function startFakeTally(port) {
    const server = http.createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("TallyPrime Server is Running");
    });
    return new Promise((resolve) => {
        server.listen(port, "127.0.0.1", () => {
            console.log(`[Fake Tally] Listening on port ${port}`);
            resolve(server);
        });
    });
}

app.whenReady().then(async () => {
    console.log("[Electron] Initializing screenshot session...");
    let fakeTallyServer = null;
    let mongoClient = null;

    try {
        const { FileLogger } = require("../dist/main/file-logger");
        const { ElectronTokenStore } = require("../dist/main/electron-token-store");
        const { ElectronConfigStore } = require("../dist/main/electron-config-store");
        const { BridgeController } = require("../dist/core/bridge-controller");
        const { STRINGS } = require("../dist/main/strings");

        const userDataPath = app.getPath("userData");
        // Clear any old stored token and config to start completely clean (unpaired)
        const tokenFile = path.join(userDataPath, "token.enc");
        const configFile = path.join(userDataPath, "config.json");
        if (fs.existsSync(tokenFile)) fs.unlinkSync(tokenFile);
        if (fs.existsSync(configFile)) fs.unlinkSync(configFile);

        const logger = new FileLogger(userDataPath);
        const tokenStore = new ElectronTokenStore(userDataPath);
        const configStore = new ElectronConfigStore(userDataPath);

        let win = null;

        const controller = new BridgeController({
            tokenStore,
            configStore,
            logger,
            appVersion: "0.1.0",
            onStatusChange: (status) => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send("bridge:status-update", status);
                }
            },
        });

        // Setup IPC
        ipcMain.handle("bridge:get-status", () => controller.getStatus());
        ipcMain.handle("bridge:pair", (_e, params) => controller.pair(params.cloudUrl, params.pairingCode, params.deviceName));
        ipcMain.handle("bridge:save-tally-settings", (_e, params) => controller.updateTallyConfig(params.tallyHost, params.tallyPort, params.tallyCompany));
        ipcMain.handle("bridge:set-autostart", () => true);
        ipcMain.handle("bridge:open-logs-folder", () => true);
        ipcMain.handle("bridge:forget-device", () => controller.forgetDevice());
        ipcMain.handle("bridge:get-strings", () => STRINGS);
        ipcMain.handle("bridge:get-hostname", () => "DESKTOP-TEST");

        win = new BrowserWindow({
            width: 580,
            height: 640,
            show: true,
            title: STRINGS.appTitle,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
                preload: path.join(__dirname, "../dist/main/preload.js"),
            },
        });

        const htmlPath = path.join(__dirname, "../dist/renderer/index.html");
        await win.loadFile(htmlPath);
        await controller.init();

        // ─── STATE (A): Unpaired Window ──────────────────────────────
        console.log("[Capture] Waiting for unpaired render...");
        await sleep(1000);
        const imgA = await win.webContents.capturePage();
        const pathA = path.join(outDir, "screenshot_a_unpaired.png");
        fs.writeFileSync(pathA, imgA.toPNG());
        console.log("✅ Screenshot (a) saved: " + pathA);

        // ─── Create Pairing Code in MongoDB ─────────────────────────
        console.log("[MongoDB] Connecting to seed pairing code...");
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const db = mongoClient.db(DB_NAME);

        const testOrgId = new ObjectId().toString();
        const rawPairingCode = "PAIR9988";
        const codeHash = sha256(rawPairingCode);

        await db.collection("tallypairingcodes").insertOne({
            organizationId: testOrgId,
            codeHash,
            createdBy: "test_admin",
            expiresAt: new Date(Date.now() + 600000),
            usedAt: null,
            failedAttempts: 0,
        });
        console.log(`[MongoDB] Seeded pairing code "${rawPairingCode}" for org "${testOrgId}"`);

        // ─── Start Fake Tally ───────────────────────────────────────
        fakeTallyServer = await startFakeTally(FAKE_TALLY_PORT);

        // ─── Pair via Controller ────────────────────────────────────
        console.log("[Bridge] Pairing with local cloud...");
        const pairResult = await controller.pair(CLOUD_URL, rawPairingCode, "TestWorkstation");
        console.log("[Bridge] Pair result:", pairResult);

        // Configure Tally settings to point to fake Tally
        await controller.updateTallyConfig("127.0.0.1", FAKE_TALLY_PORT, "Demo Company");

        // ─── STATE (B): Paired + Connected with Fake Tally ───────────
        console.log("[Capture] Waiting for poller to run health check and poll cloud...");
        win.webContents.send("bridge:status-update", controller.getStatus());
        await sleep(3500);
        win.webContents.send("bridge:status-update", controller.getStatus());
        await sleep(500);
        const imgB = await win.webContents.capturePage();
        const pathB = path.join(outDir, "screenshot_b_paired_connected.png");
        fs.writeFileSync(pathB, imgB.toPNG());
        console.log("✅ Screenshot (b) saved: " + pathB);

        // ─── Stop Fake Tally ────────────────────────────────────────
        console.log("[Fake Tally] Stopping fake Tally server...");
        await new Promise((r) => {
            if (fakeTallyServer.closeAllConnections) fakeTallyServer.closeAllConnections();
            fakeTallyServer.close(r);
        });
        fakeTallyServer = null;

        // ─── STATE (C): Paired with Tally Stopped ───────────────────
        console.log("[Capture] Waiting for next poll cycle to detect stopped Tally...");
        await sleep(6500);
        win.webContents.send("bridge:status-update", controller.getStatus());
        await sleep(500);
        const imgC = await win.webContents.capturePage();
        const pathC = path.join(outDir, "screenshot_c_paired_tally_stopped.png");
        fs.writeFileSync(pathC, imgC.toPNG());
        console.log("✅ Screenshot (c) saved: " + pathC);

        // Cleanup test data from MongoDB
        await db.collection("tallypairingcodes").deleteMany({ organizationId: testOrgId });
        await db.collection("tallybridgedevices").deleteMany({ organizationId: testOrgId });
        console.log("[MongoDB] Cleaned up test pairing data");

    } catch (err) {
        console.error("❌ Error in capture script:", err);
    } finally {
        if (fakeTallyServer) {
            fakeTallyServer.close();
        }
        if (mongoClient) {
            await mongoClient.close();
        }
        app.quit();
    }
});
