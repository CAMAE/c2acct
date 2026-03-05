param([string]$OutFile)

$ErrorActionPreference="Stop"
New-Item -ItemType Directory -Force (Split-Path $OutFile) | Out-Null

function Add-Section {
  param([string]$Title,[scriptblock]$Cmd)

  Add-Content $OutFile ""
  Add-Content $OutFile ("## " + $Title)
  Add-Content $OutFile ""
  Add-Content $OutFile "```"

  $output = ""
  try { $output = (& $Cmd 2>&1 | Out-String) } catch { $output = ("ERROR: " + $_.Exception.Message) }
  if ([string]::IsNullOrWhiteSpace($output)) { $output = "NO_OUTPUT" }

  Add-Content $OutFile ($output.TrimEnd())
  Add-Content $OutFile "```"
}

Set-Content $OutFile ("# AAE Audit Report (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")`n")

Add-Section "Environment" {
  "pwd: $(Get-Location)"
  "node: $(node -v)"
  "pnpm: $(pnpm -v)"
  "git: $(git --version)"
  "os: $([System.Environment]::OSVersion.VersionString)"
}

Add-Section "Git Status" { git status -sb }
Add-Section "Recent Commits" { git log -n 20 --oneline }
Add-Section "Install (pnpm i)" { pnpm i }
Add-Section "Build" { pnpm run build }

Add-Section "Lint (if present)" {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"lint"\s*:') { pnpm run lint } else { "NO_LINT_SCRIPT" }
}

Add-Section "Tests (if present)" {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"test"\s*:') { pnpm test } else { "NO_TEST_SCRIPT" }
}

Add-Section "Prisma Validate" {
  if (Test-Path "prisma/schema.prisma") { npx prisma validate } else { "NO_PRISMA_SCHEMA" }
}

Add-Section "Prisma Migrate Status" {
  if (Test-Path "prisma/schema.prisma") { npx prisma migrate status } else { "NO_PRISMA_SCHEMA" }
}

Add-Section "Nightly Logs (latest 5 files)" {
  if (Test-Path "nightly-logs") {
    Get-ChildItem nightly-logs -File | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name,LastWriteTime,Length | Format-Table -AutoSize | Out-String
  } else { "NO_NIGHTLY_LOGS_FOLDER" }
}

Add-Content $OutFile "`n## Summary`n- Build: [fill]`n- Lint: [fill]`n- Prisma: [fill]`n- Nightly: [fill]`n"
Add-Content $OutFile "`n## Action Items`n- [ ]`n- [ ]`n"
