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

Current fork version: `v0.8.3-mod1L`

`mod1L` means **Modded version 1 - Local**.

A future online/websocket variant may use `mod1O`, meaning **Modded version 1 - Online**.

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

```bash
npm install
```

## Run with the NVIDIA launcher:

```bash
./run_bitninja_lite_nvidia.sh
```

### If you use integrated/MESA graphics, test:

```bash
./run_bitninja_lite_mesa_x11.sh
```

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

`#3B2364`
`RGB(59,35,100)`


## Known notes:

Some Electron/Chromium GPU warnings may appear in terminal on Linux/NVIDIA systems. In testing, these warnings did not prevent the app from launching, tracking, or capturing in OBS.

## Credits

This is a fork/mod of [SysMocap by xianfei](https://github.com/xianfei/SysMocap).

Original project:
[SysMoCap](https://github.com/xianfei/SysMocap)
