/**
 * Preload Script
 * ─────────────────────────────────────────────────────────
 * Exposes minimal secure API via contextBridge.
 * Renderer receives status only, never the token.
 */

import { contextBridge, ipcRenderer } from "electron";
import { BridgeStatus } from "../core/types";

contextBridge.exposeInMainWorld("bridgeApi", {
    getStatus: (): Promise<BridgeStatus> => ipcRenderer.invoke("bridge:get-status"),
    onStatusChange: (callback: (status: BridgeStatus) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, status: BridgeStatus) => callback(status);
        ipcRenderer.on("bridge:status-update", handler);
        return () => {
            ipcRenderer.removeListener("bridge:status-update", handler);
        };
    },
    pair: (params: { cloudUrl: string; pairingCode: string; deviceName: string }) =>
        ipcRenderer.invoke("bridge:pair", params),
    saveTallySettings: (params: { tallyHost: string; tallyPort: number; tallyCompany?: string }) =>
        ipcRenderer.invoke("bridge:save-tally-settings", params),
    setAutoStart: (enabled: boolean) =>
        ipcRenderer.invoke("bridge:set-autostart", enabled),
    openLogsFolder: () =>
        ipcRenderer.invoke("bridge:open-logs-folder"),
    forgetDevice: () =>
        ipcRenderer.invoke("bridge:forget-device"),
    getStrings: () =>
        ipcRenderer.invoke("bridge:get-strings"),
    getDefaultHostName: () =>
        ipcRenderer.invoke("bridge:get-hostname"),
});
