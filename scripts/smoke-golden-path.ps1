[CmdletBinding()]
param([string]$Base="http://localhost:3000")

$ErrorActionPreference="Stop"
Set-Location C:\dev\AAE\c2acct

$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aae?schema=public"

node .\scripts\seed-firm-alignment.mjs | Out-Host
node .\scripts\seed-demo-company.mjs   | Out-Host

$mod = (curl.exe -sS "$Base/api/survey/module/firm_alignment_v1" | ConvertFrom-Json)
if (-not $mod.id) { throw "Module fetch failed: $($mod | ConvertTo-Json -Compress)" }

$companyId = (node .\scripts\_get-demo-company-id.mjs | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($companyId)) { throw "Demo Company not found" }

$answers = @{}
foreach ($q in $mod.questions) { $answers[$q.id] = 3 }

$payload = @{
  companyId = $companyId
  moduleKey = $mod.key
  answers   = $answers
} | ConvertTo-Json -Depth 10 -Compress

$resp = curl.exe -sS -X POST "$Base/api/survey/submit" -H "Content-Type: application/json" -d $payload
Write-Host "SUBMIT_RESP=$resp"

curl.exe -sS "$Base/api/results"
curl.exe -sS "$Base/api/badges/earned"
