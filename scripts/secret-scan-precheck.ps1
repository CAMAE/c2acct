$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $RepoRoot ".gitleaks.toml"
$Gitleaks = Get-Command gitleaks -ErrorAction SilentlyContinue
$Docker = Get-Command docker -ErrorAction SilentlyContinue

if ($Gitleaks) {
  & $Gitleaks.Source dir $RepoRoot --config $ConfigPath --redact --no-banner
  exit $LASTEXITCODE
}

if ($Docker) {
  & $Docker.Source run --rm -v "${RepoRoot}:/repo" zricethezav/gitleaks:latest dir /repo --config /repo/.gitleaks.toml --redact --no-banner
  exit $LASTEXITCODE
}

throw "gitleaks precheck unavailable: install gitleaks locally or use Docker Desktop, then rerun 'npm run secrets:scan'."
