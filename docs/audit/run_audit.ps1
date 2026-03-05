[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutFile)

$ErrorActionPreference="Stop"
New-Item -ItemType Directory -Force (Split-Path $OutFile) | Out-Null

function Add-Section {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][scriptblock]$Cmd
  )

  Add-Content -Path $OutFile -Value ""
  Add-Content -Path $OutFile -Value ("## " + $Title)
  Add-Content -Path $OutFile -Value ""
  Add-Content -Path $OutFile -Value "```"

  $output = $null
  try {
    $output = (& $Cmd 2>&1 | Out-String)
  } catch {
    $output = ("AUDIT_COMMAND_EXCEPTION: " + $_.Exception.Message)
  }

  if ([string]::IsNullOrWhiteSpace($output)) { $output = "NO_OUTPUT" }
  Add-Content -Path $OutFile -Value ($output.TrimEnd())

  Add-Content -Path $OutFile -Value "```"
}

Set-Content -Path $OutFile -Value ("# AAE Audit Report (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")`n")

Add-Section -Title "Environment" -Cmd {
  "pwd: $(Get-Location)"
  "node: $(node -v)"
  "pnpm: $(pnpm -v)"
  "git: $(git --version)"
  "os: $([System.Environment]::OSVersion.VersionString)"
}

Add-Section -Title "Git Status" -Cmd { git status -sb }
Add-Section -Title "Recent Commits" -Cmd { git log -n 20 --oneline }

Add-Section -Title "Install (pnpm i)" -Cmd { pnpm i }
Add-Section -Title "Build" -Cmd { pnpm run build }

Add-Section -Title "Lint (if present)" -Cmd {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"lint"\s*:') { pnpm run lint } else { "NO_LINT_SCRIPT" }
}

Add-Section -Title "Tests (if present)" -Cmd {
  $pkg = Get-Content package.json -Raw
  if ($pkg -match '"test"\s*:') { pnpm test } else { "NO_TEST_SCRIPT" }
}

Add-Section -Title "Prisma Validate" -Cmd {
  if (Test-Path "prisma/schema.prisma") { npx prisma validate } else { "NO_PRISMA_SCHEMA" }
}

Add-Section -Title "Prisma Migrate Status" -Cmd {
  if (Test-Path "prisma/schema.prisma") { npx prisma migrate status } else { "NO_PRISMA_SCHEMA" }
}

Add-Section -Title "Nightly Logs (latest 10 files)" -Cmd {
  if (Test-Path "nightly-logs") {
    Get-ChildItem nightly-logs -File |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 10 Name, LastWriteTime, Length |
      Format-Table -AutoSize | Out-String
  } else { "NO_NIGHTLY_LOGS_FOLDER" }
}

Add-Content -Path $OutFile -Value "`n## Summary`n- Build: [fill]`n- Lint: [fill]`n- Prisma: [fill]`n- Nightly: [fill]`n"
Add-Content -Path $OutFile -Value "`n## Action Items`n- [ ]`n- [ ]`n"
