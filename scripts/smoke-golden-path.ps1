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

$answers = @{}
foreach ($q in $mod.questions) { $answers[$q.id] = 3 }

$payloadObj = @{
  companyId = $companyId
  moduleKey = $mod.key
  answers   = $answers
}

$tmp = Join-Path $env:TEMP ("aae_submit_" + [guid]::NewGuid().ToString("N") + ".json")
$payloadObj | ConvertTo-Json -Depth 20 -Compress | Out-File -FilePath $tmp -Encoding utf8

$resp = curl.exe -sS -X POST "$Base/api/survey/submit" -H "Content-Type: application/json" --data-binary "@$tmp"
Remove-Item -Force $tmp -ErrorAction SilentlyContinue

Write-Host "SUBMIT_RESP=$resp"

# hit APIs with explicit companyId (your routes are returning 'companyId required')
curl.exe -sS "$Base/api/results?companyId=$companyId"
curl.exe -sS "$Base/api/badges/earned?companyId=$companyId"

Write-Host "OPEN => $Base/results"
Write-Host "OPEN => $Base/outputs"
start "$Base/results"
start "$Base/outputs"
