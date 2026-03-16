param(
  [string]$CompanyId = "746b2c20-4487-4da7-a76d-cc60cb546c9c",
  [string]$ModuleKey = "firm_alignment_v1",
  [string]$BaseUrl   = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$internalHealthKey = $env:INTERNAL_HEALTHCHECK_KEY

# --- ensure dev server is healthy (probe ports) ---
$ports = @(
  ([uri]$BaseUrl).Port,
  3000, 3001, 3002
) | Select-Object -Unique

$chosen = $null
foreach ($p in $ports) {
  $u = "http://localhost:$p/api/health/db"
  $args = @("-s", "-o", "NUL", "-w", "%{http_code}")
  if ($internalHealthKey) {
    $args += @("-H", "x-aae-internal-health-key: $internalHealthKey")
  }
  $args += $u
  $code = (& curl.exe @args) 2>$null
  if ($code -eq "200") { $chosen = "http://localhost:$p"; break }
}

if (-not $chosen) {
  Write-Host "Dev server not healthy on ports $($ports -join ', '). Start it manually: pnpm dev" -ForegroundColor Red
  throw "No healthy dev server found (expected /api/health/db = 200)."
}

if ($BaseUrl -ne $chosen) {
  Write-Host "Using dev BaseUrl: $chosen (requested $BaseUrl)" -ForegroundColor Yellow
  $BaseUrl = $chosen
}
# --- end ensure dev server ---
# --- best-effort clear stale next dev lock ---
Remove-Item -Force -ErrorAction SilentlyContinue .\.next\dev\lock
# --- end lock clear ---
$payload = @{
  companyId = $CompanyId
  moduleKey = $ModuleKey
  answers = @{
    leadership_vision_alignment = 3
    strategy_execution_clarity  = 3
    decision_rights_defined     = 3
    kpi_alignment               = 3
    operating_rhythm            = 3
  }
} | ConvertTo-Json -Depth 10

$payload | Out-File -Encoding utf8 -NoNewline .\tmp-submit.json

@"
delete from public."CompanyBadge" where "companyId" = '$CompanyId';
"@ | Set-Content -Encoding UTF8 .\tmp-award-delete-smoke.sql

docker cp .\tmp-award-delete-smoke.sql c2acct-db:/tmp/tmp-award-delete-smoke.sql | Out-Null
docker exec c2acct-db psql -U postgres -d c2acct -f /tmp/tmp-award-delete-smoke.sql | Out-Host

curl.exe -s -o NUL -w "SUBMIT1 HTTP %{http_code}`n" -X POST "$BaseUrl/api/survey/submit" -H "Content-Type: application/json" --data-binary "@tmp-submit.json"
Start-Sleep -Seconds 2
curl.exe -s -o NUL -w "SUBMIT2 HTTP %{http_code}`n" -X POST "$BaseUrl/api/survey/submit" -H "Content-Type: application/json" --data-binary "@tmp-submit.json"

@"
select count(*)::int as n
from public."CompanyBadge"
where "companyId" = '$CompanyId';

select "id","badgeId","moduleId","awardedAt"
from public."CompanyBadge"
where "companyId" = '$CompanyId'
order by "awardedAt" desc;
"@ | Set-Content -Encoding UTF8 .\tmp-award-verify-smoke.sql

docker cp .\tmp-award-verify-smoke.sql c2acct-db:/tmp/tmp-award-verify-smoke.sql | Out-Null
docker exec c2acct-db psql -U postgres -d c2acct -f /tmp/tmp-award-verify-smoke.sql | Out-Host

curl.exe -s "$BaseUrl/api/badges/earned?companyId=$CompanyId" | Out-Host







