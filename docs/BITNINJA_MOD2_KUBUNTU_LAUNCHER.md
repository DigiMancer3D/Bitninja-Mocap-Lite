# Bitninja Mocap Lite mod2 Kubuntu Launcher Notes

Stage 13 installed a normal Kubuntu application launcher for the local dev/source app.

## Standard launcher

The standard helper is:

```bash
~/BitninjaMocapLite_dev/run_bitninja_lite_standard.sh
```

The desktop launcher calls:

```bash
~/.local/bin/bitninja-mocap-lite
```

## Logs

Silent launcher logs write to:

```text
~/logs/3dcp_logs/bitninja.log
```

## NVIDIA note

The standard launcher prefers `run_bitninja_lite_nvidia_desktopgl.sh` when available because it is often more stable on Kubuntu/NVIDIA than the EGL/ANGLE path.

## Desktop menu category

Stage 14 changes the desktop file category to:

```text
AudioVideo;
```

This avoids KDE's warning about multiple main categories.
