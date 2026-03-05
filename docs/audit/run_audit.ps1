[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutFile)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force (Split-Path $OutFile) | Out-Null

Set-Content -Path $OutFile -Value ("# AAE Audit Report (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")`n")

function _blk([string]$t, [scriptblock]$c) {
  Add-Content -Path $OutFile -Value ""
  Add-Content -Path $OutFile -Value ("## " + $t)
  Add-Content -Path $OutFile -Value ""
  Add-Content -Path $OutFile -Value "```"
  $o = (& $c 2>&1 | Out-String)
  if ([string]::IsNullOrWhiteSpace($o)) { $o = "NO_OUTPUT" }
  Add-Content -Path $OutFile -Value ($o.TrimEnd())
  Add-Content -Path $OutFile -Value "```"
}

try { _blk "Environment" { "pwd: $(Get-Location)"; "node: $(node -v)"; "pnpm: $(pnpm -v)"; "git: $(git --version)"; "os: $([System.Environment]::OSVersion.VersionString)" } } catch { Add-Content -Path $OutFile -Value "`n## Environment`n```"; Add-Content -Path $OutFile -Value ("AUDIT_SECTION_ERROR: " + $_.Exception.Message); Add-Content -Path $OutFile -Value "```"; exit 1 }
try { _blk "Git Status" { git status -sb } } catch { exit 1 }
try { _blk "Recent Commits" { git log -n 20 --oneline } } catch { exit 1 }
try { _blk "Install (pnpm i)" { pnpm i } } catch { exit 1 }
try { _blk "Build" { pnpm run build } } catch { exit 1 }

try {
  _blk "Lint (if present)" {
    $pkg = Get-Content package.json -Raw
    if ($pkg -match '"lint"\s*:') { pnpm run lint } else { "NO_LINT_SCRIPT" }
  }
} catch { exit 1 }

try {
  _blk "Tests (if present)" {
    $pkg = Get-Content package.json -Raw
    if ($pkg -match '"test"\s*:') { pnpm test } else { "NO_TEST_SCRIPT" }
  }
} catch { exit 1 }

try {
  _blk "Prisma Validate" {
    if (Test-Path "prisma/schema.prisma") { npx prisma validate } else { "NO_PRISMA_SCHEMA" }
  }
} catch { exit 1 }

try {
  _blk "Prisma Migrate Status" {
    if (Test-Path "prisma/schema.prisma") { npx prisma migrate status } else { "NO_PRISMA_SCHEMA" }
  }
} catch { exit 1 }

try {
  _blk "Nightly Logs (latest 10 files)" {
    if (Test-Path "nightly-logs") {
      Get-ChildItem nightly-logs -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 10 Name, LastWriteTime, Length |
        Format-Table -AutoSize | Out-String
    } else { "NO_NIGHTLY_LOGS_FOLDER" }
  }
} catch { exit 1 }

Add-Content -Path $OutFile -Value "`n## Summary`n- Build: [fill]`n- Lint: [fill]`n- Prisma: [fill]`n- Nightly: [fill]`n"
Add-Content -Path $OutFile -Value "`n## Action Items`n- [ ]`n- [ ]`n"

exit 0
