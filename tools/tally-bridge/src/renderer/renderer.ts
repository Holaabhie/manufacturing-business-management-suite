/**
 * Renderer Script (Vanilla TS)
 * ─────────────────────────────────────────────────────────
 * Interacts only via window.bridgeApi exposed by preload.
 * Never handles or accesses tokens.
 */

interface BridgeApi {
    getStatus(): Promise<any>;
    onStatusChange(callback: (status: any) => void): () => void;
    pair(params: { cloudUrl: string; pairingCode: string; deviceName: string }): Promise<any>;
    saveTallySettings(params: { tallyHost: string; tallyPort: number; tallyCompany?: string }): Promise<any>;
    setAutoStart(enabled: boolean): Promise<any>;
    openLogsFolder(): Promise<any>;
    forgetDevice(): Promise<any>;
    getStrings(): Promise<any>;
    getDefaultHostName(): Promise<string>;
}

const api: BridgeApi = (window as any).bridgeApi;

// DOM Elements
const unpairedView = document.getElementById("unpairedView")!;
const pairedView = document.getElementById("pairedView")!;
const headerStatusPill = document.getElementById("headerStatusPill")!;

const pairForm = document.getElementById("pairForm") as HTMLFormElement;
const cloudUrlInput = document.getElementById("cloudUrlInput") as HTMLInputElement;
const deviceNameInput = document.getElementById("deviceNameInput") as HTMLInputElement;
const pairingCodeInput = document.getElementById("pairingCodeInput") as HTMLInputElement;
const pairButton = document.getElementById("pairButton") as HTMLButtonElement;
const pairErrorAlert = document.getElementById("pairErrorAlert")!;

const authFailedBanner = document.getElementById("authFailedBanner")!;
const authFailedReasonText = document.getElementById("authFailedReasonText")!;
const repairButton = document.getElementById("repairButton")!;

const cloudIndicator = document.getElementById("cloudIndicator")!;
const cloudStatusText = document.getElementById("cloudStatusText")!;
const cloudErrorDetails = document.getElementById("cloudErrorDetails")!;
const lastPollValue = document.getElementById("lastPollValue")!;

const tallyIndicator = document.getElementById("tallyIndicator")!;
const tallyStatusText = document.getElementById("tallyStatusText")!;
const tallyTargetValue = document.getElementById("tallyTargetValue")!;
const tallyErrorDetails = document.getElementById("tallyErrorDetails")!;

const tallySettingsForm = document.getElementById("tallySettingsForm") as HTMLFormElement;
const tallyHostInput = document.getElementById("tallyHostInput") as HTMLInputElement;
const tallyPortInput = document.getElementById("tallyPortInput") as HTMLInputElement;
const tallyCompanyInput = document.getElementById("tallyCompanyInput") as HTMLInputElement;
const saveSettingsButton = document.getElementById("saveSettingsButton") as HTMLButtonElement;
const settingsSavedNotice = document.getElementById("settingsSavedNotice")!;

const autostartCheckbox = document.getElementById("autostartCheckbox") as HTMLInputElement;
const openLogsButton = document.getElementById("openLogsButton")!;
const forgetDeviceButton = document.getElementById("forgetDeviceButton")!;

const forgetModal = document.getElementById("forgetModal")!;
const cancelForgetButton = document.getElementById("cancelForgetButton")!;
const confirmForgetButton = document.getElementById("confirmForgetButton")!;

let strings: any = {};

async function init() {
    strings = await api.getStrings();

    // Set default device name from OS hostname
    const defaultHost = await api.getDefaultHostName();
    if (!deviceNameInput.value) {
        deviceNameInput.value = defaultHost || "My-Computer";
    }

    // Load initial status
    const initialStatus = await api.getStatus();
    renderStatus(initialStatus);

    // Listen for live status updates from background poller
    api.onStatusChange((status: any) => {
        renderStatus(status);
    });
}

function renderStatus(status: any) {
    if (!status) return;

    if (status.state === "unpaired") {
        unpairedView.classList.remove("hidden");
        pairedView.classList.add("hidden");
        headerStatusPill.className = "status-pill status-grey";
        headerStatusPill.textContent = strings.trayStatusOffline || "Offline";
        return;
    }

    // Paired or Auth Failed
    unpairedView.classList.add("hidden");
    pairedView.classList.remove("hidden");

    // Populate current config values into settings inputs if not focused
    if (status.config) {
        if (document.activeElement !== tallyHostInput) {
            tallyHostInput.value = status.config.tallyHost || "localhost";
        }
        if (document.activeElement !== tallyPortInput) {
            tallyPortInput.value = String(status.config.tallyPort || 9000);
        }
        if (document.activeElement !== tallyCompanyInput) {
            tallyCompanyInput.value = status.config.tallyCompany || "";
        }
        autostartCheckbox.checked = Boolean(status.config.autoStart);
    }

    // Auth failed alert
    if (status.state === "auth_failed") {
        authFailedBanner.classList.remove("hidden");
        authFailedReasonText.textContent = status.authFailedReason || strings.repairPrompt || "Authorization failed.";
        headerStatusPill.className = "status-pill status-red";
        headerStatusPill.textContent = strings.statusAuthFailed || "Auth Failed";
    } else {
        authFailedBanner.classList.add("hidden");
        if (status.cloudOk && status.tally?.reachable) {
            headerStatusPill.className = "status-pill status-green";
            headerStatusPill.textContent = strings.trayStatusOnline || "Online";
        } else {
            headerStatusPill.className = "status-pill status-amber";
            headerStatusPill.textContent = strings.trayStatusProblem || "Warning";
        }
    }

    // Cloud connection card
    if (status.cloudOk) {
        cloudIndicator.className = "indicator dot-green";
        cloudStatusText.textContent = strings.statusCloudConnected || "Connected";
        cloudErrorDetails.classList.add("hidden");
    } else {
        cloudIndicator.className = "indicator dot-amber";
        cloudStatusText.textContent = strings.statusCloudError || "Connecting...";
        if (status.cloudError) {
            cloudErrorDetails.textContent = status.cloudError;
            cloudErrorDetails.classList.remove("hidden");
        } else {
            cloudErrorDetails.classList.add("hidden");
        }
    }

    // Last sync time
    if (status.lastSuccessfulPoll) {
        const d = new Date(status.lastSuccessfulPoll);
        lastPollValue.textContent = d.toLocaleTimeString();
    } else {
        lastPollValue.textContent = strings.neverSynced || "Never";
    }

    // Tally health card
    const tally = status.tally;
    if (tally) {
        tallyTargetValue.textContent = `${tally.host}:${tally.port}`;
        if (tally.reachable) {
            tallyIndicator.className = "indicator dot-green";
            tallyStatusText.textContent = strings.statusTallyOnline || "Online";
            tallyErrorDetails.classList.add("hidden");
        } else {
            tallyIndicator.className = "indicator dot-amber";
            tallyStatusText.textContent = strings.statusTallyOffline || "Offline";
            if (tally.lastError) {
                tallyErrorDetails.textContent = `Error: ${tally.lastError}`;
                tallyErrorDetails.classList.remove("hidden");
            } else {
                tallyErrorDetails.classList.add("hidden");
            }
        }
    }
}

// Pairing Form Submit
pairForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    pairErrorAlert.classList.add("hidden");
    pairButton.disabled = true;
    pairButton.textContent = strings.pairingProgress || "Connecting...";

    try {
        const cloudUrl = cloudUrlInput.value.trim();
        const deviceName = deviceNameInput.value.trim();
        const pairingCode = pairingCodeInput.value.trim();

        const result = await api.pair({ cloudUrl, deviceName, pairingCode });
        if (!result.success) {
            pairErrorAlert.textContent = result.error || "Pairing failed";
            pairErrorAlert.classList.remove("hidden");
        } else {
            pairingCodeInput.value = "";
        }
    } catch (err: any) {
        pairErrorAlert.textContent = err?.message || "Unexpected error during pairing";
        pairErrorAlert.classList.remove("hidden");
    } finally {
        pairButton.disabled = false;
        pairButton.textContent = strings.pairButton || "Pair Device";
    }
});

// Format pairing code with dash automatically
pairingCodeInput.addEventListener("input", () => {
    let val = pairingCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (val.length > 4) {
        val = val.slice(0, 4) + "-" + val.slice(4, 8);
    }
    pairingCodeInput.value = val;
});

// Save Tally Settings
tallySettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveSettingsButton.disabled = true;

    try {
        const tallyHost = tallyHostInput.value.trim();
        const tallyPort = parseInt(tallyPortInput.value, 10) || 9000;
        const tallyCompany = tallyCompanyInput.value.trim();

        await api.saveTallySettings({ tallyHost, tallyPort, tallyCompany });
        settingsSavedNotice.classList.remove("hidden");
        setTimeout(() => settingsSavedNotice.classList.add("hidden"), 3000);
    } finally {
        saveSettingsButton.disabled = false;
    }
});

// Autostart toggle
autostartCheckbox.addEventListener("change", async () => {
    await api.setAutoStart(autostartCheckbox.checked);
});

// Open logs
openLogsButton.addEventListener("click", async () => {
    await api.openLogsFolder();
});

// Re-pair button on auth-failed banner
repairButton.addEventListener("click", () => {
    pairedView.classList.add("hidden");
    unpairedView.classList.remove("hidden");
    pairErrorAlert.classList.add("hidden");
});

// Forget device
forgetDeviceButton.addEventListener("click", () => {
    forgetModal.classList.remove("hidden");
});

cancelForgetButton.addEventListener("click", () => {
    forgetModal.classList.add("hidden");
});

confirmForgetButton.addEventListener("click", async () => {
    forgetModal.classList.add("hidden");
    await api.forgetDevice();
});

init().catch(console.error);
