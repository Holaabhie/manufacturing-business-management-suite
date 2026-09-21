/**
 * Electron Main Process
 * ─────────────────────────────────────────────────────────
 * Security: contextIsolation, no nodeIntegration, sandboxed, CSP.
 * Single-instance lock.
 * Close-to-tray. 3-state tray icon (green/amber/grey).
 * Autostart (only when packaged).
 */

import { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage } from "electron";
import * as path from "node:path";
import * as os from "node:os";
import { BridgeController } from "../core/bridge-controller";
import { ElectronTokenStore } from "./electron-token-store";
import { ElectronConfigStore } from "./electron-config-store";
import { FileLogger } from "./file-logger";
import { STRINGS } from "./strings";
import { BridgeStatus } from "../core/types";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// 1. Single-instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    app.whenReady().then(async () => {
        const userDataPath = app.getPath("userData");
        const logger = new FileLogger(userDataPath);
        const tokenStore = new ElectronTokenStore(userDataPath);
        const configStore = new ElectronConfigStore(userDataPath);

        const controller = new BridgeController({
            tokenStore,
            configStore,
            logger,
            appVersion: app.getVersion() || "0.1.0",
            onStatusChange: (status) => {
                updateTray(status);
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send("bridge:status-update", status);
                }
            },
        });

        // 2. Setup Tray
        createTray();

        // 3. Setup Window
        createWindow();

        // 4. Initialize controller
        const initialStatus = await controller.init();
        updateTray(initialStatus);

        // 5. IPC Handlers
        ipcMain.handle("bridge:get-status", () => {
            return controller.getStatus();
        });

        ipcMain.handle("bridge:pair", async (_event, params) => {
            const { cloudUrl, pairingCode, deviceName } = params;
            return controller.pair(cloudUrl, pairingCode, deviceName);
        });

        ipcMain.handle("bridge:save-tally-settings", async (_event, params) => {
            const { tallyHost, tallyPort, tallyCompany } = params;
            return controller.updateTallyConfig(tallyHost, tallyPort, tallyCompany);
        });

        ipcMain.handle("bridge:set-autostart", async (_event, enabled: boolean) => {
            const config = await configStore.getConfig();
            if (config) {
                config.autoStart = enabled;
                await configStore.saveConfig(config);
            }
            if (app.isPackaged) {
                app.setLoginItemSettings({
                    openAtLogin: enabled,
                    path: process.execPath,
                });
            }
            return true;
        });

        ipcMain.handle("bridge:open-logs-folder", async () => {
            await shell.openPath(logger.getLogDir());
            return true;
        });

        ipcMain.handle("bridge:forget-device", async () => {
            await controller.forgetDevice();
            return true;
        });

        ipcMain.handle("bridge:get-strings", () => {
            return STRINGS;
        });

        ipcMain.handle("bridge:get-hostname", () => {
            return os.hostname();
        });
    });

    app.on("before-quit", () => {
        isQuitting = true;
    });

    app.on("window-all-closed", () => {
        // Keep running in tray on close
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 580,
        height: 640,
        minWidth: 500,
        minHeight: 550,
        resizable: true,
        show: false,
        title: STRINGS.appTitle,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    // Security: deny window.open and external navigation
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    mainWindow.webContents.on("will-navigate", (event) => {
        event.preventDefault();
    });

    const htmlPath = path.join(__dirname, "..", "renderer", "index.html");
    mainWindow.loadFile(htmlPath);

    mainWindow.once("ready-to-show", () => {
        mainWindow?.show();
    });

    // Hide to tray on close
    mainWindow.on("close", (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });
}

function getIconPath(state: "green" | "amber" | "grey"): string {
    return path.join(__dirname, "..", "assets", `icon-${state}.png`);
}

function createTray() {
    const iconImage = nativeImage.createFromPath(getIconPath("grey"));
    tray = new Tray(iconImage);
    tray.setToolTip(`${STRINGS.trayTooltipPrefix} — ${STRINGS.trayStatusOffline}`);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: STRINGS.trayShow,
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            },
        },
        { type: "separator" },
        {
            label: STRINGS.trayQuit,
            click: () => {
                isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

function updateTray(status: BridgeStatus) {
    if (!tray) return;

    let iconState: "green" | "amber" | "grey" = "grey";
    let statusText = STRINGS.trayStatusOffline;

    if (status.state === "paired") {
        if (status.cloudOk && status.tally.reachable) {
            iconState = "green";
            statusText = STRINGS.trayStatusOnline;
        } else {
            iconState = "amber";
            statusText = STRINGS.trayStatusProblem;
        }
    }

    const iconImage = nativeImage.createFromPath(getIconPath(iconState));
    tray.setImage(iconImage);
    tray.setToolTip(`${STRINGS.trayTooltipPrefix} — ${statusText}`);
}
