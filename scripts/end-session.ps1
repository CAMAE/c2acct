param()

$ErrorActionPreference = "Stop"

function New-SafePath {
  param([string]$Path)
  $dir  = Split-Path -Parent $Path
  $base = [System.IO.Path]::GetFileNameWithoutExtension($Path)
  $ext  = [System.IO.Path]::GetExtension($Path)
  $ts   = Get-Date -Format "yyyy-MM-dd_HHmmss"
  $rand = (Get-Random -Maximum 10000).ToString("0000")
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  return (Join-Path $dir ($base + "_" + $ts + "_" + $rand + $ext))
}

function Append-LineSafe {
  param(
    [string]$Path,
    [string]$Line
  )
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

  $target = $Path
  if (Test-Path $target) {
    try {
      $fs = [System.IO.File]::Open($target,[System.IO.FileMode]::Open,[System.IO.FileAccess]::ReadWrite,[System.IO.FileShare]::Read)
      $fs.Close()
    } catch {
      $target = New-SafePath $target
    }
  }

  $enc = New-Object System.Text.UTF8Encoding($false)
  $sw = New-Object System.IO.StreamWriter($target, $true, $enc)
  try {
    $sw.WriteLine($Line)
  } finally {
    $sw.Dispose()
  }

  return $target
}

$ts       = Get-Date -Format "yyyy-MM-dd_HHmmss"
$rand     = (Get-Random -Maximum 10000).ToString("0000")
$AuditPath = Join-Path "docs\audit" ("audit_" + $ts + "_" + $rand + ".md")
$PlanPath  = Join-Path "docs\plan"  ("two-week-plan_pre-mac-mini_" + (Get-Date -Format "yyyy-MM-dd") + ".md")

& powershell -ExecutionPolicy Bypass -File .\docs\audit\run_audit.ps1 | Out-Null

$PlanPath = Append-LineSafe -Path $PlanPath -Line ("- Audit (ok): " + $AuditPath + " @ " + (Get-Date).ToString("s"))
Write-Host ("PLAN_WRITTEN=" + $PlanPath)
