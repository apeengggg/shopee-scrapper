param(
  [int] $LeadMapsPort = 3001,
  [int] $LandingPagesPort = 3002
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apps = @(
  @{
    Name = "Lead Maps Agent"
    Path = Join-Path $root "agents-lead-maps"
    Port = $LeadMapsPort
  },
  @{
    Name = "Landing Page Agent"
    Path = Join-Path $root "agents-landing-pages"
    Port = $LandingPagesPort
  }
)

foreach ($app in $apps) {
  if (-not (Test-Path (Join-Path $app.Path ".env"))) {
    Copy-Item (Join-Path $app.Path ".env.example") (Join-Path $app.Path ".env")
  }

  if (-not (Test-Path (Join-Path $app.Path "node_modules"))) {
    Push-Location $app.Path
    npm.cmd install
    Pop-Location
  }

  Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList @("/K", "cd /d $($app.Path) && npm.cmd run dev -- -p $($app.Port)") `
    -WindowStyle Minimized

  Write-Output "$($app.Name) starting on http://localhost:$($app.Port)"
}

Write-Output "Each app runs in a minimized terminal window."
