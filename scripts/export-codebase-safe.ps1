$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
node "$RepoRoot/scripts/export-codebase-safe.mjs" --source "$RepoRoot" @args
