$ErrorActionPreference = "Stop"

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Stamp = if ($env:AUDIT_BUNDLE_TIMESTAMP) { $env:AUDIT_BUNDLE_TIMESTAMP } else { (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ") }
$BundleRoot = Join-Path $RootDir "artifacts\audit-bundles\$Stamp"
$LatestRoot = Join-Path $RootDir "artifacts\audit-bundles\latest"

if (Test-Path $BundleRoot) { Remove-Item $BundleRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path `
  (Join-Path $BundleRoot "current-build-audit"), `
  (Join-Path $BundleRoot "audit-docs"), `
  (Join-Path $BundleRoot "final-docs"), `
  (Join-Path $BundleRoot "research"), `
  (Join-Path $BundleRoot "learning"), `
  (Join-Path $BundleRoot "ops\mac-mini") | Out-Null

$auditOutDir = Join-Path $BundleRoot "current-build-audit"
New-Item -ItemType Directory -Force -Path $auditOutDir | Out-Null

Get-ChildItem $RootDir\audit -Filter *.md | Copy-Item -Destination (Join-Path $BundleRoot "audit-docs")
Get-ChildItem $RootDir -Filter "FINAL_*.md" | Copy-Item -Destination (Join-Path $BundleRoot "final-docs")
Get-ChildItem $RootDir\research -Filter *.md | Copy-Item -Destination (Join-Path $BundleRoot "research")
Copy-Item $RootDir\content\user-learning -Destination (Join-Path $BundleRoot "learning") -Recurse
Copy-Item $RootDir\ops\mac-mini -Destination (Join-Path $BundleRoot "ops") -Recurse
Copy-Item $RootDir\scripts\mac-mini -Destination (Join-Path $BundleRoot "ops\scripts") -Recurse -Force

$repoTree = Get-ChildItem $RootDir -Recurse -File |
  Where-Object {
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.FullName -notmatch '\\.next\\' -and
    $_.FullName -notmatch '\\.git\\' -and
    $_.FullName -notmatch '\\artifacts\\audit-bundles\\'
  } |
  Sort-Object FullName |
  ForEach-Object { $_.FullName.Replace($RootDir + '\', '') }
$repoTree | Set-Content (Join-Path $auditOutDir "repo-tree.txt")

git -C $RootDir status --short --branch | Set-Content (Join-Path $auditOutDir "git-status.txt")
git -C $RootDir log --date=iso --pretty=format:"%h %ad %s" -n 30 | Set-Content (Join-Path $auditOutDir "git-log.txt")

New-Item -ItemType Directory -Force -Path (Join-Path $auditOutDir "inventories"), (Join-Path $auditOutDir "configs"), (Join-Path $auditOutDir "docs") | Out-Null

Get-ChildItem $RootDir\app -Recurse -File |
  Where-Object { $_.Name -in @("page.tsx", "route.ts", "layout.tsx") } |
  Sort-Object FullName |
  ForEach-Object { $_.FullName.Replace($RootDir + '\', '') } |
  Set-Content (Join-Path $auditOutDir "inventories\route-and-page-files.txt")

Get-ChildItem $RootDir\app -Recurse -File -Filter route.ts |
  Sort-Object FullName |
  ForEach-Object { $_.FullName.Replace($RootDir + '\', '') } |
  Set-Content (Join-Path $auditOutDir "inventories\api-routes.txt")

Get-ChildItem $RootDir\app -Recurse -File -Filter page.tsx |
  Sort-Object FullName |
  ForEach-Object { $_.FullName.Replace($RootDir + '\', '') } |
  Set-Content (Join-Path $auditOutDir "inventories\app-pages.txt")

Get-ChildItem $RootDir\components -Recurse -File |
  Sort-Object FullName |
  ForEach-Object { $_.FullName.Replace($RootDir + '\', '') } |
  Set-Content (Join-Path $auditOutDir "inventories\component-files.txt")

Select-String -Path $RootDir\prisma\schema.prisma -Pattern '^model |^enum ' | ForEach-Object { $_.Line } | Set-Content (Join-Path $auditOutDir "inventories\model-entity-summary.txt")
Get-ChildItem $RootDir\prisma\migrations -Recurse -File | Sort-Object FullName | ForEach-Object { $_.FullName.Replace($RootDir + '\', '') } | Set-Content (Join-Path $auditOutDir "inventories\migrations.txt")

Get-ChildItem $RootDir\research -Recurse -File | Sort-Object FullName | ForEach-Object { $_.FullName.Replace($RootDir + '\', '') } | Set-Content (Join-Path $auditOutDir "inventories\research-index.txt")
Get-ChildItem $RootDir\content\user-learning -Recurse -File | Sort-Object FullName | ForEach-Object { $_.FullName.Replace($RootDir + '\', '') } | Set-Content (Join-Path $auditOutDir "inventories\learning-corpus-index.txt")
Get-ChildItem $RootDir\ops\mac-mini -Recurse -File | Sort-Object FullName | ForEach-Object { $_.FullName.Replace($RootDir + '\', '') } | Set-Content (Join-Path $auditOutDir "inventories\mac-mini-ops-index.txt")
Get-ChildItem $RootDir\scripts\mac-mini -Recurse -File | Sort-Object FullName | ForEach-Object { $_.FullName.Replace($RootDir + '\', '') } | Set-Content (Join-Path $auditOutDir "inventories\mac-mini-script-index.txt")
Get-ChildItem $RootDir\audit -File | Sort-Object FullName | ForEach-Object { $_.FullName.Replace($RootDir + '\', '') } | Set-Content (Join-Path $auditOutDir "inventories\audit-docs-index.txt")
Get-ChildItem $RootDir -Filter "FINAL_*.md" | Sort-Object FullName | ForEach-Object { $_.FullName.Replace($RootDir + '\', '') } | Set-Content (Join-Path $auditOutDir "inventories\final-docs-index.txt")

Copy-Item $RootDir\package.json -Destination (Join-Path $auditOutDir "configs\package.json")
if (Test-Path $RootDir\package-lock.json) { Copy-Item $RootDir\package-lock.json -Destination (Join-Path $auditOutDir "configs\package-lock.json") }
if (Test-Path $RootDir\pnpm-lock.yaml) { Copy-Item $RootDir\pnpm-lock.yaml -Destination (Join-Path $auditOutDir "configs\pnpm-lock.yaml") }
Copy-Item $RootDir\tsconfig.json -Destination (Join-Path $auditOutDir "configs\tsconfig.json")
Copy-Item $RootDir\next.config.ts -Destination (Join-Path $auditOutDir "configs\next.config.ts")
Copy-Item $RootDir\auth.config.ts -Destination (Join-Path $auditOutDir "configs\auth.config.ts")
Copy-Item $RootDir\auth.ts -Destination (Join-Path $auditOutDir "configs\auth.ts")
Copy-Item $RootDir\prisma\schema.prisma -Destination (Join-Path $auditOutDir "configs\schema.prisma")
if (Test-Path $RootDir\.env.example) { Copy-Item $RootDir\.env.example -Destination (Join-Path $auditOutDir "configs\.env.example") }
if (Test-Path $RootDir\docs\ops\ENVIRONMENT_AND_LAUNCH_CONTRACT.md) { Copy-Item $RootDir\docs\ops\ENVIRONMENT_AND_LAUNCH_CONTRACT.md -Destination (Join-Path $auditOutDir "docs\ENVIRONMENT_AND_LAUNCH_CONTRACT.md") }
if (Test-Path $RootDir\docs\ops\LOCAL_AND_STAGING_BOOTSTRAP.md) { Copy-Item $RootDir\docs\ops\LOCAL_AND_STAGING_BOOTSTRAP.md -Destination (Join-Path $auditOutDir "docs\LOCAL_AND_STAGING_BOOTSTRAP.md") }

@"
# Audit Bundle

Bundle timestamp: $Stamp

Sections:

- current-build-audit/
- audit-docs/
- final-docs/
- research/
- learning/user-learning/
- ops/mac-mini/
- ops/scripts/mac-mini/
"@ | Set-Content (Join-Path $BundleRoot "README.md")

if (Test-Path $LatestRoot) { Remove-Item $LatestRoot -Recurse -Force }
Copy-Item $BundleRoot -Destination $LatestRoot -Recurse
Set-Content (Join-Path $RootDir "artifacts\audit-bundles\LATEST_BUNDLE.txt") $Stamp
Set-Content (Join-Path $RootDir "artifacts\audit-bundles\LATEST_BUNDLE_PATH.txt") $BundleRoot

Write-Host "Audit bundle generated at $BundleRoot"
