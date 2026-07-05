# Bitninja Mocap Lite mod2O Online Notes

`mod2O` keeps HTTP/WebSocket output optional. The app remains OBS/local friendly when forwarding is disabled.

## Default behavior

- HTTP/WebSocket forwarding is OFF by default.
- Turn it ON only when another tool needs live mocap data.
- Default endpoint when enabled: `http://127.0.0.1:8080`.

## Service behavior

Audio lip sync and Audio Lip Assist are local microphone/browser features. They do not require HTTP/WebSocket forwarding. Eye tracking, face mesh, and full hand mesh may increase CPU/GPU load because they require richer MediaPipe landmarks.
