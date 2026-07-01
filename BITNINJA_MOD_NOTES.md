# Bitninja Mocap Lite Mod Notes

Bitninja Mocap Lite is a local OBS-focused fork of SysMocap.

## Main changes

- Removed/disabled auto-update behavior by default.
- Removed/disabled HTTP/WebSocket forwarding by default.
- Added future-online toggle placeholder for HTTP/WebSocket behavior.
- Added local VRM folder scanning.
- Added local thumbnail support from `models/img/`.
- Added Refresh Local VRM Library.
- Added Refresh Sources for camera devices.
- Added Refresh Live Camera.
- Added OBS purple background tooling.
- Added manual OBS framing hotkeys.
- Added latency doctor overlay.
- Added Pose Fast tracking engine.
- Added downsampled tracker input mode.
- Added performance presets:
  - Min
  - OBS Fast
  - OBS Smooth
  - Balanced
  - Face/Hands
  - Max
- Added Linux NVIDIA/MESA launch helpers.

## Version

Current local version: `v0.8.3-mod1O`

`mod1O` = Modded version 1 - Online.

Future planned online/websocket version:
`mod1O` = Modded version 1 - Online.


---

## Bitninja mod1O Online Notes

`mod1O` keeps the OBS/local performance defaults from `mod1L`, but restores an optional HTTP/WebSocket output path.

The HTTP/WebSocket toggle is OFF by default. Turn it ON only when another tool needs live mocap data over the local network.

Default endpoint when enabled:

```text
http://127.0.0.1:8080
```

The OBS Fast and OBS Smooth presets remain local-performance focused and do not require HTTP/WebSocket output.
