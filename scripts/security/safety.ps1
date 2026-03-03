# AAE Safety / Panic script (Windows PowerShell)
# - Stops common dev processes
# - Captures repo state
# - Hard-resets to latest origin/main if needed (OPTIONAL)
param(
  [switch]$HardResetMain
)

Write-Host "== AAE Safety Snapshot =="

# Stop common node processes (best-effort)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process pnpm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Capture repo state
git status
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD

if ($HardResetMain) {
  Write-Host "== HARD RESET to origin/main (DANGEROUS) =="
  git fetch origin
  git checkout main
  git reset --hard origin/main
  git clean -fd
  git status
}

Write-Host "Done."
