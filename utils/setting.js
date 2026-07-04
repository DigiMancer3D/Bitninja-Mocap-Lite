/**
 *  Bitninja Mocap Lite settings utility.
 *  Based on SysMocap settings, with local-only OBS-focused defaults.
 */

const storage = require("electron-localstorage");
var remote = require("@electron/remote");
storage.setStoragePath(remote.getGlobal("storagePath").jsonPath);

var currentVer = 0.7350;

const defaultSettings = {
    ui: {
        themeColor: "deep-purple",
        isDark: true,
        useGlass: false,
        language:
            (typeof window !== "undefined" && window.navigator.language.split("-")[0] == "zh")
                ? "zh"
                : "en",
        useNewModelUI: true,
    },
    preview: {
        showSketelonOnInput: false,
        mirroringWhenCamera: true,
        mirroringWhenVideoFile: false,
    },
    output: {
        antialias: false,
        showFPS: false,
        usePicInsteadOfColor: false,
        bgColor: "#3B2364",
        bgPicPath: "",
    },
    forward: {
        enableForwarding: false,
        port: "8080",
        useSSL: false,
        supportForWebXR: false,
    },
    mediapipe: {
        modelComplexity: "0",
        smoothLandmarks: true,
        minDetectionConfidence: "0.55",
        minTrackingConfidence: "0.60",
        refineFaceLandmarks: false,
    },
    lite: {
        localOnly: true,
        trackingMode: "pose_fast",
        trackerInputMode: "downsample",
        trackerInputWidth: 160,
        trackerInputHeight: 120,
        poseFastInternalSmoothing: false,
        lipSyncMode: "none",
        audioLipAssist: false,
        eyeTrackingEnabled: false,
        fingerSyncMode: "none",
        activePerfPreset: "fast",
        allowHttpWebSocketWithUpdates: false,
        targetFps: 12,
        renderFps: 30,
        cameraWidth: 320,
        cameraHeight: 240,
        cameraMaxFps: 12,
        pixelRatio: 1,
        obsBgColor: "#3B2364",
        autoScanModels: true,
        defaultView: "half",
        lockHorizontal: true,
        motionRotationLerp: 0.55,
        motionPositionLerp: 0.38,
        faceLerp: 0.38,
        maxYawDeg: 60,
    },
    dev: {
        allowDevTools: false,
        openDevToolsWhenMocap: false,
    },
    performance: {
        useDgpu: false,
        GPUs: 0,
        useDescrertionProcess: false,
    },
    valued: true,
    ver: currentVer,
};

function isObject(v) {
    return v && typeof v === "object" && !Array.isArray(v);
}

function mergeDefaults(target, defaults) {
    if (!isObject(target)) target = {};
    for (const key of Object.keys(defaults)) {
        if (isObject(defaults[key])) {
            target[key] = mergeDefaults(target[key], defaults[key]);
        } else if (typeof target[key] === "undefined") {
            target[key] = defaults[key];
        }
    }
    return target;
}

function applyLiteLocks(settings) {
    settings = mergeDefaults(settings, defaultSettings);

    // Hard-disable services/features the Lite fork does not use.
    settings.forward.enableForwarding = false;
    settings.forward.useSSL = false;
    settings.forward.supportForWebXR = false;
    settings.ui.useGlass = false;

    // Apply performance defaults once when migrating from full SysMocap.
    if (!settings.__bitninjaLiteApplied || settings.ver < currentVer) {
        settings.ui.themeColor = "deep-purple";
        settings.ui.isDark = true;
        settings.preview.showSketelonOnInput = false;
        settings.preview.mirroringWhenCamera = true;
        settings.preview.mirroringWhenVideoFile = false;
        settings.output.antialias = false;
        settings.output.showFPS = false;
        settings.output.bgColor = "#3B2364";
        settings.lite.trackingMode = "pose_fast";
        settings.lite.trackerInputMode = "downsample";
        settings.lite.trackerInputWidth = 160;
        settings.lite.trackerInputHeight = 120;
        settings.lite.poseFastInternalSmoothing = false;
        settings.lite.lipSyncMode = "none";
        settings.lite.audioLipAssist = false;
        settings.lite.eyeTrackingEnabled = false;
        settings.lite.fingerSyncMode = "none";
        settings.lite.obsBgColor = "#3B2364";
        settings.lite.defaultView = "half";
        settings.lite.lockHorizontal = true;
        settings.lite.motionRotationLerp = 0.72;
        settings.lite.motionPositionLerp = 0.62;
        settings.lite.faceLerp = 0.50;
        settings.lite.maxYawDeg = 35;
        settings.lite.targetFps = 12;
        settings.lite.renderFps = 30;
        settings.lite.cameraWidth = 320;
        settings.lite.cameraHeight = 240;
        settings.lite.cameraMaxFps = 12;
        settings.mediapipe.modelComplexity = "0";
        settings.mediapipe.smoothLandmarks = true;
        settings.mediapipe.minDetectionConfidence = "0.50";
        settings.mediapipe.minTrackingConfidence = "0.55";
        settings.mediapipe.refineFaceLandmarks = false;
        settings.performance.useDescrertionProcess = false;
        settings.__bitninjaLiteApplied = true;
    }


    // Stage 8: keep performance fields sane even when older localStorage is migrated.
    settings.lite.targetFps = Math.max(4, Math.min(30, Number(settings.lite.targetFps || 12)));
    settings.lite.renderFps = Math.max(15, Math.min(60, Number(settings.lite.renderFps || 30)));
    settings.lite.cameraMaxFps = Math.max(4, Math.min(30, Number(settings.lite.cameraMaxFps || settings.lite.targetFps || 12)));
    settings.lite.cameraWidth = Number(settings.lite.cameraWidth || 320);
    settings.lite.cameraHeight = Number(settings.lite.cameraHeight || 240);
    if (!settings.lite.trackingMode || !["pose_fast", "holistic_full"].includes(settings.lite.trackingMode)) {
        settings.lite.trackingMode = "pose_fast";
    }
    if (!settings.lite.trackerInputMode || !["video", "downsample"].includes(settings.lite.trackerInputMode)) {
        settings.lite.trackerInputMode = "downsample";
    }
    settings.lite.trackerInputWidth = Math.max(96, Math.min(640, Number(settings.lite.trackerInputWidth || 160)));
    settings.lite.trackerInputHeight = Math.max(72, Math.min(480, Number(settings.lite.trackerInputHeight || 120)));
    if (typeof settings.lite.poseFastInternalSmoothing === "undefined") settings.lite.poseFastInternalSmoothing = false;
    if (!settings.lite.lipSyncMode || !["none", "simple", "full", "audio"].includes(settings.lite.lipSyncMode)) settings.lite.lipSyncMode = "none";
    if (typeof settings.lite.audioLipAssist === "undefined") settings.lite.audioLipAssist = false;
    if (typeof settings.lite.eyeTrackingEnabled === "undefined") settings.lite.eyeTrackingEnabled = false;
    settings.lite.audioLipAssist = !!settings.lite.audioLipAssist;
    settings.lite.eyeTrackingEnabled = !!settings.lite.eyeTrackingEnabled;
    if (!settings.lite.fingerSyncMode || !["none", "simple", "full"].includes(settings.lite.fingerSyncMode)) settings.lite.fingerSyncMode = "none";
    if (!settings.lite.activePerfPreset || !["min", "fast", "smooth", "balanced", "holistic", "max", "game", "talks"].includes(settings.lite.activePerfPreset)) settings.lite.activePerfPreset = "fast";
    if (typeof settings.lite.allowHttpWebSocketWithUpdates === "undefined") settings.lite.allowHttpWebSocketWithUpdates = false;
    if (!settings.lite.obsBgColor) settings.lite.obsBgColor = "#3B2364";
    if (!settings.lite.defaultView || !["full", "half", "face"].includes(settings.lite.defaultView)) settings.lite.defaultView = "half";
    if (typeof settings.lite.lockHorizontal === "undefined") settings.lite.lockHorizontal = true;
    settings.mediapipe.modelComplexity = String(settings.mediapipe.modelComplexity || "0");
    if (!["0", "1", "2"].includes(settings.mediapipe.modelComplexity)) settings.mediapipe.modelComplexity = "0";
    settings.output.antialias = !!settings.output.antialias;
    settings.output.showFPS = !!settings.output.showFPS;

    settings.valued = true;
    settings.ver = currentVer;
    return settings;
}

function getSettings() {
    var settings = storage.getItem("sysmocap-global-settings");
    settings = applyLiteLocks(settings);
    storage.setItem("sysmocap-global-settings", settings);
    return settings;
}

var globalSettings = getSettings();

function getUserModels() {
    var models = storage.getItem("sysmocap-user-models");
    if (!models) models = [];
    return models;
}

var models = getUserModels();

function saveSettings(settings) {
    if (!settings) settings = globalSettings;
    settings = applyLiteLocks(settings);
    if (settings.lite && settings.lite.obsBgColor) {
        settings.output.bgColor = settings.lite.obsBgColor;
    }
    storage.setItem("sysmocap-global-settings", settings);
    storage.setItem("useDgpu", !!settings.performance.useDgpu);
    storage.setItem("useDMoc", false);
    storage.setItem("used", true);
    storage.setItem("useDark", !!settings.ui.isDark);
}

function addUserModels(model) {
    if (!model) return;
    models.push(model);
    storage.setItem("sysmocap-user-models", models);
}

function removeUserModels(name) {
    var index = models.findIndex(function (element) {
        return element.name === name;
    });
    if (index > -1) models.splice(index, 1);
    storage.setItem("sysmocap-user-models", models);
}

module.exports = {
    getSettings: getSettings,
    globalSettings: globalSettings,
    saveSettings: saveSettings,
    getUserModels: getUserModels,
    userModels: models,
    addUserModels: addUserModels,
    removeUserModels: removeUserModels,
};
