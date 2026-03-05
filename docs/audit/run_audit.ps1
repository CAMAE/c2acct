[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutFile)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force (Split-Path $OutFile) | Out-Null

$hadError = $false

function Write-Block([string]$Title, [scriptblock]$Cmd) {
  Add-Content -Path $OutFile -Value ""
  Add-Content -Path $OutFile -Value ("## " + $Title)
  Add-Content -Path $OutFile -Value ""
  Add-Content -Path $OutFile -Value "```"
  try {
    $o = (& $Cmd 2>&1 | Out-String)
    if ([string]::IsNullOrWhiteSpace($o)) { $o = "NO_OUTPUT" }
    Add-Content -Path $OutFile -Value ($o.TrimEnd())
  } catch {
    $script:hadError = $true
    Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message)
  } finally {
    Add-Content -Path $OutFile -Value "```"
  }
}

Set-Content -Path $OutFile -Value ("# AAE Audit Report (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")`n")

Write-Block "Environment" {
  "pwd: $(Get-Location)"
  "node: $(node -v)"
  "pnpm: $(pnpm -v)"
  "git: $(git --version)"
  "os: $([System.Environment]::OSVersion.VersionString)"
}

Write-Block "Git Status" { git status -sb }
Write-Block "Recent Commits" { git log -n 20 --oneline }

Write-Block "Install (pnpm i)" { pnpm i }
Write-Block "Build" { pnpm run build }

Write-Block "Lint (if present)" {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"lint"\s*:') { pnpm run lint } else { "NO_LINT_SCRIPT" }
}

Write-Block "Tests (if present)" {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"test"\s*:') { pnpm test } else { "NO_TEST_SCRIPT" }
}

Write-Block "Prisma Validate" {
  if (Test-Path "prisma/schema.prisma") { npx prisma validate } else { "NO_PRISMA_SCHEMA" }
}

Write-Block "Prisma Migrate Status" {
  if (Test-Path "prisma/schema.prisma") { npx prisma migrate status } else { "NO_PRISMA_SCHEMA" }
}

Write-Block "Nightly Logs (latest 10 files)" {
  if (Test-Path "nightly-logs") {
    Get-ChildItem nightly-logs -File |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 10 Name, LastWriteTime, Length |
      Format-Table -AutoSize | Out-String
  } else { "NO_NIGHTLY_LOGS_FOLDER" }
}

Add-Content -Path $OutFile -Value "`n## Summary`n- Build: [fill]`n- Lint: [fill]`n- Prisma: [fill]`n- Nightly: [fill]`n"
Add-Content -Path $OutFile -Value "`n## Action Items`n- [ ]`n- [ ]`n"

if ($hadError) { exit 1 } else { exit 0 }
