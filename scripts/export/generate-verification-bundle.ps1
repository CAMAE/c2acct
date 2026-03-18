$ErrorActionPreference = "Stop"

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Stamp = if ($env:AUDIT_BUNDLE_TIMESTAMP) { $env:AUDIT_BUNDLE_TIMESTAMP } else { (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ") }
$OutDir = Join-Path $RootDir "artifacts\audit-bundles\$Stamp\verification"
$LogDir = Join-Path $OutDir "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$resultsPath = Join-Path $OutDir "command-results.tsv"
Set-Content $resultsPath ""

function Invoke-CapturedCommand {
  param(
    [string]$Name,
    [string]$Command
  )

  $logPath = Join-Path $LogDir "$Name.log"
  try {
    Invoke-Expression $Command *> $logPath
    Add-Content $resultsPath "$Name`t0`t$logPath"
  } catch {
    Add-Content $resultsPath "$Name`t1`t$logPath"
  }
}

Invoke-CapturedCommand -Name "tsc" -Command "npx tsc --noEmit"
Invoke-CapturedCommand -Name "build" -Command "npm run build"
Invoke-CapturedCommand -Name "lint" -Command "npm run lint -- --no-cache"
Invoke-CapturedCommand -Name "verify_ops_hardening" -Command "npm run verify:ops-hardening"
Invoke-CapturedCommand -Name "verify_visibility_matrix" -Command "npm run verify:visibility-matrix"
Invoke-CapturedCommand -Name "verify_external_review_trust" -Command "npm run verify:external-review-trust"
Invoke-CapturedCommand -Name "verify_external_review_concurrency" -Command "npm run verify:external-review-concurrency"
Invoke-CapturedCommand -Name "verify_membership_viewer_context" -Command "npm run verify:membership-viewer-context"
Invoke-CapturedCommand -Name "verify_product_intelligence_gates" -Command "npm run verify:product-intelligence-gates"
Invoke-CapturedCommand -Name "verify_product_intelligence_unification" -Command "npm run verify:product-intelligence-unification"
Invoke-CapturedCommand -Name "verify_learning_content" -Command "npm run verify:learning-content"
Invoke-CapturedCommand -Name "verify_repo_hygiene" -Command "npm run verify:repo-hygiene"
Invoke-CapturedCommand -Name "verify_audit_closure" -Command "npm run verify:audit-closure"
Invoke-CapturedCommand -Name "verify_read_path_purity" -Command "node --experimental-strip-types scripts/verify-read-path-purity.ts"
Invoke-CapturedCommand -Name "verify_operator_surface_auth" -Command "node --experimental-strip-types scripts/verify-operator-surface-auth.ts"
Invoke-CapturedCommand -Name "verify_admin_operator_auth" -Command "node --experimental-strip-types scripts/verify-admin-operator-auth.ts"

$packageJson = Get-Content (Join-Path $RootDir "package.json") | ConvertFrom-Json
if ($packageJson.scripts.test) {
  Invoke-CapturedCommand -Name "test" -Command "npm test"
} else {
  Add-Content $resultsPath "test`tmissing`tno npm test script present"
}

@"
# Verification Packet Index

Bundle timestamp: $Stamp

Command results are in command-results.tsv.
Detailed logs are in logs/.

If a command is marked missing, the repo did not expose that script.
"@ | Set-Content (Join-Path $OutDir "VERIFICATION_PACKET_INDEX.md")

Write-Host "Verification bundle generated at $OutDir"
