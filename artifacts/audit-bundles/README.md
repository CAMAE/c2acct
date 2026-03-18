# Audit Bundles

This directory holds timestamped reviewer packets.

Layout:

- `latest/`
- `<timestamp>/current-build-audit/`
- `<timestamp>/audit-docs/`
- `<timestamp>/final-docs/`
- `<timestamp>/research/`
- `<timestamp>/learning/`
- `<timestamp>/ops/`
- `<timestamp>/verification/`

Pointer files:

- `LATEST_BUNDLE.txt`
- `LATEST_BUNDLE_PATH.txt`

Regeneration:

- macOS/Linux shell:
  - `bash scripts/audit/generate-current-build-audit.sh`
  - `bash scripts/export/generate-audit-bundle.sh`
  - `bash scripts/export/generate-verification-bundle.sh`
- Windows PowerShell:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\export\generate-audit-bundle.ps1`
  - `powershell -ExecutionPolicy Bypass -File .\scripts\export\generate-verification-bundle.ps1`
