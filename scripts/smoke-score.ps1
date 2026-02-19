param(
  [Parameter(Mandatory=$true)][string]$Id,
  [string]$Base = "http://localhost:3000"
)

Write-Host "`n--- GET (JSON) ---"
$g = Invoke-RestMethod "$Base/api/engagements/$Id/score"
$g | ConvertTo-Json -Depth 20

Write-Host "`n--- POST (JSON) ---"
$body = @{
  revenueVolatility     = 0.2
  clientResponsiveness  = 0.8
  techStackFragmentation= 0.4
  scopeCreep            = 0.3
} | ConvertTo-Json

$p = Invoke-RestMethod "$Base/api/engagements/$Id/score" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

$p | ConvertTo-Json -Depth 20
