[CmdletBinding()]
param([string]$Base="http://localhost:3000")

$ErrorActionPreference="Stop"
Set-Location C:\dev\AAE\c2acct
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aae?schema=public"

node .\scripts\seed-firm-alignment.mjs | Out-Host
node .\scripts\seed-demo-company.mjs   | Out-Host

$companyId = (node .\scripts\_get-demo-company-id.mjs | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($companyId)) { throw "Demo Company not found" }

$mod = (curl.exe -sS "$Base/api/survey/module/firm_alignment_v1" | ConvertFrom-Json)
if (-not $mod.id) { throw ("Module fetch failed: " + ($mod | ConvertTo-Json -Compress)) }

Write-Host "MODULE_OK key=$($mod.key) id=$($mod.id)"
Write-Host "DEMO_COMPANY_ID=$companyId"

Write-Host "AUTH_REQUIRED: Protected routes now require authenticated browser/session."
Write-Host "AUTH_REQUIRED: /api/survey/submit"
Write-Host "AUTH_REQUIRED: /api/results"
Write-Host "AUTH_REQUIRED: /api/badges/earned"
Write-Host "AUTH_REQUIRED: /api/insights/unlocked"
Write-Host "NEXT_STEP: Sign in via $Base/login, then validate submit/results/outputs in browser session."

Write-Host "OPEN => $Base/results"
Write-Host "OPEN => $Base/outputs"
start "$Base/results"
start "$Base/outputs"
