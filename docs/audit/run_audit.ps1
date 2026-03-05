[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutFile)

$ErrorActionPreference="Stop"
New-Item -ItemType Directory -Force (Split-Path $OutFile) | Out-Null

function AddAuditSection {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)][string]$SectionTitle,
    [Parameter(Mandatory=$true)][scriptblock]$SectionCmd
  )

  Add-Content -Path $OutFile -Value ""
  Add-Content -Path $OutFile -Value ("## " + $SectionTitle)
  Add-Content -Path $OutFile -Value ""
  Add-Content -Path $OutFile -Value "```"

  $out = $null
  try { $out = (& $SectionCmd 2>&1 | Out-String) }
  catch { $out = ("AUDIT_EXCEPTION " + $_.Exception.Message) }

  if ([string]::IsNullOrWhiteSpace($out)) { $out = "NO_OUTPUT" }
  Add-Content -Path $OutFile -Value ($out.TrimEnd())
  Add-Content -Path $OutFile -Value "```"
}

Set-Content -Path $OutFile -Value ("# AAE Audit Report (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")`n")

AddAuditSection "Environment" {
  "pwd: $(Get-Location)"
  "node: $(node -v)"
  "pnpm: $(pnpm -v)"
  "git: $(git --version)"
  "os: $([System.Environment]::OSVersion.VersionString)"
}

AddAuditSection "Git Status" { git status -sb }
AddAuditSection "Recent Commits" { git log -n 20 --oneline }
AddAuditSection "Install (pnpm i)" { pnpm i }
AddAuditSection "Build" { pnpm run build }

AddAuditSection "Lint (if present)" {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"lint"\s*:') { pnpm run lint } else { "NO_LINT_SCRIPT" }
}

AddAuditSection "Tests (if present)" {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"test"\s*:') { pnpm test } else { "NO_TEST_SCRIPT" }
}

AddAuditSection "Prisma Validate" {
  if (Test-Path "prisma/schema.prisma") { npx prisma validate } else { "NO_PRISMA_SCHEMA" }
}

AddAuditSection "Prisma Migrate Status" {
  if (Test-Path "prisma/schema.prisma") { npx prisma migrate status } else { "NO_PRISMA_SCHEMA" }
}

AddAuditSection "Nightly Logs (latest 10 files)" {
  if (Test-Path "nightly-logs") {
    Get-ChildItem nightly-logs -File |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 10 Name, LastWriteTime, Length |
      Format-Table -AutoSize | Out-String
  } else { "NO_NIGHTLY_LOGS_FOLDER" }
}

Add-Content -Path $OutFile -Value "`n## Summary`n- Build: [fill]`n- Lint: [fill]`n- Prisma: [fill]`n- Nightly: [fill]`n"
Add-Content -Path $OutFile -Value "`n## Action Items`n- [ ]`n- [ ]`n"
