# Bitninja Mocap Lite

Bitninja Mocap Lite is an OBS-focused local fork of SysMocap for Linux VTuber workflows.

This fork is designed for creators who want a lighter local VRM mocap setup with:
- local VRM loading from the `models/` folder
- OBS-friendly purple background
- local-only default behavior
- lower-latency Pose Fast tracking
- downsampled tracker input
- simple performance presets
- camera refresh tools
- manual framing controls for OBS

## Status

Current fork version: `v0.8.3-mod2L`

`mod2L` means **Modded version 2 - Local**.

The online/websocket variant should be updated separately as `mod2O` when that branch is ready.


## Mod2 Extended Services

`mod2L` adds lightweight service controls for streamer-focused capture:

- Lip Sync Service: Off, Simple / Camera Mouth, Full / Face Mesh, or Audio / Microphone.
- Audio Lip Assist: optional microphone assist that can run by itself or assist Simple/Full lip sync.
- Finger Sync Service: Off, Simple / Lightweight, or Full / Hand Mesh.
- Eye Tracking / Look Target: optional toggle that attempts face/iris-style look target behavior when face landmarks are available.
- Game preset: OBS-smooth style capture with audio lip sync.
- Talks preset: Holistic Full, Bitninja smoothing, simple camera lip, audio assist, eye tracking, and simple fingers.

Simple and Full lip services remain mutually exclusive. Audio can run alone or assist one camera/face lip service. Simple and Full finger services remain mutually exclusive.

## Recommended OBS Presets

### OBS Fast

Best default for streaming.

- Tracking Engine: Pose Fast
- Tracker Input: Downsample Canvas 160x120
- Camera: 320x240
- Mocap Target FPS: 12
- Render Target FPS: 30

### OBS Smooth

Best for panel/talking streams where smoother motion matters more than full action responsiveness.

- Tracking Engine: Holistic Full
- Tracker Input: Downsample Canvas 160x120
- Pose Fast Internal Smoothing: ON
- Camera: 320x240
- Mocap Target FPS: 12

### Balanced

Good middle-ground test preset.

- Tracking Engine: Pose Fast
- Tracker Input: Downsample Canvas 192x144
- Camera: 320x240
- Mocap Target FPS: 12

### Face/Hands

Slower diagnostic preset for Holistic face/hands behavior.

### Min

Lowest-load diagnostic preset.

### Max

Hardware-upgrade stress test. Not recommended for current low-resource streaming sessions.

## Controls During Mocap

- `1` Full view
- `2` Half view
- `3` Close view
- `Arrow Up / Arrow Down` move model up/down
- `Q / E` rotate model
- `0` center current view
- `L` show/hide latency overlay


## Linux launch

Install dependencies:

    npm install

Recommended standard launcher on Kubuntu/KDE and most local Linux setups:

    ./run_bitninja_lite_standard.sh

If needed, test the direct launchers:

    ./run_bitninja_lite_nvidia_desktopgl.sh
    ./run_bitninja_lite_nvidia.sh
    ./run_bitninja_lite_mesa_x11.sh

## Local VRM library

### Put .vrm files in:

`models/`

### Optional thumbnails go in:

`models/img/`

### Use the same base filename:

`models/MyModel.vrm`
`models/img/MyModel.png`

### Then click:

`Library -> Refresh Local VRM Library`
`OBS background`


## The default OBS background color is:
```text
#3B2364
RGB(59,35,100)
```

## Known notes:

Some Electron/Chromium GPU warnings may appear in terminal on Linux/NVIDIA systems. In testing, these warnings did not prevent the app from launching, tracking, or capturing in OBS.

## Credits

This is a fork/mod of SysMocap by xianfei.

Original project:
(SysMoCap)[https://github.com/xianfei/SysMocap]
