param(
  [string]$CompanyId = "746b2c20-4487-4da7-a76d-cc60cb546c9c",
  [string]$ModuleKey = "firm_alignment_v1",
  [string]$BaseUrl   = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

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
order by ""awardedAt"" desc;
"@ | Set-Content -Encoding UTF8 .\tmp-award-verify-smoke.sql

docker cp .\tmp-award-verify-smoke.sql c2acct-db:/tmp/tmp-award-verify-smoke.sql | Out-Null
docker exec c2acct-db psql -U postgres -d c2acct -f /tmp/tmp-award-verify-smoke.sql | Out-Host

curl.exe -s "$BaseUrl/api/badges/earned?companyId=$CompanyId" | Out-Host

