# Bitninja Mocap Lite mod2O GitHub Export Guide

Use this guide when preparing the online/HTTP-WebSocket `mod2O` branch or release assets.

## Create a clean export folder

From the app root:

```bash
./export_bitninja_mod2O_github_ready.sh
```

The helper creates:

```text
export/BitninjaMocapLite_0.8.3-mod2O_GITHUB_UPLOAD_<timestamp>/
export/BitninjaMocapLite_0.8.3-mod2O_GITHUB_UPLOAD_<timestamp>.tar.gz
export/BitninjaMocapLite_0.8.3-mod2O_GITHUB_UPLOAD_<timestamp>.zip
```

## Excluded

- `node_modules/`
- `dev_artifacts/`
- generated `export/` folders
- patch/doctor scripts
- local logs/caches/backups
- `.git/`

## Upload reminder

For browser upload, upload the contents of the generated folder to the `bitninja-mod2O` branch. Attach the `.zip`, `.tar.gz`, release notes, and checksum file to the `mod2O` pre-release.
