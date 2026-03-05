[CmdletBinding()]
param([string]$Base="http://localhost:3000")

$ErrorActionPreference="Stop"
Set-Location C:\dev\AAE\c2acct

$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aae?schema=public"

# seed module + company (idempotent)
node .\scripts\seed-firm-alignment.mjs | Out-Host
node .\scripts\seed-demo-company.mjs   | Out-Host

# fetch module
$mod = (curl.exe -sS "$Base/api/survey/module/firm_alignment_v1" | ConvertFrom-Json)
if (-not $mod.id) { throw "Module fetch failed: $($mod | ConvertTo-Json -Compress)" }

# get companyId from DB via node one-liner (no TS)
$companyId = node -e "const {PrismaClient}=require('@prisma/client'); (async()=>{const p=new PrismaClient(); const c=await p.company.findFirst({where:{name:'Demo Company'},select:{id:true}}); console.log(c?.id||''); await p.\$disconnect();})().catch(e=>{console.error(e); process.exit(1);});"
$companyId = ($companyId | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($companyId)) { throw "Demo Company not found" }

# build answers payload from returned questions (use 3s)
$answers = @{}
foreach ($q in $mod.questions) { $answers[$q.id] = 3 }

# IMPORTANT: match server contract. Default: companyId + moduleId + answers
$payload = @{
  companyId = $companyId
  moduleId  = $mod.id
  answers   = $answers
} | ConvertTo-Json -Depth 10 -Compress

# submit
$resp = curl.exe -sS -X POST "$Base/api/survey/submit" -H "Content-Type: application/json" -d $payload
Write-Host "SUBMIT_RESP=$resp"

# sanity checks
curl.exe -sS "$Base/api/results"
curl.exe -sS "$Base/api/badges/earned"
