param()

$ErrorActionPreference = "Stop"

function New-SafePath {
  param([string]$Path)
  $dir  = Split-Path -Parent $Path
  $name = [System.IO.Path]::GetFileNameWithoutExtension($Path)
  $ext  = [System.IO.Path]::GetExtension($Path)
  $ts   = Get-Date -Format "yyyy-MM-dd_HHmmss"
  $rand = (Get-Random -Maximum 10000).ToString("0000")
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  return (Join-Path $dir ($name + "_" + $ts + "_" + $rand + $ext))
}

function Write-Utf8File {
  param(
    [string]$Path,
    [string[]]$Lines
  )
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

  $final = $Path
  $tmp   = Join-Path $dir ([System.IO.Path]::GetRandomFileName() + ".tmp")
  $enc   = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($tmp, $Lines, $enc)

  try {
    Move-Item -Force $tmp $final
  } catch {
    $fallback = New-SafePath $final
    Move-Item -Force $tmp $fallback
    $script:OutFile = $fallback
  }
}

$ts     = Get-Date -Format "yyyy-MM-dd_HHmmss"
$rand   = (Get-Random -Maximum 10000).ToString("0000")
$OutFile = Join-Path "docs\audit" ("audit_" + $ts + "_" + $rand + ".md")

$lines = @(
  "# AAE Codebase Audit"
  ""
  "- Timestamp: " + (Get-Date).ToString("s")
  "- Branch: " + (git branch --show-current)
  "- Commit: " + (git rev-parse --short HEAD)
  ""
  "## Notes"
  ""
  "- Audit generated without auto-open."
)

Write-Utf8File -Path $OutFile -Lines $lines
Write-Host ("AUDIT_WRITTEN=" + $OutFile)
