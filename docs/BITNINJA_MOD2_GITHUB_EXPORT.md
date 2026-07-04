# Bitninja Mocap Lite mod2 GitHub Export Guide

Use this guide when preparing a clean upload folder for GitHub.

## Create a clean export folder

From the app root:

```bash
cd ~/BitninjaMocapLite_dev
./export_bitninja_mod2_github_ready.sh
```

The helper creates:

```text
export/BitninjaMocapLite_<version>_GITHUB_UPLOAD_<timestamp>/
export/BitninjaMocapLite_<version>_GITHUB_UPLOAD_<timestamp>.tar.gz
```

If `zip` is installed, it also creates a `.zip` archive.

## What is excluded

The export intentionally excludes:

- `node_modules/`
- `dev_artifacts/`
- old `bitninja_stage*.sh` patch/doctor scripts
- collector scripts
- generated `export/` folders
- `OutApp/`, `dist/`, and release build outputs
- `.git/`
- logs, temporary files, caches, backups, and OS metadata files

## What is kept

When present, the export keeps runtime source and assets such as:

- `main.js`
- `package.json`
- `package-lock.json`
- `mainview/`
- `mocap/`
- `mocaprender/`
- `render/`
- `utils/`
- `webserv/`
- `models/`
- `icons/`
- `pdfs/`
- `pdfviewer/`
- `run_bitninja_lite*.sh`
- mod2 docs under `docs/`

## Upload reminder

When manually updating GitHub, upload the **contents inside** the generated `GITHUB_UPLOAD` folder, not the outer folder itself, unless you intentionally want the repository to contain that wrapper folder.

Do not upload `node_modules`; GitHub users should install dependencies with:

```bash
npm install
```

or, when preserving the lockfile exactly:

```bash
npm ci
```
