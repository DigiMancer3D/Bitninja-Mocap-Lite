# Bitninja Mocap Lite v0.8.3-mod2O Online Release Notes

## Summary

`mod2O` ports the tested mod2L service controls to the online/HTTP-WebSocket branch. It is intended for users who need the lightweight Bitninja Mocap Lite setup while optionally forwarding live mocap data to another local/network tool.

## Preserved from mod1O

- Optional HTTP/WebSocket output path.
- HTTP/WebSocket is OFF by default.
- Local endpoint defaults to `http://127.0.0.1:8080` when enabled.
- OBS/local capture presets remain usable without starting network output.

## Added from mod2L

- Lip Sync Service: Off, Simple / Camera Mouth, Full / Face Mesh, Audio / Microphone.
- Audio Lip Assist for microphone timing support.
- Finger Sync Service: Off, Simple / Lightweight, Full / Hand Mesh.
- Eye Tracking / Look Target toggle.
- Game preset.
- Talks preset.
- Stage 12R renderer recovery fix.
- Portable standard launcher script.

## Notes

Simple and Full lip modes are mutually exclusive. Audio can run alone or assist Simple/Full lip service. Simple and Full finger modes are mutually exclusive. Eye tracking may request/require Holistic Full because Pose Fast does not provide full face landmarks.
