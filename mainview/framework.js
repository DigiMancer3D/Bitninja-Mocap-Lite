/**
 *  SysMocap Main GUI (display when boot finish)
 *
 *  A part of SysMocap, open sourced under Mozilla Public License 2.0
 *
 *  https://github.com/xianfei/SysMocap
 *
 *  xianfei 2022.3
 */

var ipcRenderer = null;
var remote = null;
var platform = "web";

var mixamorig = {
    "Hips": {
        "name": "mixamorigHips",
        "order": "XYZ",
        "func": { "fx": "-x", "fy": "y", "fz": "-z" }
    },
    "Neck": {
        "name": "mixamorigNeck",
        "order": "XYZ",
        "func": { "fx": "-x", "fy": "y", "fz": "-z" }
    },
    "Chest": {
        "name": "mixamorigSpine2",
        "order": "XYZ",
        "func": { "fx": "-x", "fy": "y", "fz": "-z" }
    },
    "Spine": {
        "name": "mixamorigSpine",
        "order": "XYZ",
        "func": { "fx": "-x", "fy": "y", "fz": "-z" }
    },
    "RightUpperArm": {
        "name": "mixamorigRightArm",
        "order": "ZXY",
        "func": { "fx": "-z", "fy": "x", "fz": "-y" }
    },
    "RightLowerArm": {
        "name": "mixamorigRightForeArm",
        "order": "ZXY",
        "func": { "fx": "-z", "fy": "x", "fz": "-y" }
    },
    "LeftUpperArm": {
        "name": "mixamorigLeftArm",
        "order": "ZXY",
        "func": { "fx": "z", "fy": "-x", "fz": "-y" }
    },
    "LeftLowerArm": {
        "name": "mixamorigLeftForeArm",
        "order": "ZXY",
        "func": { "fx": "z", "fy": "-x", "fz": "-y" }
    },
    "LeftUpperLeg": {
        "name": "mixamorigLeftUpLeg",
        "order": "XYZ",
        "func": { "fx": "-x", "fy": "y", "fz": "-z" }
    },
    "LeftLowerLeg": {
        "name": "mixamorigLeftLeg",
        "order": "XYZ",
        "func": { "fx": "-x", "fy": "y", "fz": "-z" }
    },
    "RightUpperLeg": {
        "name": "mixamorigRightUpLeg",
        "order": "XYZ",
        "func": { "fx": "-x", "fy": "y", "fz": "-z" }
    },
    "RightLowerLeg": {
        "name": "mixamorigRightLeg",
        "order": "XYZ",
        "func": { "fx": "-x", "fy": "y", "fz": "-z" }
    }
};

function domBoom(target, onfinish) {
    target.style.animation = "shake 800ms ease-in-out";
    var targetBoundingClientRectX = target.getBoundingClientRect().x;
    var targetBoundingClientRectY = target.getBoundingClientRect().y;

    var mydiv = document.createElement("div");
    mydiv.id = "newDivId";
    mydiv.style.height = window.innerHeight + "px";
    mydiv.style.width = window.innerWidth + "px";
    mydiv.style.position = "absolute";
    mydiv.style.top = "0px";
    mydiv.style.left = "0px";
    mydiv.style.zIndex = "9999";

    var targetBak = target;
    target = target.cloneNode(true);

    target.style.margin = "0";
    target.style.position = "absolute";
    target.style.top = targetBoundingClientRectY + "px";
    target.style.left = targetBoundingClientRectX + "px";
    target.style.zIndex = "9999";

    mydiv.append(target);
    mydiv.style.filter = "opacity(0)";
    document.body.appendChild(mydiv);

    setTimeout(
        () =>
            html2canvas(mydiv, { backgroundColor: null }).then(function (
                canvas
            ) {
                targetBak.style.filter = "opacity(0)";
                mydiv.remove();
                canvas.style.position = "absolute";
                canvas.style.top = "0px";
                canvas.style.left = "0px";
                canvas.style.zIndex = "9999";
                document.body.appendChild(canvas);
                var boomOption2 = {
                    // 粒子间隔
                    gap: 5,
                    // 粒子大小
                    radius: 3,
                    // 最小水平喷射速度
                    minVx: -20,
                    // 最大水平喷射速度
                    maxVx: 25,
                    // 最小垂直喷射速度
                    minVy: -25,
                    // 最大垂直喷射速度
                    maxVy: 0.1,
                    speed: 10,
                    onBoomEnd: function () {
                        targetBak.remove();
                        // targetBak.style.filter = '';
                        if (onfinish) onfinish();
                        canvas.remove();
                    },
                };
                new ParticleBoom(canvas, boomOption2);
            }),
        200
    );
}

var darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

import {
    argbFromHex,
    themeFromSourceColor,
    themeFromImage,
    sourceColorFromImage,
    applyTheme,
} from "../node_modules/@material/material-color-utilities/index.js";

function rgba2hex(rgba) {
    rgba = rgba.match(
        /^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i
    );
    return rgba && rgba.length === 4
        ? "#" +
              ("0" + parseInt(rgba[1], 10).toString(16)).slice(-2) +
              ("0" + parseInt(rgba[2], 10).toString(16)).slice(-2) +
              ("0" + parseInt(rgba[3], 10).toString(16)).slice(-2)
        : "";
}

const BITNINJA_OBS_PURPLE = "#3B2364"; // RGB(59,35,100)

function bitninjaThemeSourceHex(settingsObj, cssColor) {
    try {
        if (settingsObj && settingsObj.ui && settingsObj.ui.themeColor === "deep-purple") {
            return BITNINJA_OBS_PURPLE;
        }
    } catch (err) {}
    return rgba2hex(cssColor) || BITNINJA_OBS_PURPLE;
}

function bitninjaNormalizeHexColor(color) {
    color = String(color || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toUpperCase();
    const parsed = rgba2hex(color);
    return parsed ? parsed.toUpperCase() : BITNINJA_OBS_PURPLE;
}

function bitninjaHexToRgb(color) {
    const hex = bitninjaNormalizeHexColor(color).replace("#", "");
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
    };
}

window.bitninjaCurrentThemeColor = function () {
    try {
        if (window.sysmocapApp && window.sysmocapApp.settings?.ui?.themeColor === "deep-purple") {
            return BITNINJA_OBS_PURPLE;
        }
    } catch (err) {}
    const primary = document.body.style.getPropertyValue("--md-sys-color-primary");
    if (primary) return bitninjaNormalizeHexColor(primary);
    const color = window.getComputedStyle(document.querySelector(".mdui-text-color-theme"), null).color;
    return bitninjaNormalizeHexColor(color);
};

window.bitninjaShowColorData = function (label, color) {
    const hex = bitninjaNormalizeHexColor(color);
    const rgb = bitninjaHexToRgb(hex);
    const msg = `${label}: ${hex} / RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    try {
        require("electron").clipboard.writeText(`${hex} RGB(${rgb.r},${rgb.g},${rgb.b})`);
    } catch (err) {}
    try {
        mdui.snackbar({ message: msg + " copied.", timeout: 3500 });
    } catch (err) {
        alert(msg);
    }
};

if (typeof require != "undefined") {
    // import electron remote
    remote = require("@electron/remote");

    ipcRenderer = require("electron").ipcRenderer;

    const { shell } = require("electron");

    platform = require("os").platform();

    // import setting utils
    const {
        getSettings,
        globalSettings,
        saveSettings,
        userModels,
        addUserModels,
        removeUserModels,
    } = require("../utils/setting.js");

    // Stage 2R: force startup theme to match Bitninja Lite settings immediately.
    darkMode = !!globalSettings.ui.isDark;
    try {
        if (remote && remote.nativeTheme) {
            remote.nativeTheme.themeSource = darkMode ? "dark" : "light";
        }
    } catch (err) {
        console.warn("Bitninja Lite: nativeTheme startup sync skipped", err);
    }

    if (localStorage.getItem('disableUpdate') === null) localStorage.setItem('disableUpdate', 'true');

    // set theme
    document.body.setAttribute(
        "class",
        "mdui-theme-layout-auto mdui-theme-primary-" +
            globalSettings.ui.themeColor +
            " mdui-theme-accent-" +
            globalSettings.ui.themeColor
    );

    var f = async () => {
        var color = window.getComputedStyle(
            document.querySelector(".mdui-color-theme"),
            null
        ).backgroundColor;
        var hex = bitninjaThemeSourceHex((typeof app !== "undefined" && app.settings) ? app.settings : globalSettings, color);
        var theme = await themeFromSourceColor(argbFromHex(hex));
        applyTheme(theme, { target: document.body, dark: darkMode });
        // console.log(theme)
        ipcRenderer.send('tabChanged',window.sysmocapApp.tab,document.body.style.getPropertyValue('--md-sys-color-primary'),document.body.style.getPropertyValue('--md-sys-color-primary-container'));
    };
    f();

    // import languages
    const { languages } = require("../utils/language.js");

    // Bitninja Lite model library: scan local .vrm files from ./models and app root.
    const fs = require("fs");
    const path = require("path");
    const { pathToFileURL } = require("url");

    function toFileUrl(filePath) {
        try {
            return pathToFileURL(filePath).href;
        } catch (err) {
            return filePath;
        }
    }

    function findLocalModelImage(filePath) {
        const baseName = path.basename(filePath, path.extname(filePath));
        const modelDir = path.dirname(filePath);
        const roots = [
            modelDir,
            path.join(modelDir, "img"),
            path.join(process.cwd(), "models", "img"),
            path.join(remote.app.getAppPath(), "models", "img"),
        ];
        const extensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
        const seen = new Set();
        for (const rootDir of roots) {
            const resolvedRoot = path.resolve(rootDir);
            if (seen.has(resolvedRoot)) continue;
            seen.add(resolvedRoot);
            for (const ext of extensions) {
                const candidate = path.join(resolvedRoot, baseName + ext);
                if (fs.existsSync(candidate)) return toFileUrl(candidate);
            }
        }
        return "../sysmocap-icon.png";
    }

    function makeModelEntry(filePath) {
        const cleanPath = String(filePath || "").replace(/\\/g, "/");
        const base = path.basename(cleanPath);
        const name = base.replace(/\.[^.]+$/, "");
        return {
            name: name,
            type: "vrm",
            picBg: findLocalModelImage(cleanPath),
            path: cleanPath,
            accessories: {},
            binding: {},
            bitninjaLocal: true,
        };
    }

    function scanLocalVrmModels() {
        const roots = [
            path.join(remote.app.getAppPath(), "models"),
            path.join(process.cwd(), "models"),
            process.cwd(),
        ];
        const seenRoots = new Set();
        const seenFiles = new Set();
        const out = [];
        for (const dir of roots) {
            const realDir = path.resolve(dir);
            if (seenRoots.has(realDir) || !fs.existsSync(realDir)) continue;
            seenRoots.add(realDir);
            for (const item of fs.readdirSync(realDir, { withFileTypes: true })) {
                if (!item.isFile() || !item.name.toLowerCase().endsWith(".vrm")) continue;
                const full = path.join(realDir, item.name);
                const realFile = path.resolve(full);
                if (seenFiles.has(realFile)) continue;
                seenFiles.add(realFile);
                out.push(makeModelEntry(realFile));
            }
        }
        out.sort((a, b) => a.name.localeCompare(b.name));
        if (out.length) return out;
        try {
            return require("../models/models.json");
        } catch (err) {
            return [];
        }
    }

    var builtInModels = scanLocalVrmModels();

    var app = new Vue({
        el: "#vue-mount",
        data: {
            tab: "model",
            builtIn: builtInModels,
            selectModel: localStorage.getItem("selectModel")
                ? localStorage.getItem("selectModel")
                : JSON.stringify(builtInModels[0] || {}),
            language: languages[globalSettings.ui.language],
            videoSource: "camera",
            videoPath: "",
            showModelImporter: 0,
            modelImporterName: "",
            modelImporterType: "",
            modelImporterPath: "",
            modelImporterImg: "",
            settings: globalSettings,
            appVersion: remote.getGlobal("appInfo").appVersion,
            glRenderer: "Unknown",
            platform: platform,
            userModels: JSON.parse(JSON.stringify(userModels)),
            theme: {},
            document: document,
            camera: "",
            cameras: [],
            process: process,
            checkingUpdate: false,
            hasUpdate: null,
            updateError:null,
            isLatest:false,
            disableAutoUpdate: localStorage.getItem('disableUpdate') !== 'false',
            showLine: false
        },
        computed: {
            bg: function () {
                this.settings.ui.themeColor;
                var color = window.getComputedStyle(
                    document.querySelector(".mdui-color-theme"),
                    null
                ).backgroundColor;
                // console.log(color);
                return color;
            },
        },
        mounted() {
            var modelOnload = async function () {
                for (var e of document.querySelectorAll(".my-img")) {
                    if (e.src.includes("framework.html")) continue;
                    var theme = await themeFromImage(e);
                    applyTheme(theme, {
                        target: e.parentElement,
                        dark: darkMode,
                    });
                }
            };
            if (this.settings.ui.useNewModelUI) modelOnload();
            for(var e of document.querySelectorAll("div.color-dot")){
                e.style.boxShadow = e.computedStyleMap().get('background-color').toString().replace('rgb','rgba').replace(')',', 0.6) 0px 2px 6px')
            }

        },
        watch: {
            settings: {
                handler(newVal, oldVal) {
                    // save when changed
                    // console.log('settings changed')
                    darkMode = !!app.settings.ui.isDark;
                    document.body.setAttribute(
                        "class",
                        "mdui-theme-layout-auto mdui-theme-primary-" +
                            app.settings.ui.themeColor +
                            " mdui-theme-accent-" +
                            app.settings.ui.themeColor
                    );

                    if((remote.nativeTheme.themeSource=='dark')!==app.settings.ui.isDark){
                        remote.nativeTheme.themeSource = (!app.settings.ui.isDark)?'light':'dark';

                        var modelOnload = async function () {
                            for (var e of document.querySelectorAll(".my-img")) {
                                if (e.src.includes("framework.html")) continue;
                                var theme = await themeFromImage(e);
                                applyTheme(theme, {
                                    target: e.parentElement,
                                    dark: app.settings.ui.isDark,
                                });
                            }
                            for(var e of document.querySelectorAll("div.color-dot")){
                                e.style.boxShadow = e.computedStyleMap().get('background-color').toString().replace('rgb','rgba').replace(')',', 0.6) 0px 2px 6px')
                            }
                        };
                        setTimeout(()=>modelOnload(),500)
                        
                        
                    }

                    

                    var f = async () => {
                        var color = window.getComputedStyle(
                            document.querySelector(".mdui-text-color-theme"),
                            null
                        ).color;
                        var hex = bitninjaThemeSourceHex((typeof app !== "undefined" && app.settings) ? app.settings : globalSettings, color);
                        var theme = await themeFromSourceColor(
                            argbFromHex(hex)
                        );
                        applyTheme(theme, {
                            target: document.body,
                            dark: app.settings.ui.isDark,
                        });
                        ipcRenderer.send('tabChanged',window.sysmocapApp.tab,document.body.style.getPropertyValue('--md-sys-color-primary'),document.body.style.getPropertyValue('--md-sys-color-primary-container'));
                    };
                    f();

                    if (app.settings.lite && app.settings.lite.obsBgColor) {
                        app.settings.output.bgColor = app.settings.lite.obsBgColor;
                    }
                    saveSettings(app.settings);
                    app.language = languages[app.settings.ui.language];

                    
                },
                deep: true,
            },
            selectModel: {
                handler(newVal, oldVal) {
                    localStorage.setItem("selectModel", app.selectModel);
                },
                deep: true,
            },
            camera: (newVal, oldVal) => {
                // console.log({
                //     a: "last-choosed-camera",
                //     b: newVal,
                //     c: oldVal,
                //     d: localStorage.getItem("last-choosed-camera"),
                // });
                if (oldVal != "")
                    localStorage.setItem("last-choosed-camera", newVal);
            },
            disableAutoUpdate: (newVal, oldVal) => {
                localStorage.setItem('disableUpdate', newVal ? 'true' : 'false');
            },
            tab:(a,b)=>{
                ipcRenderer.send('tabChanged',window.sysmocapApp.tab,document.body.style.getPropertyValue('--md-sys-color-primary'),document.body.style.getPropertyValue('--md-sys-color-primary-container'));
            }
        },
    });

    async function refreshCameraList(preserveCurrent = true) {
        const lastChoosed = preserveCurrent
            ? (app.camera || localStorage.getItem("last-choosed-camera"))
            : localStorage.getItem("last-choosed-camera");
        app.cameras.splice(0, app.cameras.length);
        try {
            const mediaDevices = await navigator.mediaDevices.enumerateDevices();
            for (var mediaDevice of mediaDevices) {
                if (mediaDevice.kind === "videoinput") {
                    app.cameras.push({
                        id: mediaDevice.deviceId,
                        label: mediaDevice.label || "Camera " + (app.cameras.length + 1),
                    });
                }
            }
            if (app.cameras.length > 0) {
                const previous = app.cameras.find((e) => e.id == lastChoosed);
                app.camera = previous ? previous.id : app.cameras[0].id;
            } else {
                app.camera = "";
            }
            app.$nextTick(() => {
                try { window.bitninjaInitCameraSelect && window.bitninjaInitCameraSelect(); } catch (err) {}
            });
        } catch (err) {
            console.error("Camera source refresh failed", err);
            alert("Camera source refresh failed: " + err.message);
        }
    }

    // Bitninja Stage 9T: camera selector cleanup.
    // MDUI Select creates extra DOM wrappers. Rebuilding without cleanup causes
    // one more visible dropdown each time "Refresh Sources" is clicked.
    window.bitninjaCameraSelect = window.bitninjaCameraSelect || null;

    window.bitninjaCleanCameraSelectClones = function () {
        const selectEl = document.getElementById("demo-js-3");
        if (!selectEl) return;
        const scope = selectEl.closest(".settings-item") || selectEl.parentElement || document;

        // Remove generated/native duplicate camera selects in only this settings row.
        for (const el of Array.from(scope.querySelectorAll("select.mdui-select"))) {
            if (el.id !== "demo-js-3") {
                try { el.remove(); } catch (err) {}
            }
        }

        // Remove MDUI-generated visual wrappers before creating a fresh one.
        for (const el of Array.from(scope.querySelectorAll("div.mdui-select, div[class*='mdui-select']"))) {
            if (el !== selectEl && !el.contains(selectEl)) {
                try { el.remove(); } catch (err) {}
            }
        }

        // Some MDUI builds place the menu in the same row.
        for (const el of Array.from(scope.querySelectorAll("ul.mdui-menu, div.mdui-menu"))) {
            if (el !== selectEl && !el.contains(selectEl)) {
                try { el.remove(); } catch (err) {}
            }
        }
    };

    window.bitninjaInitCameraSelect = function () {
        const selectEl = document.getElementById("demo-js-3");
        if (!selectEl) return;
        try {
            if (window.bitninjaCameraSelect && typeof window.bitninjaCameraSelect.destroy === "function") {
                window.bitninjaCameraSelect.destroy();
            }
        } catch (err) {}

        window.bitninjaCleanCameraSelectClones();

        try {
            mdui.mutation();
        } catch (err) {}

        try {
            window.bitninjaCameraSelect = new mdui.Select("#demo-js-3");
        } catch (err) {
            console.error("Camera select init failed", err);
        }
    };

    window.refreshCameraSources = function () {
        refreshCameraList(true);
    };

    refreshCameraList(true);

    window.sysmocapApp = app;
    function bitninjaApplyPresetToSettings(preset) {
        const settings = app.settings;
        if (!settings.lite) settings.lite = {};
        if (!settings.mediapipe) settings.mediapipe = {};
        if (!settings.output) settings.output = {};
        if (!settings.preview) settings.preview = {};
        if (!settings.performance) settings.performance = {};

        const applyCommon = () => {
            settings.output.antialias = false;
            settings.output.showFPS = false;
            settings.output.bgColor = settings.lite.obsBgColor || "#3B2364";
            settings.preview.showSketelonOnInput = false;
            settings.performance.useDescrertionProcess = false;
            settings.lite.trackerInputMode = "downsample";
            settings.lite.renderFps = 30;
            settings.lite.defaultView = "half";
            settings.lite.lockHorizontal = true;
            settings.mediapipe.modelComplexity = "0";
            settings.mediapipe.smoothLandmarks = true;
            settings.mediapipe.refineFaceLandmarks = false;
            settings.mediapipe.minDetectionConfidence = "0.50";
            settings.mediapipe.minTrackingConfidence = "0.55";
        };

        const presetLabels = {
            min: "Min",
            fast: "OBS Fast",
            smooth: "OBS Smooth",
            balanced: "Balanced",
            holistic: "Face/Hands",
            max: "Max",
        };
        if (!presetLabels[preset]) preset = "fast";

        applyCommon();
        settings.lite.activePerfPreset = preset;

        if (preset === "min") {
            // Lowest-load diagnostic mode. Useful for checking whether a machine can keep up at all.
            settings.lite.trackingMode = "pose_fast";
            settings.lite.trackerInputMode = "downsample";
            settings.lite.trackerInputWidth = 160;
            settings.lite.trackerInputHeight = 120;
            settings.lite.poseFastInternalSmoothing = false;
            settings.lite.targetFps = 4;
            settings.lite.cameraMaxFps = 4;
            settings.lite.renderFps = 15;
            settings.lite.cameraWidth = 320;
            settings.lite.cameraHeight = 240;
            settings.mediapipe.modelComplexity = "0";
            settings.mediapipe.minDetectionConfidence = "0.45";
            settings.mediapipe.minTrackingConfidence = "0.45";
        } else if (preset === "balanced") {
            settings.lite.trackingMode = "pose_fast";
            settings.lite.trackerInputMode = "downsample";
            settings.lite.trackerInputWidth = 192;
            settings.lite.trackerInputHeight = 144;
            settings.lite.poseFastInternalSmoothing = false;
            settings.lite.targetFps = 12;
            settings.lite.cameraMaxFps = 12;
            settings.lite.renderFps = 30;
            settings.lite.cameraWidth = 320;
            settings.lite.cameraHeight = 240;
        } else if (preset === "smooth") {
            // 3D's panel/talking-stream preset: Holistic Full with downsample + smoothing enabled.
            settings.lite.trackingMode = "holistic_full";
            settings.lite.trackerInputMode = "downsample";
            settings.lite.trackerInputWidth = 160;
            settings.lite.trackerInputHeight = 120;
            settings.lite.poseFastInternalSmoothing = true;
            settings.lite.targetFps = 12;
            settings.lite.cameraMaxFps = 12;
            settings.lite.renderFps = 30;
            settings.lite.cameraWidth = 320;
            settings.lite.cameraHeight = 240;
            settings.mediapipe.smoothLandmarks = true;
            settings.mediapipe.refineFaceLandmarks = false;
            settings.mediapipe.modelComplexity = "0";
        } else if (preset === "holistic") {
            settings.lite.trackingMode = "holistic_full";
            settings.lite.trackerInputMode = "downsample";
            settings.lite.trackerInputWidth = 160;
            settings.lite.trackerInputHeight = 120;
            settings.lite.poseFastInternalSmoothing = false;
            settings.lite.targetFps = 8;
            settings.lite.cameraMaxFps = 8;
            settings.lite.renderFps = 30;
            settings.lite.cameraWidth = 320;
            settings.lite.cameraHeight = 240;
            settings.mediapipe.smoothLandmarks = true;
        } else if (preset === "max") {
            // Hardware-upgrade stress test. This is intentionally heavy and may lag on the current laptop.
            settings.lite.trackingMode = "holistic_full";
            settings.lite.trackerInputMode = "video";
            settings.lite.trackerInputWidth = 320;
            settings.lite.trackerInputHeight = 240;
            settings.lite.poseFastInternalSmoothing = true;
            settings.lite.targetFps = 30;
            settings.lite.cameraMaxFps = 30;
            settings.lite.renderFps = 60;
            settings.lite.cameraWidth = 1280;
            settings.lite.cameraHeight = 720;
            settings.output.antialias = true;
            settings.output.showFPS = true;
            settings.mediapipe.modelComplexity = "2";
            settings.mediapipe.smoothLandmarks = true;
            settings.mediapipe.refineFaceLandmarks = true;
            settings.mediapipe.minDetectionConfidence = "0.65";
            settings.mediapipe.minTrackingConfidence = "0.65";
        } else {
            settings.lite.trackingMode = "pose_fast";
            settings.lite.trackerInputMode = "downsample";
            settings.lite.trackerInputWidth = 160;
            settings.lite.trackerInputHeight = 120;
            settings.lite.poseFastInternalSmoothing = false;
            settings.lite.targetFps = 12;
            settings.lite.cameraMaxFps = 12;
            settings.lite.renderFps = 30;
            settings.lite.cameraWidth = 320;
            settings.lite.cameraHeight = 240;
        }

        saveSettings(settings);
        app.settings = settings;
        app.$forceUpdate();
        setTimeout(() => {
            try { mdui.mutation(); } catch (err) {}
        }, 50);
        const label = presetLabels[preset] || "OBS Fast";
        const msg = label + " preset applied. Refresh Live Camera or stop/start mocap for camera/tracker changes.";
        try { mdui.snackbar({ message: msg, timeout: 4500 }); }
        catch (err) { alert(msg); }
    }

    window.bitninjaApplyPerfPreset = bitninjaApplyPresetToSettings;

    remote.app.getGPUInfo("complete").then((info) => {
        // console.log(info)
        app.glRenderer = info.auxAttributes.glRenderer;
    });

    document.getElementById("chooseFile").onclick = async function () {
        const result = await remote.dialog.showOpenDialogSync({
            properties: ["openFile"],
            filters: [
                {
                    name: "视频文件",
                    extensions: ["mp4", "webm"],
                },
            ],
        });
        if (result) app.videoPath = result;
    };

    // var inst = new mdui.Select("#demo-js");

    var inst2 = new mdui.Select("#demo-js-2");

    var hasInitdLight = false;

    var isRemoteInit = false;

    // mdui.alert(
    //     "该版本为早期技术预览版，有众多未完工功能。目前只支持VRM模型。Version" +
    //         app.appVersion +
    //         ", alpha, forced dgpu."
    // );

    var isMax = false;

    window.maximizeBtn = function () {
        if (remote.getCurrentWindow().isMaximized()) {
            remote.getCurrentWindow().restore();
        } else {
            remote.getCurrentWindow().maximize();
        }
    };

    var contentDom = document.querySelector("#drag-area");

    //阻止相关事件默认行为
    contentDom.ondragcenter =
        contentDom.ondragover =
        contentDom.ondragleave =
            () => {
                return false;
            };

    //对拖动释放事件进行处理
    contentDom.ondrop = (e) => {
        e.preventDefault();
        //console.log(e);
        var filePath = e.dataTransfer.files[0].path.replaceAll("\\", "/");
        // console.log(filePath);
        var strs1 = filePath.split("/");
        var name_ = strs1[strs1.length - 1];
        var name = name_.substr(0, name_.lastIndexOf("."));
        var type = name_.substr(name_.lastIndexOf(".") + 1);
        if (app.showModelImporter == 1) {
            app.modelImporterName = name;
            app.modelImporterType = type;
            app.modelImporterPath = filePath;
            app.showModelImporter++;
        } else {
            app.modelImporterImg = filePath;
        }
    };

    // find by name in app.userModels
    function findModelByName(name) {
        if (app.userModels)
            for (var i = 0; i < app.userModels.length; i++) {
                if (app.userModels[i].name == name) {
                    return app.userModels[i];
                }
            }

        for (var i = 0; i < app.builtIn.length; i++) {
            if (app.builtIn[i].name == name) {
                return app.builtIn[i];
            }
        }
        return null;
    }

    function addRightClick() {
        for (var i of document.querySelectorAll(".model-item-new.user-model")) {
            i.oncontextmenu = function (e) {
                // console.log(e.target);
                e.preventDefault();

                var target = e.target;
                while (!target.classList.contains("model-item-new")) {
                    target = target.parentElement;
                }
                const rightmenu = document.getElementById("rightmenu");
                const rightclick = document.getElementById("rightclick");
                rightmenu.style.transform = "scaleY(1)";
                rightclick.style.display = "";
                rightmenu.style.top = e.clientY + "px";
                rightmenu.style.left = e.clientX + "px";
                rightclick.onclick = function () {
                    rightmenu.style.transform = "scaleY(0)";
                    rightclick.style.display = "none";
                };
                rightclick.oncontextmenu = rightclick.onclick;
                document.getElementById("btnopen").onclick = function () {
                    e.target.click();
                    rightclick.onclick();
                };
                document.getElementById("btndefault").onclick = function () {
                    app.selectModel = JSON.stringify(
                        findModelByName(target.querySelector("h2").innerText)
                    );
                    rightclick.onclick();
                };

                for(var obj of ["btnshow","btnremove","removeline1","removeline0"])
                    document.getElementById(obj).style.display = "";

                document.getElementById("btnremove").onclick = function () {
                    var modelName = target.querySelector("h2").innerText;
                    domBoom(target);
                    setTimeout(() => {
                        removeUserModels(modelName);
                    }, 1000);
                    rightclick.onclick();
                };

                document.getElementById("btnshow").onclick = function () {
                    var path = findModelByName(
                        target.querySelector("h2").innerText
                    ).path;
                    if (platform !== "darwin")
                        shell.showItemInFolder("file://" + path);
                    else
                        shell.openExternal(
                            "file://" + path.substr(0, path.lastIndexOf("/"))
                        );
                    rightclick.onclick();
                };
            };
        }

        for (var i of document.querySelectorAll(
            ".model-item-new.buildin-model"
        )) {
            i.oncontextmenu = function (e) {
                e.preventDefault();
                var target = e.target;
                while (!target.classList.contains("model-item-new")) {
                    target = target.parentElement;
                }
                const rightmenu = document.getElementById("rightmenu");
                const rightclick = document.getElementById("rightclick");
                rightmenu.style.transform = "scaleY(1)";
                rightclick.style.display = "";
                rightmenu.style.top = e.clientY + "px";
                rightmenu.style.left = e.clientX + "px";
                rightclick.onclick = function () {
                    rightmenu.style.transform = "scaleY(0)";
                    rightclick.style.display = "none";
                };
                rightclick.oncontextmenu = rightclick.onclick;
                document.getElementById("btnopen").onclick = function () {
                    e.target.click();
                    rightclick.onclick();
                };
                for(var obj of ["btnshow","btnremove","removeline1","removeline0"])
                    document.getElementById(obj).style.display = "none";

                document.getElementById("btndefault").onclick = function () {
                    app.selectModel = JSON.stringify(
                        findModelByName(target.querySelector("h2").innerText)
                    );
                    rightclick.onclick();
                };
            };
        }
    }

    addRightClick();

    window.refreshLocalModels = function () {
        const selectedBefore = (() => {
            try { return JSON.parse(app.selectModel || "{}").path; }
            catch (err) { return null; }
        })();
        app.builtIn = scanLocalVrmModels();
        if (app.builtIn.length) {
            const same = selectedBefore ? app.builtIn.find((m) => m.path === selectedBefore) : null;
            app.selectModel = JSON.stringify(same || app.builtIn[0]);
            localStorage.setItem("selectModel", app.selectModel);
        }
        setTimeout(async () => {
            addRightClick();
            try { mdui.mutation(); } catch (err) {}
            if (app.settings.ui.useNewModelUI) {
                for (var e of document.querySelectorAll(".my-img")) {
                    if (!e.src || e.src.includes("framework.html")) continue;
                    try {
                        var theme = await themeFromImage(e);
                        applyTheme(theme, { target: e.parentElement, dark: !!app.settings.ui.isDark });
                    } catch (err) {}
                }
            }
        }, 250);
    };

    window.addUserModels = async function () {
        var model = {
            name: app.modelImporterName,
            type: app.modelImporterType,
            picBg: app.modelImporterImg,
            path: app.modelImporterPath,
            accessories: {},
            binding: app.modelImporterType == "fbx" ? mixamorig : {},
        };
        addUserModels(model);
        app.userModels.push(model);
        app.showModelImporter = 0;
        setTimeout(async () => {
            addRightClick();
            for (var e of document.querySelectorAll(".my-img")) {
                if (e.src.includes("framework.html")) continue;
                var theme = await themeFromImage(e);
                applyTheme(theme, {
                    target: e.parentElement,
                    dark: darkMode,
                });
            }
        }, 500);
    };

    mdui.mutation();
} else {
    // todo
}

var isMocaping = false;

const iframeWindow = document.getElementById("foo").contentWindow;

// Bitninja Stage 3U: parent-to-render capture hotkey relay.
// The render iframe does not always own keyboard focus on KDE/Electron, so the
// parent Mocap page forwards OBS-framing keys to mocaprender/script.js.
const bitninjaParentCaptureKeys = new Set([
    "1", "2", "3", "0",
    "ArrowUp", "ArrowDown",
    "q", "Q", "e", "E", "r", "R",
]);

function bitninjaFocusMocapFrame() {
    const frame = document.getElementById("foo");
    if (!frame) return;
    try { frame.setAttribute("tabindex", "0"); } catch (err) {}
    setTimeout(() => {
        try { frame.focus(); } catch (err) {}
        try { frame.contentWindow && frame.contentWindow.focus(); } catch (err) {}
    }, 80);
}

function bitninjaRelayCaptureHotkey(event) {
    if (!isMocaping) return;
    if (!bitninjaParentCaptureKeys.has(event.key)) return;
    const frame = document.getElementById("foo");
    if (!frame || !frame.contentWindow) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

    const payload = {
        type: "bitninja-capture-key",
        key: event.key,
        shiftKey: !!event.shiftKey,
    };
    try {
        if (typeof frame.contentWindow.bitninjaHandleCaptureKey === "function") {
            frame.contentWindow.bitninjaHandleCaptureKey(payload);
        } else {
            frame.contentWindow.postMessage(payload, "*");
        }
    } catch (err) {
        try { frame.contentWindow.postMessage(payload, "*"); } catch (err2) {}
    }
    bitninjaFocusMocapFrame();
}

window.addEventListener("keydown", bitninjaRelayCaptureHotkey, true);
document.addEventListener("keydown", bitninjaRelayCaptureHotkey, true);

(function bitninjaInstallFrameFocusHook() {
    const frame = document.getElementById("foo");
    if (!frame || frame.dataset.bitninjaStage3UFocusHook === "1") return;
    frame.dataset.bitninjaStage3UFocusHook = "1";
    frame.setAttribute("tabindex", "0");
    frame.addEventListener("load", bitninjaFocusMocapFrame);
})();


ipcRenderer.on("sendRenderDataForward", (ev, data) => {
    if (iframeWindow.onMocapData) iframeWindow.onMocapData(data);
});

ipcRenderer.on("switch-tab", (ev, data) => {
    window.sysmocapApp.tab = data;
});


window.refreshLiveMocap = function () {
    if (!isMocaping) {
        alert("Mocap is not running yet. Start mocap first, then use Refresh Live Camera.");
        return;
    }
    localStorage.setItem("modelInfo", app.selectModel);
    localStorage.setItem("useCamera", app.videoSource);
    localStorage.setItem("cameraId", app.camera);
    localStorage.setItem("videoFile", app.videoPath[0]);
    const frame = document.getElementById("foo");
    frame.src = "about:blank";
    setTimeout(() => {
        frame.src = "../mocaprender/render.html";
        bitninjaFocusMocapFrame();
    }, 350);
};

window.startMocap = async function (e) {
    if (process.platform == "darwin" && app.videoSource == "camera")
        if (
            remote.systemPreferences.getMediaAccessStatus("camera") !==
            "granted"
        ) {
            if (!(await remote.systemPreferences.askForMediaAccess("camera"))) {
                alert("需要授予摄像头使用权限");
                return;
            }
        }
    if (e.innerHTML.indexOf(app.language.tabMocap.start) != -1) {
        isMocaping = true;
        if (!app.selectModel || app.selectModel === "{}") {
            alert("No VRM found. Put your .vrm file in the ./models folder, then restart or use Refresh Local VRM Library.");
            return;
        }
        localStorage.setItem("modelInfo", app.selectModel);
        localStorage.setItem("useCamera", app.videoSource);
        localStorage.setItem("cameraId", app.camera);
        localStorage.setItem("videoFile", app.videoPath[0]);

        if (window.sysmocapApp.settings.performance.useDescrertionProcess) {
            const win = remote.getCurrentWindow();
            const bw = win.getBrowserView();
            var winWidth = parseInt(win.getSize()[0]);
            bw.setBounds({
                x: parseInt(winWidth / 2),
                y: parseInt(
                    document.querySelector("#foo").getBoundingClientRect().y
                ),
                width: parseInt(winWidth / 2) - 20,
                height: parseInt(((winWidth - 40) * 10) / 32),
            });
            bw.webContents.loadFile("mocap/mocap.html");
            if (window.sysmocapApp.settings.dev.openDevToolsWhenMocap)
                bw.webContents.openDevTools({ mode: "detach" });
            document.getElementById("foo").src = "../render/render.html";
        } else {
            document.getElementById("foo").src = "../mocaprender/render.html";
            bitninjaFocusMocapFrame();
        }

        e.innerHTML =
            '<i class="mdui-icon material-icons">stop</i>' +
            app.language.tabMocap.stop;
    } else {
        isMocaping = false;
        if (window.sysmocapApp.settings.performance.useDescrertionProcess) {
            const win = remote.getCurrentWindow();
            const bw = win.getBrowserView();
            bw.setBounds({ x: 0, y: 0, width: 0, height: 0 });
            bw.webContents.loadURL("about:blank");
        }
        document.getElementById("foo").src = "about:blank";

        if (window.sysmocapApp.settings.forward.enableForwarding)
            ipcRenderer.send("stopWebServer");

        e.innerHTML =
            '<i class="mdui-icon material-icons">play_arrow</i>' +
            app.language.tabMocap.start;
    }
};

if (window.sysmocapApp.settings.performance.useDescrertionProcess)
    window.addEventListener(
        "resize",
        function () {
            if (!isMocaping) return;
            const win = remote.getCurrentWindow();
            const bw = win.getBrowserView();
            var winWidth = parseInt(win.getSize()[0]);
            bw.setBounds({
                x: parseInt(winWidth / 2),
                y: parseInt(
                    document.querySelector("#foo").getBoundingClientRect().y
                ),
                width: parseInt(winWidth / 2) - 20,
                height: parseInt(((winWidth - 40) * 10) / 32),
            });
        },
        false
    );

// Bitninja Lite: network update checks are disabled.
window.checkUpdate = () => {
    window.sysmocapApp.checkingUpdate = false;
    window.sysmocapApp.hasUpdate = null;
    window.sysmocapApp.isLatest = true;
};
window.openInGithub = () =>
    remote.shell.openExternal("https://github.com/xianfei/SysMocap");
window.openInIEEE = () =>
    remote.shell.openExternal("https://ieeexplore.ieee.org/document/9974484");

window.addEventListener('scroll',function(e){
    if(window.pageYOffset > 10){
        window.sysmocapApp.showLine = true
    }else{
        window.sysmocapApp.showLine = false
    }
  })