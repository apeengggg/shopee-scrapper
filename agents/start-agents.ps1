param(
  [string] $ConfigPath = ".\agents.config.json",
  [switch] $SkipDocker,
  [switch] $SkipInstall
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$resolvedConfig = Resolve-Path (Join-Path $root $ConfigPath)
$config = Get-Content $resolvedConfig -Raw | ConvertFrom-Json
$agents = @($config.agents | Where-Object { $_.enabled -eq $true })

foreach ($agent in $agents) {
  $appPath = Join-Path $root $agent.folder
  if (-not (Test-Path $appPath)) {
    Write-Warning "$($agent.name) folder not found: $appPath"
    continue
  }

  $envPath = Join-Path $appPath ".env"
  $envExamplePath = Join-Path $appPath ".env.example"
  if (-not (Test-Path $envPath) -and (Test-Path $envExamplePath)) {
    Copy-Item $envExamplePath $envPath
  }

  if (-not $SkipInstall -and -not (Test-Path (Join-Path $appPath "node_modules"))) {
    Push-Location $appPath
    npm.cmd install
    Pop-Location
  }

  if (-not $SkipDocker -and $agent.databaseCompose -eq $true -and (Test-Path (Join-Path $appPath "docker-compose.yml"))) {
    Push-Location $appPath
    docker compose up -d postgres
    Pop-Location
  }

  Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList @("/K", "cd /d $appPath && $($agent.devCommand)") `
    -WindowStyle Minimized

  Write-Output "$($agent.name) starting on $($agent.url)"
}

Write-Output ""
Write-Output "Health checks:"
Start-Sleep -Seconds 8

foreach ($agent in $agents) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing $agent.url -TimeoutSec 8
    Write-Output "$($agent.name): $($response.StatusCode) $($response.StatusDescription) - $($agent.url)"
  } catch {
    Write-Output "$($agent.name): not ready - $($agent.url)"
  }
}

Write-Output ""
Write-Output "Each app runs in a minimized terminal window."
