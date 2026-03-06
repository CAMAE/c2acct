[CmdletBinding()]
param([string]$PlanPath = "docs/plan/two-week-plan_pre-mac-mini_2026-03-05.md")

$ErrorActionPreference="Stop"

$ts = Get-Date -Format "yyyy-MM-dd_HHmmss"
$auditOut = "docs/audit/audit_$ts.md"
$sessionOut = "docs/audit/session_$ts.md"

if (-not (Test-Path "docs/audit/run_audit.ps1")) { throw "Missing docs/audit/run_audit.ps1" }
if (-not (Test-Path $PlanPath)) { throw "Missing plan file: $PlanPath" }

# Always run audit
powershell -NoProfile -ExecutionPolicy Bypass -File docs/audit/run_audit.ps1 -OutFile $auditOut
$auditExit = $LASTEXITCODE
$auditStatus = $(if ($auditExit -eq 0) { "PASS" } else { "FAIL" })

# Session log (always written)
$log = git log -n 25 --date=local --pretty=format:"%h %ad %s"
$status = git status -sb
$diffstat = git diff --stat

@"
# AAE Session Log ($ts)

## Audit status
- $auditStatus (exit $auditExit)
- Artifact: $auditOut

## Latest commits (last 25)
$log

## Git status
$status

## Uncommitted diffstat
$diffstat

## Plan artifact
- $PlanPath
"@ | Set-Content -Encoding UTF8 $sessionOut

# Append pointers into plan (always)
Add-Content -Path $PlanPath -Value ""
Add-Content -Path $PlanPath -Value ("## Session Log Entry (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")")
Add-Content -Path $PlanPath -Value ("- Audit (" + $auditStatus + "): " + $auditOut)
Add-Content -Path $PlanPath -Value ("- Session log: " + $sessionOut)

# Commit regardless (this is the "STOP ME" guarantee)
git add $auditOut $sessionOut $PlanPath
git commit -m ("chore(session): end-of-session " + $auditStatus + " " + $ts)

Write-Host "OK => $auditStatus => $auditOut"
Write-Host "OK => $sessionOut"
exit $auditExit

