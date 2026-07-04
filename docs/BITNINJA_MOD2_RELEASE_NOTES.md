# Bitninja Mocap Lite mod2 Release Notes

## Summary

The mod2 release line turns the local OBS-focused Bitninja Mocap Lite fork into a more configurable low-resource mocap setup. It adds selectable service modes, audio lip assist, eye tracking support, recovery fixes, and a standard Kubuntu launcher.

## Major changes

### Extended services

Lip Sync Service modes:

- Off
- Simple / Camera Mouth
- Full / Face Mesh
- Audio / Microphone

Audio Lip Assist:

- Can be used alone.
- Can be combined with Simple / Camera Mouth.
- Can be combined with Full / Face Mesh.
- Still avoids running Simple and Full camera lip services together.

Finger Sync Service modes:

- Off
- Simple / Lightweight
- Full / Hand Mesh

Eye Tracking:

- Added as a separate toggle.
- Attempts to use face/eye landmarks when available.
- May require Holistic Full because Pose Fast does not produce full face landmarks.

### Presets

`Game`

- OBS-smooth / Pose Fast style setup.
- Audio lip sync enabled.
- Finger sync off by default.

`Talks`

- Holistic Full.
- Bitninja smoothing.
- Simple camera-mouth lip service plus audio assist.
- Eye tracking enabled.
- Simple finger sync enabled.

### Kubuntu launcher

Stage 13 added a standard launcher path:

- `~/.local/bin/bitninja-mocap-lite`
- `~/.local/share/applications/bitninja-mocap-lite.desktop`
- `run_bitninja_lite_standard.sh`

Logs write to:

```text
~/logs/3dcp_logs/bitninja.log
```

### Known graphics notes

On some Kubuntu + NVIDIA systems, Electron/Chromium may print ANGLE/EGL messages during launch. If the app opens and mocap works, those messages are usually warnings rather than a mod2 service failure. The standard launcher prefers the desktop OpenGL launcher path first to reduce EGL issues.

## Tested user baseline

The local mod2 line was tested with:

- Kubuntu 24
- NVIDIA launch path
- Standard launcher
- Audio lip assist
- Simple hands
- Live stats overlay
- Inference latency observed around a few hundred milliseconds during a successful test
