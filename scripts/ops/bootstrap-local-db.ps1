$ErrorActionPreference = "Stop"

$ContainerName = if ($env:AAE_LOCAL_DB_CONTAINER) { $env:AAE_LOCAL_DB_CONTAINER } else { "c2acct-local-db" }
$DbPort = if ($env:AAE_LOCAL_DB_PORT) { $env:AAE_LOCAL_DB_PORT } else { "5433" }
$DbName = if ($env:AAE_LOCAL_DB_NAME) { $env:AAE_LOCAL_DB_NAME } else { "c2acct" }
$DbUser = if ($env:AAE_LOCAL_DB_USER) { $env:AAE_LOCAL_DB_USER } else { "postgres" }
$DbPassword = if ($env:AAE_LOCAL_DB_PASSWORD) { $env:AAE_LOCAL_DB_PASSWORD } else { "postgres" }
$DbImage = if ($env:AAE_LOCAL_DB_IMAGE) { $env:AAE_LOCAL_DB_IMAGE } else { "postgres:16" }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "BOOTSTRAP_LOCAL_DB_ERROR docker is required for the scripted local DB path."
}

$Existing = docker ps -aq --filter "name=^/$ContainerName$"
if ($Existing) {
  $Running = docker ps -q --filter "name=^/$ContainerName$"
  if ($Running) {
    Write-Host "BOOTSTRAP_LOCAL_DB_OK container already running: $ContainerName"
  } else {
    docker start $ContainerName | Out-Null
    Write-Host "BOOTSTRAP_LOCAL_DB_OK container started: $ContainerName"
  }
} else {
  docker run -d `
    --name $ContainerName `
    -e "POSTGRES_DB=$DbName" `
    -e "POSTGRES_USER=$DbUser" `
    -e "POSTGRES_PASSWORD=$DbPassword" `
    -p "${DbPort}:5432" `
    $DbImage | Out-Null
  Write-Host "BOOTSTRAP_LOCAL_DB_OK container created: $ContainerName"
}

Write-Host "Suggested DATABASE_URL shape:"
Write-Host "postgresql://${DbUser}:<password>@localhost:${DbPort}/${DbName}?schema=public"
Write-Host "If you use the default bootstrap password, replace <password> with ${DbPassword} in your local env."
