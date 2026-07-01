/**
 *  Video-based Motion Capture and 3D Model Render Part
 *
 *  A part of SysMocap, open sourced under Mozilla Public License 2.0
 *
 *  https://github.com/xianfei/SysMocap
 *
 *  xianfei 2022.3, last modified 2024.7
 */

// import setting utils
const globalSettings = window.parent.window.sysmocapApp.settings;
const liteSettings = globalSettings.lite || {}; // Stage 4 low-latency performance patch
const bitninjaRequestedTrackingMode = String(liteSettings.trackingMode || "pose_fast"); // Stage 6 pose-fast tracking engine
let bitninjaTrackingMode = bitninjaRequestedTrackingMode;
const bitninjaTrackerInputMode = String(liteSettings.trackerInputMode || "downsample"); // Stage 7 downsampled tracker input
const bitninjaTrackerInputWidth = liteNumber(liteSettings.trackerInputWidth, 192, 96, 640);
const bitninjaTrackerInputHeight = liteNumber(liteSettings.trackerInputHeight, 144, 72, 480);
const bitninjaPoseFastInternalSmoothing = liteSettings.poseFastInternalSmoothing === true;
function liteNumber(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}
const liteMotion = {
    rotationLerp: liteNumber(liteSettings.motionRotationLerp, 0.72, 0.02, 0.95),
    positionLerp: liteNumber(liteSettings.motionPositionLerp, 0.62, 0.02, 0.95),
    faceLerp: liteNumber(liteSettings.faceLerp, 0.35, 0.02, 0.95),
    lockHorizontal: liteSettings.lockHorizontal !== false,
    maxYawDeg: liteNumber(liteSettings.maxYawDeg, 60, 0, 90),
};
let captureTransform = {
    baseYaw: 0,
    yawDeg: liteNumber(localStorage.getItem("bitninja-capture-yaw"), 0, -180, 180),
    yOffset: liteNumber(localStorage.getItem("bitninja-capture-yoffset"), 0, -2, 2),
};

const { languages } = require("../utils/language.js");

var hipRotationOffset = 0.0

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

// set theme
document.body.setAttribute(
    "class",
    "mdui-theme-layout-auto mdui-theme-primary-" +
        globalSettings.ui.themeColor +
        " mdui-theme-accent-" +
        globalSettings.ui.themeColor
);

// import mocap web server
var my_server = null;
var ipcRenderer = null;
if (globalSettings.forward.enableForwarding)
    ipcRenderer = require("electron").ipcRenderer;
// my_server = require("../webserv/server.js");

// import Helper Functions from Kalidokit
const remap = Kalidokit.Utils.remap;
const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;

// VRM object
let currentVrm = null;

// Whether mediapipe ready
var started = false;
let bitninjaTelemetry = null; // Stage 5 latency doctor

// renderer
const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: globalSettings.output.antialias,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
    stencil: false,
});
renderer.setSize(
    document.querySelector("#model").clientWidth,
    (document.querySelector("#model").clientWidth / 16) * 9
);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, globalSettings.lite?.pixelRatio || 1));
document.querySelector("#model").appendChild(renderer.domElement);

window.addEventListener(
    "resize",
    function () {
        orbitCamera.aspect = 16 / 9;
        orbitCamera.updateProjectionMatrix();
        renderer.setSize(
            document.querySelector("#model").clientWidth,
            (document.querySelector("#model").clientWidth / 16) * 9
        );
    },
    false
);

// camera
const orbitCamera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 1000);
orbitCamera.position.set(0.0, 1.4, 0.7);

// controls
const orbitControls = new OrbitControls(orbitCamera, renderer.domElement);
orbitControls.screenSpacePanning = true;
// Bitninja Lite: freeze the capture camera. OBS framing is controlled by our own hotkeys.
orbitControls.enablePan = false;
orbitControls.enableRotate = false;
orbitControls.enableZoom = false;
orbitControls.enableKeys = false;
orbitControls.keyPanSpeed = 0;
orbitControls.target.set(0.0, 1.4, 0.0);
orbitControls.update();
orbitControls.enabled = false;
["pointerdown", "pointermove", "pointerup", "wheel", "dblclick"].forEach((evtName) => {
    renderer.domElement.addEventListener(evtName, (event) => {
        // Prevent old drag-to-move/orbit behavior from hiding the model during OBS capture.
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    }, true);
});

// scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(globalSettings.lite?.obsBgColor || globalSettings.output.bgColor || "#3B2364");
document.body.style.backgroundColor = globalSettings.lite?.obsBgColor || globalSettings.output.bgColor || "#3B2364";

// Bitninja Lite: all manual OBS framing is applied to this stable parent group.
// The VRM scene keeps only its base orientation; root moves up/down only. Yaw is added to humanoid bones.
const bitninjaCaptureRoot = new THREE.Group();
bitninjaCaptureRoot.name = "BitninjaCaptureRoot";
scene.add(bitninjaCaptureRoot);

function bitninjaApplyManualRoot() {
    // Stage 3V: root handles only stable OBS-plane translation.
    // Yaw is injected into humanoid bones below so pose Z-offsets do not swing the model sideways.
    bitninjaCaptureRoot.rotation.y = 0;
    bitninjaCaptureRoot.position.x = 0;
    bitninjaCaptureRoot.position.y = captureTransform.yOffset || 0;
    bitninjaCaptureRoot.position.z = 0;
}

function bitninjaResizeRenderer() {
    const host = document.querySelector("#model");
    if (!host) return;
    const width = Math.max(320, Math.floor(host.clientWidth || renderer.domElement.clientWidth || 960));
    const height = Math.max(180, Math.floor((width / 16) * 9));
    orbitCamera.aspect = 16 / 9;
    orbitCamera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function bitninjaScheduleResize() {
    bitninjaResizeRenderer();
    requestAnimationFrame(bitninjaResizeRenderer);
    [60, 160, 360, 800, 1600].forEach((ms) => setTimeout(bitninjaResizeRenderer, ms));
}
window.addEventListener("resize", bitninjaScheduleResize, false);
document.addEventListener("fullscreenchange", bitninjaScheduleResize, false);
if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(bitninjaScheduleResize).observe(document.querySelector("#model"));
}
setTimeout(bitninjaScheduleResize, 0);

// stats

const statsContainer = document.getElementById("status");
const bitninjaStatsEnabled = !!globalSettings.output.showFPS;
let stats = null;
let stats2 = null;

if (!bitninjaStatsEnabled) {
    statsContainer.style.display = "none";
} else {
    stats = new Stats();
    stats.domElement.style.position = "absolute";
    stats.domElement.style.top = "26px";
    stats.domElement.style.left = "10px";
    statsContainer.appendChild(stats.dom);

    stats2 = new Stats();
    stats2.domElement.style.position = "absolute";
    stats2.domElement.style.top = "26px";
    stats2.domElement.style.left = "100px";
    statsContainer.appendChild(stats2.dom);
}

// Main Render Loop
const clock = new THREE.Clock();
const bitninjaRenderFpsCap = liteNumber(liteSettings.renderFps, 30, 15, 60);
const bitninjaRenderIntervalMs = 1000 / bitninjaRenderFpsCap;
let bitninjaLastRenderAt = 0;

var isRecordingStarted = false;

function animate(now = performance.now()) {
    requestAnimationFrame(animate);

    // Stage 4: cap render work so OBS has GPU/CPU headroom.
    if (now - bitninjaLastRenderAt < bitninjaRenderIntervalMs) return;
    bitninjaLastRenderAt = now;

    if (bitninjaStatsEnabled && stats) stats.update();

    if (currentVrm) {
        if (currentVrm.scene) {
            currentVrm.scene.rotation.y = captureTransform.baseYaw;
            currentVrm.scene.position.x = 0;
            currentVrm.scene.position.y = 0;
            currentVrm.scene.position.z = 0;
            bitninjaApplyManualRoot();
        }
        // Update model physics only on rendered frames to reduce GPU/CPU load.
        currentVrm.update(clock.getDelta());
    }
    renderer.render(scene, orbitCamera);

    if(isRecordingStarted)html2canvas(elementToRecord).then(function (canvas) {
        context.clearRect(0, 0, canvas2d.width, canvas2d.height);
        context.drawImage(canvas, 0, 0, canvas2d.width, canvas2d.height);
    });
}
animate();

var modelObj = JSON.parse(localStorage.getItem("modelInfo"));
var modelPath = modelObj.path;

var fileType = modelPath
    .substring(modelPath.lastIndexOf(".") + 1)
    .toLowerCase();

var skeletonHelper = null;

// init server
if (ipcRenderer)
    ipcRenderer.send(
        "startWebServer",
        parseInt(globalSettings.forward.port),
        JSON.stringify(modelObj),
        globalSettings.forward.supportForWebXR
    );
// my_server.startServer(parseInt(globalSettings.forward.port), modelPath);

// light
var light0 = new THREE.DirectionalLight(0xffffff, Math.PI);
light0.position.set(1.0, 1.0, 1.0).normalize();
scene.add(light0);

if (fileType !== "vrm") {
    const light = new THREE.AmbientLight(0xffffff, 0.8);
    light.position.set(10.0, 10.0, -10.0).normalize();
    scene.add(light);
    var light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(0, 3, -2);
    light2.castShadow = true;
    scene.add(light2);
}


var initRotation = {};

// Import model from URL, add your own model here
var loader = null;
if (fileType == "fbx") {
    loader = new FBXLoader();
} else {
    loader = new GLTFLoader();
    loader.register((parser) => {
        return new VRMLoaderPlugin(parser);
    });
}
// Import Character
loader.crossOrigin = "anonymous";
loader.load(
    modelPath,

    (gltf) => {
        var model = null;
        if (fileType == "fbx") {
            model = gltf;
            gltf.scale.set(0.01, 0.01, 0.01);
        } else {
            model = gltf.scene;
        }

        if (fileType == "vrm") {
            // calling these functions greatly improves the performance
            VRMUtils.removeUnnecessaryVertices(gltf.scene);
            VRMUtils.removeUnnecessaryJoints(gltf.scene);
            const vrm = gltf.userData.vrm;
            bitninjaCaptureRoot.add(vrm.scene);
            captureTransform.baseYaw = 0;
            if (vrm.meta.metaVersion === "0") {
                captureTransform.baseYaw = Math.PI; // Rotate model 180deg to face camera
                vrm.scene.rotation.y = captureTransform.baseYaw;
            }
            currentVrm = vrm;
            window.currentVrm = currentVrm;
            bitninjaModelLoaded = true;
            bitninjaApplyManualRoot();
            bitninjaScheduleResize();
            bitninjaSetLoadingText("Model loaded. Starting camera tracking...");
        } else {
            skeletonHelper = new THREE.SkeletonHelper(model);
            skeletonHelper.visible = false;
            scene.add(skeletonHelper);
            // for glb files
            scene.add(model);
            model.rotation.y = Math.PI; // Rotate model 180deg to face camera
            var rot = {
                x: 0,
                y: 0,
                z: -3.1129221599796764,
            };
            for (var i in rot) orbitCamera.rotation[i] = rot[i];
            var pos = {
                x: -0,
                y: 0.5922529898344698,
                z: -1.4448572419883419,
            };
            for (var i in pos) orbitCamera.position[i] = pos[i];

            orbitControls.target.y = 0.5;
            orbitControls.update();

            if (modelObj.cameraTarget) {
                orbitControls.target.set(
                    modelObj.cameraTarget.x,
                    modelObj.cameraTarget.y,
                    modelObj.cameraTarget.z
                );
                orbitControls.update();
            }
            if (modelObj.cameraPosition) {
                for (var i in modelObj.cameraPosition)
                    orbitCamera.position[i] = modelObj.cameraPosition[i];
            }
            if (modelObj.cameraRotation) {
                for (var i in modelObj.cameraRotation)
                    orbitCamera.rotation[i] = modelObj.cameraRotation[i];
            }

            if (modelObj.init) {
                initRotation = modelObj.init;
            }
            bitninjaModelLoaded = true;
            bitninjaApplyManualRoot();
            bitninjaScheduleResize();
            bitninjaSetLoadingText("Model loaded. Starting camera tracking...");
        }
    },

    (progress) =>
        console.log(
            "Loading model...",
            100.0 * (progress.loaded / progress.total),
            "%"
        ),

    (error) => console.error(error)
);

function capitalizeFirstLetterToLowerCase(str) {
    if (str.length === 0) {
        return str;
    }
    return str.charAt(0).toLowerCase() + str.slice(1);
}

// Animate Rotation Helper function
const rigRotation = (
    name,
    rotation = { x: 0, y: 0, z: 0 },
    dampener = 1,
    lerpAmount = liteMotion.rotationLerp
) => {
    if (currentVrm) {
        const Part = currentVrm.humanoid.getNormalizedBoneNode(
            capitalizeFirstLetterToLowerCase(name)
        );
        if (!Part) {
            return;
        }
        let euler = new THREE.Euler(
            (currentVrm.meta.metaVersion === "1" ? -1 : 1) * rotation.x * dampener,
            rotation.y * dampener,
            (currentVrm.meta.metaVersion === "1" ? -1 : 1) *
                rotation.z *
                dampener,
            rotation.rotationOrder || "XYZ"
        );
        let quaternion = new THREE.Quaternion().setFromEuler(euler);
        Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
    } else if (skeletonHelper) {
        var skname = modelObj.binding[name].name; // convert name with model json binding info
        if (skname == "None") {
            return;
        }
        // find bone in bones by name
        var b = skeletonHelper.bones.find((bone) => bone.name == skname);

        if (b) {
            if (!initRotation[name]) {
                initRotation[name] = {
                    x: b.rotation.x,
                    y: b.rotation.y,
                    z: b.rotation.z,
                };
            }
            const bindingFunc = modelObj.binding[name].func;
            const order = modelObj.binding[name].order?.toUpperCase();
            const x = rotation.x * dampener;
            const y = rotation.y * dampener;
            const z = rotation.z * dampener;

            // console.log("rotation.rotationOrder ",rotation.rotationOrder )

            let euler = new THREE.Euler(
                initRotation[name].x + eval(bindingFunc.fx),
                initRotation[name].y + eval(bindingFunc.fy),
                initRotation[name].z + eval(bindingFunc.fz),
                order || rotation.rotationOrder || "XYZ"
            );
            let quaternion = new THREE.Quaternion().setFromEuler(euler);
            b.quaternion.slerp(quaternion, lerpAmount); // interpolate
        } else {
            console.log("Can not found bone " + name);
        }
    }
};

// Animate Position Helper Function
const rigPosition = (
    name,
    position = { x: 0, y: 0, z: 0 },
    dampener = 1,
    lerpAmount = liteMotion.positionLerp
) => {
    if (currentVrm) {
        const Part = currentVrm.humanoid.getNormalizedBoneNode(
            capitalizeFirstLetterToLowerCase(name)
        );
        if (!Part) {
            return;
        }
        let vector = new THREE.Vector3(
            position.x * dampener,
            position.y * dampener,
            position.z * dampener
        );
        Part.position.lerp(vector, lerpAmount); // interpolate
    } else if (skeletonHelper) {
        name = modelObj.binding[name].name; // convert name with model json binding info
        // find bone in bones by name
        var b = skeletonHelper.bones.find((bone) => bone.name == name);
        if (b) {
            if (fileType == "fbx") {
                dampener *= 100;
            }
            let vector = new THREE.Vector3(
                position.x * dampener,
                position.y * dampener,
                -position.z * dampener
            );
            if (fileType == "fbx") {
                vector.y -= 1.2 * dampener;
            }
            b.position.lerp(vector, lerpAmount); // interpolate
        } else {
            console.log("Can not found bone " + name);
        }
    }
};

let oldLookTarget = new THREE.Euler();
const rigFace = (riggedFace) => {
    if (!currentVrm) {
        return; // face motion only support VRM Now
    }

    // Blendshapes and Preset Name Schema
    const Blendshape = currentVrm.expressionManager;
    const PresetName = {
        A: "aa",
        Angry: "angry",
        Blink: "blink",
        BlinkL: "blinkLeft",
        BlinkR: "blinkRight",
        E: "ee",
        Fun: "happy",
        I: "ih",
        Joy: "relaxed",
        Lookdown: "lookDown",
        Lookleft: "lookLeft",
        Lookright: "lookRight",
        Lookup: "lookUp",
        Neutral: "neutral",
        O: "oh",
        Sorrow: "sad",
        U: "ou",
        Unknown: "unknown",
    };

    // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
    // for VRM, 1 is closed, 0 is open.
    riggedFace.eye.l = lerp(
        clamp(1 - riggedFace.eye.l, 0, 1),
        Blendshape.getValue(PresetName.Blink),
        0.4
    );
    riggedFace.eye.r = lerp(
        clamp(1 - riggedFace.eye.r, 0, 1),
        Blendshape.getValue(PresetName.Blink),
        0.4
    );
    // riggedFace.eye.l = Kalidokit.Face.stabilizeBlink(
    //     {l:riggedFace.eye.l,r:riggedFace.eye.l},
    //     riggedFace.head.y
    // ).l;
    // riggedFace.eye.r = Kalidokit.Face.stabilizeBlink(
    //     {l:riggedFace.eye.r,r:riggedFace.eye.r},
    //     riggedFace.head.y
    // ).r;
    riggedFace.eye.l /= 0.8;
    riggedFace.eye.r /= 0.8;
    Blendshape.setValue(PresetName.BlinkL, riggedFace.eye.l);
    Blendshape.setValue(PresetName.BlinkR, riggedFace.eye.r);

    // Interpolate and set mouth blendshapes
    Blendshape.setValue(
        PresetName.I,
        lerp(
            riggedFace.mouth.shape.I / 0.8,
            Blendshape.getValue(PresetName.I),
            liteMotion.faceLerp
        )
    );
    Blendshape.setValue(
        PresetName.A,
        lerp(
            riggedFace.mouth.shape.A / 0.8,
            Blendshape.getValue(PresetName.A),
            liteMotion.faceLerp
        )
    );
    Blendshape.setValue(
        PresetName.E,
        lerp(
            riggedFace.mouth.shape.E / 0.8,
            Blendshape.getValue(PresetName.E),
            liteMotion.faceLerp
        )
    );
    Blendshape.setValue(
        PresetName.O,
        lerp(
            riggedFace.mouth.shape.O / 0.8,
            Blendshape.getValue(PresetName.O),
            liteMotion.faceLerp
        )
    );
    Blendshape.setValue(
        PresetName.U,
        lerp(
            riggedFace.mouth.shape.U / 0.8,
            Blendshape.getValue(PresetName.U),
            liteMotion.faceLerp
        )
    );

    //PUPILS
    //interpolate pupil and keep a copy of the value
    let lookTarget = new THREE.Euler(
        lerp(oldLookTarget.x, riggedFace.pupil.y, 0.4),
        lerp(oldLookTarget.y, riggedFace.pupil.x, 0.4),
        0,
        "XYZ"
    );
    oldLookTarget.copy(lookTarget);
    currentVrm.lookAt.applier.applyYawPitch(lookTarget.y, lookTarget.x);
};

var positionOffset = {
    x: 0,
    y: 1,
    z: 0,
};

/* VRM Character Animator */
const animateVRM = (vrm, results) => {
    if (!vrm && !skeletonHelper) {
        return;
    }
    // Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
    let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;

    const faceLandmarks = results.faceLandmarks;
    // Pose 3D Landmarks are with respect to Hip distance in meters
    const pose3DLandmarks = results.za || results.poseWorldLandmarks;
    // Pose 2D landmarks are with respect to videoWidth and videoHeight
    const pose2DLandmarks = results.poseLandmarks;
    // Be careful, hand landmarks may be reversed
    const leftHandLandmarks = results.rightHandLandmarks;
    const rightHandLandmarks = results.leftHandLandmarks;

    if (faceLandmarks) {
        riggedFace = Kalidokit.Face.solve(faceLandmarks, {
            runtime: "mediapipe",
            video: videoElement,
        });
    }

    if (pose2DLandmarks && pose3DLandmarks) {
        riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
            runtime: "mediapipe",
            video: videoElement,
        });
    }

    if (leftHandLandmarks) {
        riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, "Left");
    }

    if (rightHandLandmarks && fileType == "vrm") {
        riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");
    }

    if (ipcRenderer)
        ipcRenderer.send("sendBoradcast", {
            type: "xf-sysmocap-data",
            riggedPose: riggedPose,
            riggedLeftHand: riggedLeftHand,
            riggedRightHand: riggedRightHand,
            riggedFace: riggedFace,
        });

    // Animate Face
    if (faceLandmarks) {
        const bitninjaManualYawRad = THREE.MathUtils.degToRad(captureTransform.yawDeg || 0);
        rigRotation("Neck", {
            x: riggedFace.head.x,
            y: riggedFace.head.y + (bitninjaManualYawRad / 0.7),
            z: riggedFace.head.z,
            rotationOrder: riggedFace.head.rotationOrder,
        }, 0.7);
        if (fileType == "vrm") rigFace(riggedFace);
    }

    // Animate Pose
    if (pose2DLandmarks && pose3DLandmarks) {
        const bitninjaManualYawRad = THREE.MathUtils.degToRad(captureTransform.yawDeg || 0);
        rigRotation("Hips", {
            x: riggedPose.Hips.rotation.x,
            y: riggedPose.Hips.rotation.y + (bitninjaManualYawRad / 0.7),
            z: riggedPose.Hips.rotation.z + hipRotationOffset,
        }, 0.7, liteMotion.rotationLerp);
        rigPosition(
            "Hips",
            {
                x: (liteMotion.lockHorizontal ? 0 : riggedPose.Hips.position.x) + positionOffset.x, // Lite lock prevents OBS-plane drift
                y: riggedPose.Hips.position.y + positionOffset.y, // Add a bit of height; manual up/down is applied to the VRM scene
                z: -riggedPose.Hips.position.z + positionOffset.z, // Reverse direction
            },
            1,
            liteMotion.positionLerp
        );

        rigRotation("Chest", riggedPose.Chest, 0.25, liteMotion.rotationLerp);
        rigRotation("Spine", riggedPose.Spine, 0.45, liteMotion.rotationLerp);

        rigRotation("RightUpperArm", riggedPose.RightUpperArm);
        rigRotation("RightLowerArm", riggedPose.RightLowerArm);
        rigRotation("LeftUpperArm", riggedPose.LeftUpperArm);
        rigRotation("LeftLowerArm", riggedPose.LeftLowerArm);

        rigRotation("LeftUpperLeg", riggedPose.LeftUpperLeg);
        rigRotation("LeftLowerLeg", riggedPose.LeftLowerLeg);
        rigRotation("RightUpperLeg", riggedPose.RightUpperLeg);
        rigRotation("RightLowerLeg", riggedPose.RightLowerLeg);
    }

    // Animate Hands
    if (leftHandLandmarks && fileType == "vrm") {
        rigRotation("LeftHand", {
            // Combine pose rotation Z and hand rotation X Y
            z: riggedPose.LeftHand.z,
            y: riggedLeftHand.LeftWrist.y,
            x: riggedLeftHand.LeftWrist.x,
        });
        rigRotation("LeftRingProximal", riggedLeftHand.LeftRingProximal);
        rigRotation(
            "LeftRingIntermediate",
            riggedLeftHand.LeftRingIntermediate
        );
        rigRotation("LeftRingDistal", riggedLeftHand.LeftRingDistal);
        rigRotation("LeftIndexProximal", riggedLeftHand.LeftIndexProximal);
        rigRotation(
            "LeftIndexIntermediate",
            riggedLeftHand.LeftIndexIntermediate
        );
        rigRotation("LeftIndexDistal", riggedLeftHand.LeftIndexDistal);
        rigRotation("LeftMiddleProximal", riggedLeftHand.LeftMiddleProximal);
        rigRotation(
            "LeftMiddleIntermediate",
            riggedLeftHand.LeftMiddleIntermediate
        );
        rigRotation("LeftMiddleDistal", riggedLeftHand.LeftMiddleDistal);
        rigRotation("LeftThumbProximal", riggedLeftHand.LeftThumbProximal);
        rigRotation(
            "LeftThumbIntermediate",
            riggedLeftHand.LeftThumbIntermediate
        );
        rigRotation("LeftThumbDistal", riggedLeftHand.LeftThumbDistal);
        rigRotation("LeftLittleProximal", riggedLeftHand.LeftLittleProximal);
        rigRotation(
            "LeftLittleIntermediate",
            riggedLeftHand.LeftLittleIntermediate
        );
        rigRotation("LeftLittleDistal", riggedLeftHand.LeftLittleDistal);
    }
    if (rightHandLandmarks && fileType == "vrm") {
        // riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");
        rigRotation("RightHand", {
            // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
            z: riggedPose.RightHand.z,
            y: riggedRightHand.RightWrist.y,
            x: riggedRightHand.RightWrist.x,
        });
        rigRotation("RightRingProximal", riggedRightHand.RightRingProximal);
        rigRotation(
            "RightRingIntermediate",
            riggedRightHand.RightRingIntermediate
        );
        rigRotation("RightRingDistal", riggedRightHand.RightRingDistal);
        rigRotation("RightIndexProximal", riggedRightHand.RightIndexProximal);
        rigRotation(
            "RightIndexIntermediate",
            riggedRightHand.RightIndexIntermediate
        );
        rigRotation("RightIndexDistal", riggedRightHand.RightIndexDistal);
        rigRotation("RightMiddleProximal", riggedRightHand.RightMiddleProximal);
        rigRotation(
            "RightMiddleIntermediate",
            riggedRightHand.RightMiddleIntermediate
        );
        rigRotation("RightMiddleDistal", riggedRightHand.RightMiddleDistal);
        rigRotation("RightThumbProximal", riggedRightHand.RightThumbProximal);
        rigRotation(
            "RightThumbIntermediate",
            riggedRightHand.RightThumbIntermediate
        );
        rigRotation("RightThumbDistal", riggedRightHand.RightThumbDistal);
        rigRotation("RightLittleProximal", riggedRightHand.RightLittleProximal);
        rigRotation(
            "RightLittleIntermediate",
            riggedRightHand.RightLittleIntermediate
        );
        rigRotation("RightLittleDistal", riggedRightHand.RightLittleDistal);
    }

    // if (my_server)
    //     my_server.sendBoradcast(
    //         JSON.stringify({
    //             type: "xf-sysmocap-data",
    //             riggedPose: riggedPose,
    //             riggedLeftHand: riggedLeftHand,
    //             riggedRightHand: riggedRightHand,
    //             riggedFace: riggedFace,
    //         })
    //     );
};

let videoElement = document.querySelector(".input_video"),
    guideCanvas = document.querySelector("canvas.guides");
if (videoElement) {
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.dataset.bitninjaVideoOptimized = "true";
}

// Stage 7: downsample tracker input before MediaPipe.
// This avoids sending the full camera/video element directly into the tracker and can reduce GPU readback/upload stalls.
const bitninjaTrackerCanvas = document.createElement("canvas");
const bitninjaTrackerCtx = bitninjaTrackerCanvas.getContext("2d", { alpha: false, desynchronized: true });
bitninjaTrackerCanvas.width = bitninjaTrackerInputWidth;
bitninjaTrackerCanvas.height = bitninjaTrackerInputHeight;
if (bitninjaTrackerCtx) {
    bitninjaTrackerCtx.imageSmoothingEnabled = true;
    bitninjaTrackerCtx.imageSmoothingQuality = "low";
}
function bitninjaGetTrackerImage() {
    if (bitninjaTrackerInputMode !== "downsample" || !bitninjaTrackerCtx || !videoElement) return videoElement;
    if (bitninjaTrackerCanvas.width !== bitninjaTrackerInputWidth) bitninjaTrackerCanvas.width = bitninjaTrackerInputWidth;
    if (bitninjaTrackerCanvas.height !== bitninjaTrackerInputHeight) bitninjaTrackerCanvas.height = bitninjaTrackerInputHeight;
    try {
        bitninjaTrackerCtx.drawImage(videoElement, 0, 0, bitninjaTrackerInputWidth, bitninjaTrackerInputHeight);
        return bitninjaTrackerCanvas;
    } catch (err) {
        if (bitninjaTelemetry) bitninjaTelemetry.canvasFallbacks = (bitninjaTelemetry.canvasFallbacks || 0) + 1;
        return videoElement;
    }
}

function bitninjaSetLoadingText(message) {
    const loading = document.getElementById("loading");
    if (!loading) return;
    loading.textContent = message;
}
function bitninjaClearLoading() {
    const loading = document.getElementById("loading");
    if (loading) loading.remove();
}
let bitninjaModelLoaded = false;
setTimeout(() => {
    if (!started && bitninjaModelLoaded) {
        bitninjaSetLoadingText("Model loaded. Waiting for first camera tracking frame...");
    }
}, 2500);
setTimeout(() => {
    if (!started && bitninjaModelLoaded) {
        // Show the model even if MediaPipe has not produced a first result yet.
        // Tracking will still start as soon as frames arrive.
        bitninjaClearLoading();
    }
}, 8000);

const onResults = (results) => {
    if (bitninjaTelemetry) {
        bitninjaTelemetry.results += 1;
        bitninjaTelemetry.lastResultAt = performance.now();
    }
    if (bitninjaStatsEnabled && stats2) stats2.update();
    // Draw landmark guides
    if (globalSettings.preview.showSketelonOnInput) drawResults(results);
    // Animate model
    animateVRM(currentVrm, results);
    if (!started) {
        bitninjaClearLoading();
        if (localStorage.getItem("useCamera") == "file") videoElement.play();
        started = true;
    }
};

// Stage 6: selectable tracking engine.
// Pose Fast is far lighter than Holistic Full because it skips face mesh + hand/finger models.
// It still drives body, torso, arms, and wrists through Kalidokit Pose.
const bitninjaPoseAvailable = typeof Pose !== "undefined";
const bitninjaUsePoseFast = bitninjaRequestedTrackingMode === "pose_fast" && bitninjaPoseAvailable;
if (bitninjaRequestedTrackingMode === "pose_fast" && !bitninjaPoseAvailable) {
    console.warn("Bitninja Pose Fast requested but @mediapipe/pose is not installed/loaded; falling back to Holistic Full.");
    bitninjaTrackingMode = "holistic_full";
}

const bitninjaTracker = bitninjaUsePoseFast
    ? new Pose({
          locateFile: (file) => {
              if (typeof require != "undefined")
                  return __dirname + `/../node_modules/@mediapipe/pose/${file}`;
              else return `../node_modules/@mediapipe/pose/${file}`;
          },
      })
    : new Holistic({
          locateFile: (file) => {
              if (typeof require != "undefined")
                  return __dirname + `/../node_modules/@mediapipe/holistic/${file}`;
              else return `../node_modules/@mediapipe/holistic/${file}`;
          },
      });

if (bitninjaUsePoseFast) {
    bitninjaTrackingMode = "pose_fast";
    bitninjaTracker.setOptions({
        modelComplexity: parseInt(globalSettings.mediapipe.modelComplexity),
        smoothLandmarks: bitninjaPoseFastInternalSmoothing,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: parseFloat(globalSettings.mediapipe.minDetectionConfidence),
        minTrackingConfidence: parseFloat(globalSettings.mediapipe.minTrackingConfidence),
    });
} else {
    bitninjaTrackingMode = "holistic_full";
    bitninjaTracker.setOptions({
        modelComplexity: parseInt(globalSettings.mediapipe.modelComplexity),
        smoothLandmarks: globalSettings.mediapipe.smoothLandmarks,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: parseFloat(globalSettings.mediapipe.minDetectionConfidence),
        minTrackingConfidence: parseFloat(globalSettings.mediapipe.minTrackingConfidence),
        refineFaceLandmarks: globalSettings.mediapipe.refineFaceLandmarks,
    });
}
// Pass tracker a callback function
bitninjaTracker.onResults(onResults);

const drawResults = (results) => {
    guideCanvas.width = videoElement.videoWidth;
    guideCanvas.height = videoElement.videoHeight;
    let canvasCtx = guideCanvas.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    // Use `Mediapipe` drawing functions
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: "#00cff7",
        lineWidth: 4,
    });
    drawLandmarks(canvasCtx, results.poseLandmarks, {
        color: "#ff0364",
        lineWidth: 2,
    });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
        color: "#C0C0C070",
        lineWidth: 1,
    });
    if (results.faceLandmarks && results.faceLandmarks.length === 478) {
        //draw pupils
        drawLandmarks(
            canvasCtx,
            [results.faceLandmarks[468], results.faceLandmarks[468 + 5]],
            {
                color: "#ffe603",
                lineWidth: 2,
            }
        );
    }
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
        color: "#eb1064",
        lineWidth: 5,
    });
    drawLandmarks(canvasCtx, results.leftHandLandmarks, {
        color: "#00cff7",
        lineWidth: 2,
    });
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
        color: "#22c3e3",
        lineWidth: 5,
    });
    drawLandmarks(canvasCtx, results.rightHandLandmarks, {
        color: "#ff0364",
        lineWidth: 2,
    });
};

// Latest-frame-wins MediaPipe pump + Stage 5/6/7/8/8R/8S latency doctor.
// If delay is still tens of seconds, the bottleneck is inside Holistic inference/GPU setup,
// not OBS capture or VRM rendering. Press L in the mocap window to toggle the live stats overlay.
const targetMocapFps = Number(globalSettings.lite?.targetFps || 12);
const mocapFrameIntervalMs = Math.max(1, 1000 / targetMocapFps);
let mocapBusy = false;
let lastMocapFrameAt = 0;

bitninjaTelemetry = {
    sent: 0,
    results: 0,
    busyDrops: 0,
    notReadyDrops: 0,
    errors: 0,
    slow: 0,
    canvasFallbacks: 0,
    lastInferMs: 0,
    maxInferMs: 0,
    lastResultAt: 0,
    lastSendAt: 0,
    busySince: 0,
    overlayVisible: localStorage.getItem("bitninja-perf-overlay") === "1",
};

function bitninjaEnsurePerfOverlay() {
    let overlay = document.getElementById("bitninja-perf-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "bitninja-perf-overlay";
    overlay.style.cssText = [
        "position:fixed",
        "left:12px",
        "top:12px",
        "z-index:1200",
        "padding:8px 10px",
        "border-radius:10px",
        "background:rgba(0,0,0,0.48)",
        "color:rgba(255,255,255,0.88)",
        "font:12px/1.35 monospace",
        "white-space:pre",
        "pointer-events:none",
        "display:none",
    ].join(";");
    document.body.appendChild(overlay);
    return overlay;
}

function bitninjaSetPerfOverlayVisible(visible) {
    bitninjaTelemetry.overlayVisible = !!visible;
    localStorage.setItem("bitninja-perf-overlay", visible ? "1" : "0");
    const overlay = bitninjaEnsurePerfOverlay();
    overlay.style.display = visible ? "block" : "none";
    bitninjaUpdatePerfOverlay();
}

function bitninjaUpdatePerfOverlay() {
    if (!bitninjaTelemetry) return;
    const overlay = bitninjaEnsurePerfOverlay();
    if (!bitninjaTelemetry.overlayVisible) {
        overlay.style.display = "none";
        return;
    }
    const now = performance.now();
    const resultAge = bitninjaTelemetry.lastResultAt ? Math.round(now - bitninjaTelemetry.lastResultAt) : "n/a";
    const busyAge = mocapBusy && bitninjaTelemetry.busySince ? Math.round(now - bitninjaTelemetry.busySince) : 0;
    const videoInfo = videoElement
        ? `${videoElement.videoWidth || 0}x${videoElement.videoHeight || 0} ready:${videoElement.readyState}`
        : "no video";
    overlay.style.display = "block";
    overlay.textContent = [
        "Bitninja Mod1L Latency Doctor",
        `mode: ${bitninjaTrackingMode}` ,
        `target mocap/render: ${targetMocapFps}/${bitninjaRenderFpsCap} fps`,
        `video: ${videoInfo}`,
        `tracker input: ${bitninjaTrackerInputMode === "downsample" ? ("canvas " + bitninjaTrackerInputWidth + "x" + bitninjaTrackerInputHeight) : "direct video"}`,
        `pose smoothing: ${bitninjaUsePoseFast ? (bitninjaPoseFastInternalSmoothing ? "internal on" : "internal off") : "holistic"}`,
        `preset: ${globalSettings.lite?.activePerfPreset || (bitninjaUsePoseFast ? "OBS Fast/Balanced" : "Face/Hands Test")}`,
        `sent/results: ${bitninjaTelemetry.sent}/${bitninjaTelemetry.results}`,
        `last inference: ${Math.round(bitninjaTelemetry.lastInferMs)} ms`,
        `max inference:  ${Math.round(bitninjaTelemetry.maxInferMs)} ms`,
        `result age:     ${resultAge} ms`,
        `busy:           ${mocapBusy ? "yes " + busyAge + " ms" : "no"}`,
        `busy drops:     ${bitninjaTelemetry.busyDrops}`,
        `not-ready drops:${bitninjaTelemetry.notReadyDrops}`,
        `canvas fallback:${bitninjaTelemetry.canvasFallbacks || 0}`,
        `slow/errors:    ${bitninjaTelemetry.slow}/${bitninjaTelemetry.errors}`,
        "L toggles stats overlay",
    ].join("\n");
}

setInterval(() => {
    bitninjaUpdatePerfOverlay();
    if (bitninjaTelemetry && bitninjaTelemetry.overlayVisible) {
        console.log(
            `[Bitninja Mod1L ${bitninjaTrackingMode}/${bitninjaTrackerInputMode}] lastInfer=${Math.round(bitninjaTelemetry.lastInferMs)}ms ` +
            `maxInfer=${Math.round(bitninjaTelemetry.maxInferMs)}ms ` +
            `sent=${bitninjaTelemetry.sent} results=${bitninjaTelemetry.results} ` +
            `busyDrops=${bitninjaTelemetry.busyDrops} errors=${bitninjaTelemetry.errors}`
        );
    }
}, 1000);

async function maybeSendLatestFrameToHolistic() {
    const now = performance.now();
    if (mocapBusy) {
        bitninjaTelemetry.busyDrops += 1;
        return;
    }
    if (now - lastMocapFrameAt < mocapFrameIntervalMs) return;
    if (!videoElement || videoElement.readyState < 2 || !videoElement.videoWidth || !videoElement.videoHeight) {
        bitninjaTelemetry.notReadyDrops += 1;
        return;
    }

    mocapBusy = true;
    lastMocapFrameAt = now;
    bitninjaTelemetry.lastSendAt = now;
    bitninjaTelemetry.busySince = now;
    bitninjaTelemetry.sent += 1;

    try {
        await bitninjaTracker.send({ image: bitninjaGetTrackerImage() });
    } catch (err) {
        bitninjaTelemetry.errors += 1;
        console.error("Holistic frame failed", err);
    } finally {
        const elapsed = performance.now() - bitninjaTelemetry.busySince;
        bitninjaTelemetry.lastInferMs = elapsed;
        bitninjaTelemetry.maxInferMs = Math.max(bitninjaTelemetry.maxInferMs, elapsed);
        if (elapsed > 3000) bitninjaTelemetry.slow += 1;
        mocapBusy = false;
        bitninjaUpdatePerfOverlay();
    }
}

function startLatestFramePump() {
    const pump = async () => {
        if (videoElement.requestVideoFrameCallback) {
            videoElement.requestVideoFrameCallback(pump);
        } else {
            setTimeout(pump, Math.max(8, mocapFrameIntervalMs / 2));
        }
        await maybeSendLatestFrameToHolistic();
    };
    pump();
    bitninjaSetPerfOverlayVisible(bitninjaTelemetry.overlayVisible);
}


// switch use camera or video file
if (localStorage.getItem("useCamera") == "camera") {
    navigator.mediaDevices
        .getUserMedia({
            video: {
                deviceId: localStorage.getItem("cameraId"),
                width: { ideal: Number(globalSettings.lite?.cameraWidth || 640) },
                height: { ideal: Number(globalSettings.lite?.cameraHeight || 360) },
                frameRate: {
                    ideal: Number(globalSettings.lite?.targetFps || 12),
                    max: Number(globalSettings.lite?.cameraMaxFps || globalSettings.lite?.targetFps || 12),
                },
            },
        })
        .then(function (stream) {
            videoElement.srcObject = stream;
            videoElement.play();
            startLatestFramePump();
        })
        .catch(function (err0r) {
            alert(err0r);
        });
} else {
    // path of video file
    videoElement.src = localStorage.getItem("videoFile");
    videoElement.loop = true;
    videoElement.controls = true;

    document.querySelector("#model").style.transform = "scale(-1, 1)";

    videoElement.style.transform = "";
    guideCanvas.style.transform = "";

    startLatestFramePump();
}

var app = new Vue({
    el: "#vue0",
    data: {
        target: localStorage.getItem("bitninja-capture-view") || globalSettings.lite?.defaultView || "half",
        languages: languages[globalSettings.ui.language],
    },
});

function changeTarget(target) {
    var zRe = 1;
    if(currentVrm){
        zRe = currentVrm.meta.metaVersion === "1" ? -1 : 1;
    }
    app.target = target;
    localStorage.setItem("bitninja-capture-view", target);
    if (target == "face") {
        positionOffset = { x: 0.0, y: 1.22, z: zRe * 0.20 };
    } else if (target == "half") {
        positionOffset = {
            x: 0.0,
            y: 1.28,
            z: zRe * 1.05,
        };
    } else if (target == "full") {
        positionOffset = {
            x: 0.0,
            y: 1.55,
            z: zRe * 2.15,
        };
    }
    bitninjaScheduleResize();
}

window.changeTarget = changeTarget;

function clampYaw(deg) {
    return Math.max(-liteMotion.maxYawDeg, Math.min(liteMotion.maxYawDeg, deg));
}
function saveCaptureTransform() {
    localStorage.setItem("bitninja-capture-yaw", String(captureTransform.yawDeg || 0));
    localStorage.setItem("bitninja-capture-yoffset", String(captureTransform.yOffset || 0));
}
function showControlHint() {
    const hint = document.getElementById("bitninja-control-hint");
    if (!hint) return;
    hint.style.opacity = "1";
    clearTimeout(showControlHint._t);
    showControlHint._t = setTimeout(() => { hint.style.opacity = "0"; }, 1400);
}
function resetCaptureFraming() {
    // Stage 3V: reset should center the current selected view, not force Half.
    // This prevents an unexpected crop when the user is already in Full or Close mode.
    captureTransform.yawDeg = 0;
    captureTransform.yOffset = 0;
    positionOffset.x = 0;
    saveCaptureTransform();
    const currentTarget = (app && app.target) || localStorage.getItem("bitninja-capture-view") || globalSettings.lite?.defaultView || "half";
    changeTarget(currentTarget);
    bitninjaApplyManualRoot();
    showControlHint();
}
setTimeout(() => {
    changeTarget(localStorage.getItem("bitninja-capture-view") || globalSettings.lite?.defaultView || "half");
}, 0);

// Bitninja Lite: robust capture hotkey handling.
// Stage 3U exposes a function that the parent Mocap page can call/postMessage,
// because Electron/Chromium often keeps keyboard focus on the parent page instead
// of the render iframe after clicking dropdowns or buttons.
const handledCaptureKeys = new Set([
    "1", "2", "3", "0",
    "ArrowUp", "ArrowDown",
    "q", "Q", "e", "E", "r", "R", "l", "L",
]);

function bitninjaHandleCaptureKey(payload = {}) {
    const key = payload.key;
    if (!handledCaptureKeys.has(key)) return false;

    const shiftKey = !!payload.shiftKey;
    const yStep = shiftKey ? 0.40 : 0.16;
    const yawStep = shiftKey ? 30 : 12;

    switch (key) {
        case "1":
            changeTarget("full");
            showControlHint();
            return true;
        case "2":
            changeTarget("half");
            showControlHint();
            return true;
        case "3":
            changeTarget("face");
            showControlHint();
            return true;
        case "ArrowUp":
            captureTransform.yOffset = Math.min(1.8, (captureTransform.yOffset || 0) + yStep);
            saveCaptureTransform();
            bitninjaApplyManualRoot();
            showControlHint();
            return true;
        case "ArrowDown":
            captureTransform.yOffset = Math.max(-1.2, (captureTransform.yOffset || 0) - yStep);
            saveCaptureTransform();
            bitninjaApplyManualRoot();
            showControlHint();
            return true;
        case "q":
        case "Q":
            captureTransform.yawDeg = clampYaw((captureTransform.yawDeg || 0) - yawStep);
            saveCaptureTransform();
            bitninjaApplyManualRoot();
            showControlHint();
            return true;
        case "e":
        case "E":
            captureTransform.yawDeg = clampYaw((captureTransform.yawDeg || 0) + yawStep);
            saveCaptureTransform();
            bitninjaApplyManualRoot();
            showControlHint();
            return true;
        case "0":
            resetCaptureFraming();
            return true;
        case "l":
        case "L":
            bitninjaSetPerfOverlayVisible(!bitninjaTelemetry.overlayVisible);
            showControlHint();
            return true;
        case "r":
        case "R":
            if (isRecordingStarted) {
                stopRecording();
                document.getElementById("recording").style.display = "none";
            } else {
                startRecording();
                document.getElementById("recording").style.display = "";
            }
            showControlHint();
            return true;
    }
    return false;
}

window.bitninjaHandleCaptureKey = bitninjaHandleCaptureKey;

function bitninjaPreventHandledKey(event) {
    if (!bitninjaHandleCaptureKey({ key: event.key, shiftKey: event.shiftKey })) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
}

window.addEventListener("keydown", bitninjaPreventHandledKey, true);
document.addEventListener("keydown", bitninjaPreventHandledKey, true);
window.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type !== "bitninja-capture-key") return;
    bitninjaHandleCaptureKey({ key: data.key, shiftKey: data.shiftKey });
});

setTimeout(() => {
    try { window.focus(); } catch (err) {}
}, 250);

var contentDom = document.querySelector("#model");

//阻止相关事件默认行为
contentDom.ondragcenter =
    contentDom.ondragover =
    contentDom.ondragleave =
        () => {
            return false;
        };

//对拖动释放事件进行处理
contentDom.ondrop = (e) => {
    //console.log(e);
    var filePath = e.dataTransfer.files[0].path.replaceAll("\\", "/");
    console.log(filePath);
    contentDom.style.backgroundImage = `url(${filePath})`;
    contentDom.style.backgroundSize = "cover";
    contentDom.style.backgroundPosition = "center";
    contentDom.style.backgroundRepeat = "no-repeat";
};

const controller = document.getElementById("controller");
if (controller) {
    controller.style.opacity = "0.0";
    controller.style.transition = "opacity 180ms";
    window.addEventListener("mousemove", () => {
        controller.style.opacity = "0.30";
        clearTimeout(controller._bitninjaFadeTimer);
        controller._bitninjaFadeTimer = setTimeout(() => { controller.style.opacity = "0.0"; }, 1800);
    });
}

var elementToRecord = contentDom;
var canvas2d = document.getElementById("background-canvas");
var context = canvas2d.getContext("2d");

canvas2d.width = elementToRecord.clientWidth;
canvas2d.height = elementToRecord.clientHeight;

var recorder = new RecordRTC(canvas2d, {
    type: "canvas",
});

function startRecording() {
    // this.disabled = true;

    isRecordingStarted = true;

    recorder.startRecording();
}

function stopRecording() {
    // this.disabled = true;

    recorder.stopRecording(function () {
        isRecordingStarted = false;

        var blob = recorder.getBlob();

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "video.webm";

        link.dispatchEvent(
            new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                view: window,
            })
        );

        setTimeout(() => {
            window.URL.revokeObjectURL(blob);
            link.remove();
        }, 100);
    });
}
