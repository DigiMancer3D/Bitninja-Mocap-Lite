# Bitninja Mocap Lite Stage 14 - Final Cleanup + GitHub Export

Stage 14 adds safe cleanup and export helpers for the mod2 release line.

## Current release target

- Local version: `mod2L`
- Online version: `mod2O`
- Main user-tested baseline: local OBS fork, Kubuntu 24, X11/Wayland capable, NVIDIA launcher path preferred through the standard launcher.

## What Stage 14 adds

- `export_bitninja_mod2_github_ready.sh`
  - Builds a clean GitHub upload folder under `export/`.
  - Excludes `node_modules`, `dev_artifacts`, old patch/doctor scripts, logs, temporary files, and generated exports.
  - Keeps runtime source/assets such as `mainview`, `mocap`, `mocaprender`, `render`, `utils`, `webserv`, `models`, `icons`, `pdfs`, and `pdfviewer` when present.

- `bitninja_stage14_archive_root_scripts.sh`
  - Moves root-level patch/doctor/collector scripts into `dev_artifacts` instead of deleting them.
  - Leaves normal run scripts alone.

- `bitninja_stage14_final_cleanup_export_doctor.sh`
  - Verifies the Stage 14 helpers and docs exist.
  - Verifies shell syntax for the helpers.
  - Verifies the package version is on a mod2 line.

## Suggested order

```bash
cd ~/BitninjaMocapLite_dev
./bitninja_stage14_final_cleanup_export_doctor.sh
./export_bitninja_mod2_github_ready.sh
```

After the export looks good, optionally archive root script clutter:

```bash
./bitninja_stage14_archive_root_scripts.sh
```

Then run the export again if you want the upload folder to reflect the cleaned root.

## Notes

The cleanup helper moves files into `dev_artifacts/`; it does not delete them. This keeps the working folder cleaner while preserving patch history for audit/recovery.
