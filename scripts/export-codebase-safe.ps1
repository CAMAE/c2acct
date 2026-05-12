$ErrorActionPreference = "Stop"

if (-not $args[0]) {
  throw "Usage: pwsh scripts/export-codebase-safe.ps1 <output-dir>"
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
$Destination = $args[0]

New-Item -ItemType Directory -Force -Path $Destination | Out-Null

$ExcludeDirs = @(
  ".git",
  ".next",
  "node_modules",
  "artifacts\mac-mini",
  "logs",
  ".tmp",
  "tmp",
  "agent-work",
  "playwright-report",
  "test-results",
  "blob-report",
  "coverage",
  ".direnv"
)
$ExcludeFiles = @(".env", ".env.local", ".env.production", ".env.development", ".env.test", ".envrc")

Get-ChildItem -Path $RepoRoot -Force | Where-Object {
  $relative = $_.FullName.Substring($RepoRoot.Length).TrimStart('\','/')
  if ($ExcludeDirs | Where-Object { $relative -eq $_ -or $relative.StartsWith($_ + "\") -or $relative.StartsWith($_ + "/") }) { return $false }
  if (
    $_ -is [System.IO.FileInfo] -and (
      ($ExcludeFiles -contains $_.Name) -or
      $_.Name -like "*.log" -or
      $_.Name -like "*.tmp" -or
      $_.Name -like "*.temp" -or
      $_.Name -like "*.zip" -or
      $_.Name -like "*.tar" -or
      $_.Name -like "*.tar.gz" -or
      $_.Name -like "*.tgz"
    )
  ) { return $false }
  return $true
} | Copy-Item -Destination $Destination -Recurse -Force

Write-Host "Sanitized export created at $Destination"
Write-Host "Excluded: .env* .next node_modules logs artifacts/mac-mini temp files test artifacts archives"
