[CmdletBinding()]
param([string]$PlanPath = "docs/plan/two-week-plan_pre-mac-mini_2026-03-05.md")

$ErrorActionPreference="Stop"

$ts = Get-Date -Format "yyyy-MM-dd_HHmm"
$auditOut = "docs/audit/audit_$ts.md"
$sessionOut = "docs/audit/session_$ts.md"

if (-not (Test-Path "docs/audit/run_audit.ps1")) { throw "Missing docs/audit/run_audit.ps1" }
if (-not (Test-Path $PlanPath)) { throw "Missing plan file: $PlanPath" }

powershell -NoProfile -ExecutionPolicy Bypass -File docs/audit/run_audit.ps1 -OutFile $auditOut
if ($LASTEXITCODE -ne 0) { throw "Audit failed (exit $LASTEXITCODE). Not committing session." }

$log = git log -n 25 --date=local --pretty=format:"%h %ad %s"
$status = git status -sb
$diffstat = git diff --stat

@"
# AAE Session Log ($ts)

## Latest commits (last 25)
$log

## Git status
$status

## Uncommitted diffstat
$diffstat

## Audit artifact
- $auditOut

## Plan artifact
- $PlanPath
"@ | Set-Content -Encoding UTF8 $sessionOut

Add-Content -Path $PlanPath -Value ""
Add-Content -Path $PlanPath -Value ("## Session Log Entry (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")")
Add-Content -Path $PlanPath -Value ("- Audit: " + $auditOut)
Add-Content -Path $PlanPath -Value ("- Session log: " + $sessionOut)

git add $auditOut $sessionOut $PlanPath
git commit -m ("chore(session): end-of-session audit+log " + $ts)

Write-Host "OK => $auditOut"
Write-Host "OK => $sessionOut"
