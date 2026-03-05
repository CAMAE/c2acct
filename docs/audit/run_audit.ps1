[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutFile)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force (Split-Path $OutFile) | Out-Null

Set-Content -Path $OutFile -Value ("# AAE Audit Report (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")`n")

function WriteSection {
  param([string]$Title, [scriptblock]$Body)

  Add-Content -Path $OutFile -Value ""
  Add-Content -Path $OutFile -Value ("## " + $Title)
  Add-Content -Path $OutFile -Value ""
  Add-Content -Path $OutFile -Value "```"
  try {
    $txt = (& $Body 2>&1 | Out-String)
    if ([string]::IsNullOrWhiteSpace($txt)) { $txt = "NO_OUTPUT" }
    Add-Content -Path $OutFile -Value ($txt.TrimEnd())
  } catch {
    Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message)
    Add-Content -Path $OutFile -Value "```"
    exit 1
  }
  Add-Content -Path $OutFile -Value "```"
}

WriteSection "Environment" {
  @(
    "pwd: $(Get-Location)"
    "node: $(node -v)"
    "pnpm: $(pnpm -v)"
    "git: $(git --version)"
    "os: $([System.Environment]::OSVersion.VersionString)"
  ) -join "`n"
}

WriteSection "Git Status" { git status -sb }
WriteSection "Recent Commits" { git log -n 20 --oneline }
WriteSection "Install (pnpm i)" { pnpm i }
WriteSection "Build" { pnpm run build }

WriteSection "Lint (if present)" {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"lint"\s*:') { pnpm run lint } else { "NO_LINT_SCRIPT" }
}

WriteSection "Tests (if present)" {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"test"\s*:') { pnpm test } else { "NO_TEST_SCRIPT" }
}

WriteSection "Prisma Validate" {
  if (Test-Path "prisma/schema.prisma") { npx prisma validate } else { "NO_PRISMA_SCHEMA" }
}

WriteSection "Prisma Migrate Status" {
  if (Test-Path "prisma/schema.prisma") { npx prisma migrate status } else { "NO_PRISMA_SCHEMA" }
}

WriteSection "Nightly Logs (latest 10 files)" {
  if (Test-Path "nightly-logs") {
    Get-ChildItem nightly-logs -File |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 10 Name, LastWriteTime, Length |
      Format-Table -AutoSize | Out-String
  } else {
    "NO_NIGHTLY_LOGS_FOLDER"
  }
}

Add-Content -Path $OutFile -Value '`n## Summary`n- Build: [fill]`n- Lint: [fill]`n- Prisma: [fill]`n- Nightly: [fill]`n'
Add-Content -Path $OutFile -Value '`n## Action Items`n- [ ]`n- [ ]`n'

exit 0


