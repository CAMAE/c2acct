[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutFile)

$ErrorActionPreference = 'Stop'
# ensure DB URL exists for audit/prisma (only set if missing)
if (-not $env:DATABASE_URL -or [string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/aae?schema=public"
}
New-Item -ItemType Directory -Force (Split-Path $OutFile) | Out-Null

function Section([string]$Title, [scriptblock]$Body) {
  Add-Content -Path $OutFile -Value ''
  Add-Content -Path $OutFile -Value ('## ' + $Title)
  Add-Content -Path $OutFile -Value ''
  Add-Content -Path $OutFile -Value '```'
  try {
    $txt = (& $Body 2>&1 | Out-String)
    if ([string]::IsNullOrWhiteSpace($txt)) { $txt = 'NO_OUTPUT' }
    Add-Content -Path $OutFile -Value ($txt.TrimEnd())
  } catch {
    Add-Content -Path $OutFile -Value ('AUDIT_SECTION_ERROR: ' + $_.Exception.Message)
    Add-Content -Path $OutFile -Value '```'
    exit 1
  }
  Add-Content -Path $OutFile -Value '```'
}

Set-Content -Path $OutFile -Value ('# AAE Audit Report (' + (Get-Date -Format 'yyyy-MM-dd HH:mm') + ')' + "`n")

Section 'Environment' {
  $lines = @(
    ('pwd: ' + (Get-Location).Path)
    ('node: ' + (node -v))
    ('pnpm: ' + (pnpm -v))
    ('git: ' + (git --version))
    ('os: ' + [System.Environment]::OSVersion.VersionString)
  )
  $lines -join "`n"
}

Section 'Git Status' { git status -sb }
Section 'Recent Commits' { git log -n 20 --oneline }
Section 'Install (pnpm i)' { pnpm i }
Section 'Build' { pnpm run build }

Section 'Lint (if present)' {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"lint"\s*:') { pnpm run lint } else { 'NO_LINT_SCRIPT' }
}

Section 'Tests (if present)' {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"test"\s*:') { pnpm test } else { 'NO_TEST_SCRIPT' }
}

Section 'Prisma Validate' {
  if (Test-Path 'prisma/schema.prisma') { pnpm exec prisma validate } else { 'NO_PRISMA_SCHEMA' }
}

Section 'Prisma Migrate Status' {
  if (Test-Path 'prisma/schema.prisma') { pnpm exec prisma migrate status } else { 'NO_PRISMA_SCHEMA' }
}

Section 'Nightly Logs (latest 10 files)' {
  if (Test-Path 'nightly-logs') {
    Get-ChildItem nightly-logs -File |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 10 Name, LastWriteTime, Length |
      Format-Table -AutoSize | Out-String
  } else {
    'NO_NIGHTLY_LOGS_FOLDER'
  }
}

Add-Content -Path $OutFile -Value ''
Add-Content -Path $OutFile -Value '## Summary'
Add-Content -Path $OutFile -Value '- Build: [fill]'
Add-Content -Path $OutFile -Value '- Lint: [fill]'
Add-Content -Path $OutFile -Value '- Prisma: [fill]'
Add-Content -Path $OutFile -Value '- Nightly: [fill]'
Add-Content -Path $OutFile -Value ''
Add-Content -Path $OutFile -Value '## Action Items'
Add-Content -Path $OutFile -Value '- [ ]'
Add-Content -Path $OutFile -Value '- [ ]'

exit 0
