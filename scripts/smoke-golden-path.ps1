[CmdletBinding()]
param([string]$Base="http://localhost:3000")

$ErrorActionPreference="Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/c2acct?schema=public"
}

$moduleKeys = @(
  "firm_alignment_operating_model_v1",
  "firm_alignment_automation_ai_v1",
  "firm_alignment_data_flow_v1",
  "firm_alignment_governance_v1",
  "firm_alignment_strategy_v1"
)

node .\scripts\seed-firm-alignment.mjs | Out-Host
node .\scripts\seed-demo-company.mjs   | Out-Host
node .\scripts\check-question-count.js | Out-Host

$companyId = (node .\scripts\_get-demo-company-id.mjs | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($companyId)) { throw "Demo Company not found" }

foreach ($moduleKey in $moduleKeys) {
  $mod = (curl.exe -sS "$Base/api/survey/module/$moduleKey" | ConvertFrom-Json)
  if (-not $mod.id) { throw ("Module fetch failed for " + $moduleKey + ": " + ($mod | ConvertTo-Json -Compress)) }
  Write-Host "MODULE_OK key=$($mod.key) id=$($mod.id) questions=$($mod.questions.Count)"
}

Write-Host "DEMO_COMPANY_ID=$companyId"
Write-Host "CANONICAL_FIRM_ENTRY=$Base/firm/alignment-assessment"
Write-Host "COMPAT_REDIRECT=$Base/survey -> /firm/alignment-assessment"

Write-Host "AUTH_REQUIRED: Protected routes now require authenticated browser/session."
Write-Host "AUTH_REQUIRED: /api/survey/submit"
Write-Host "AUTH_REQUIRED: /api/results"
Write-Host "AUTH_REQUIRED: /api/badges/earned"
Write-Host "AUTH_REQUIRED: /api/insights/unlocked"
Write-Host "NEXT_STEP: Sign in via $Base/login, then validate firm assessment, results, and outputs in the browser session."

Write-Host "OPEN => $Base/firm/alignment-assessment"
Write-Host "OPEN => $Base/results"
Write-Host "OPEN => $Base/outputs"
start "$Base/firm/alignment-assessment"
start "$Base/results"
start "$Base/outputs"
