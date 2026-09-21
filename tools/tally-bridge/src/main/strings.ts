/**
 * UI Strings Dictionary
 * ─────────────────────────────────────────────────────────
 * All user-facing strings live in this file for later i18n.
 * UI language: English.
 */

export const STRINGS = {
    appTitle: "IND Manager — Tally Bridge",
    unpairedHeading: "Connect to IND Manager",
    unpairedSubheading: "Enter pairing credentials from Settings > Tally Integration in your dashboard.",
    pairedHeading: "Tally Bridge Connected",
    cloudUrlLabel: "Cloud URL",
    cloudUrlPlaceholder: "http://localhost:3000 or https://...",
    deviceNameLabel: "Device Name",
    pairingCodeLabel: "Pairing Code",
    pairingCodePlaceholder: "XXXX-XXXX",
    pairButton: "Pair Device",
    pairingProgress: "Connecting...",
    statusCloudConnected: "Cloud Connected",
    statusCloudError: "Cloud Connection Error",
    statusTallyOnline: "Tally Server Online",
    statusTallyOffline: "Tally Server Offline",
    statusAuthFailed: "Authentication Failed",
    lastPollLabel: "Last Successful Sync",
    neverSynced: "Never",
    tallySettingsHeading: "Tally Connection Settings",
    tallyHostLabel: "Tally Host",
    tallyPortLabel: "Tally Port",
    tallyCompanyLabel: "Company Name (Optional)",
    tallyCompanyPlaceholder: "e.g., Acme Corp",
    saveSettingsButton: "Save Settings",
    settingsSavedNotice: "Settings saved successfully",
    autostartLabel: "Start automatically on system startup",
    openLogsButton: "Open Logs Folder",
    forgetDeviceButton: "Forget This Device",
    confirmForgetHeading: "Forget Device?",
    confirmForgetMessage: "This will remove the local pairing token. You will need a new pairing code from IND Manager to reconnect.",
    confirmForgetConfirm: "Forget Device",
    confirmForgetCancel: "Cancel",
    repairPrompt: "Please re-pair this device to resume syncing.",
    trayTooltipPrefix: "IND Manager Tally Bridge",
    trayShow: "Show Window",
    trayQuit: "Quit",
    trayStatusOnline: "Online & Connected",
    trayStatusProblem: "Connection Warning",
    trayStatusOffline: "Disconnected / Not Paired",
    encryptionUnavailableError: "Secure token storage (safeStorage) is not available on this system. Token cannot be stored safely.",
};
