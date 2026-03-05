[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutFile)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force (Split-Path $OutFile) | Out-Null

Set-Content -Path $OutFile -Value ("# AAE Audit Report (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")`n")

# -------- Environment --------
Add-Content -Path $OutFile -Value "## Environment`n"
Add-Content -Path $OutFile -Value "```"
try {
  $o = @(
    "pwd: $(Get-Location)"
    "node: $(node -v)"
    "pnpm: $(pnpm -v)"
    "git: $(git --version)"
    "os: $([System.Environment]::OSVersion.VersionString)"
  ) -join "`n"
  Add-Content -Path $OutFile -Value $o
} catch {
  Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message)
  Add-Content -Path $OutFile -Value "```"
  exit 1
}
Add-Content -Path $OutFile -Value "```"

# -------- Git Status --------
Add-Content -Path $OutFile -Value "`n## Git Status`n"
Add-Content -Path $OutFile -Value "```"
try { Add-Content -Path $OutFile -Value ((git status -sb 2>&1 | Out-String).TrimEnd()) } catch { Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message); Add-Content -Path $OutFile -Value "```"; exit 1 }
Add-Content -Path $OutFile -Value "```"

# -------- Recent Commits --------
Add-Content -Path $OutFile -Value "`n## Recent Commits`n"
Add-Content -Path $OutFile -Value "```"
try { Add-Content -Path $OutFile -Value ((git log -n 20 --oneline 2>&1 | Out-String).TrimEnd()) } catch { Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message); Add-Content -Path $OutFile -Value "```"; exit 1 }
Add-Content -Path $OutFile -Value "```"

# -------- Install --------
Add-Content -Path $OutFile -Value "`n## Install (pnpm i)`n"
Add-Content -Path $OutFile -Value "```"
try { Add-Content -Path $OutFile -Value ((pnpm i 2>&1 | Out-String).TrimEnd()) } catch { Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message); Add-Content -Path $OutFile -Value "```"; exit 1 }
Add-Content -Path $OutFile -Value "```"

# -------- Build --------
Add-Content -Path $OutFile -Value "`n## Build`n"
Add-Content -Path $OutFile -Value "```"
try { Add-Content -Path $OutFile -Value ((pnpm run build 2>&1 | Out-String).TrimEnd()) } catch { Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message); Add-Content -Path $OutFile -Value "```"; exit 1 }
Add-Content -Path $OutFile -Value "```"

# -------- Lint --------
Add-Content -Path $OutFile -Value "`n## Lint (if present)`n"
Add-Content -Path $OutFile -Value "```"
try {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"lint"\s*:') { Add-Content -Path $OutFile -Value ((pnpm run lint 2>&1 | Out-String).TrimEnd()) } else { Add-Content -Path $OutFile -Value "NO_LINT_SCRIPT" }
} catch { Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message); Add-Content -Path $OutFile -Value "```"; exit 1 }
Add-Content -Path $OutFile -Value "```"

# -------- Tests --------
Add-Content -Path $OutFile -Value "`n## Tests (if present)`n"
Add-Content -Path $OutFile -Value "```"
try {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"test"\s*:') { Add-Content -Path $OutFile -Value ((pnpm test 2>&1 | Out-String).TrimEnd()) } else { Add-Content -Path $OutFile -Value "NO_TEST_SCRIPT" }
} catch { Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message); Add-Content -Path $OutFile -Value "```"; exit 1 }
Add-Content -Path $OutFile -Value "```"

# -------- Prisma Validate --------
Add-Content -Path $OutFile -Value "`n## Prisma Validate`n"
Add-Content -Path $OutFile -Value "```"
try {
  if (Test-Path "prisma/schema.prisma") { Add-Content -Path $OutFile -Value ((npx prisma validate 2>&1 | Out-String).TrimEnd()) } else { Add-Content -Path $OutFile -Value "NO_PRISMA_SCHEMA" }
} catch { Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message); Add-Content -Path $OutFile -Value "```"; exit 1 }
Add-Content -Path $OutFile -Value "```"

# -------- Prisma Migrate Status --------
Add-Content -Path $OutFile -Value "`n## Prisma Migrate Status`n"
Add-Content -Path $OutFile -Value "```"
try {
  if (Test-Path "prisma/schema.prisma") { Add-Content -Path $OutFile -Value ((npx prisma migrate status 2>&1 | Out-String).TrimEnd()) } else { Add-Content -Path $OutFile -Value "NO_PRISMA_SCHEMA" }
} catch { Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message); Add-Content -Path $OutFile -Value "```"; exit 1 }
Add-Content -Path $OutFile -Value "```"

# -------- Nightly Logs --------
Add-Content -Path $OutFile -Value "`n## Nightly Logs (latest 10 files)`n"
Add-Content -Path $OutFile -Value "```"
try {
  if (Test-Path "nightly-logs") {
    Add-Content -Path $OutFile -Value ((Get-ChildItem nightly-logs -File | Sort-Object LastWriteTime -Descending | Select-Object -First 10 Name,LastWriteTime,Length | Format-Table -AutoSize | Out-String).TrimEnd())
  } else {
    Add-Content -Path $OutFile -Value "NO_NIGHTLY_LOGS_FOLDER"
  }
} catch { Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message); Add-Content -Path $OutFile -Value "```"; exit 1 }
Add-Content -Path $OutFile -Value "```"

Add-Content -Path $OutFile -Value "`n## Summary`n- Build: [fill]`n- Lint: [fill]`n- Prisma: [fill]`n- Nightly: [fill]`n"
Add-Content -Path $OutFile -Value "`n## Action Items`n- [ ]`n- [ ]`n"

exit 0
