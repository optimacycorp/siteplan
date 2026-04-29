param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteTarget,

  [Parameter(Mandatory = $true)]
  [string]$RemoteRoot
)

$ErrorActionPreference = "Stop"
$env:PATH = "$HOME/.local/bin;$env:PATH"
$env:NODE_OPTIONS = "--max-old-space-size=1024"

pnpm --filter @landportal/web build
ssh $RemoteTarget "mkdir -p '$RemoteRoot'"
scp -r apps/web/dist/* "${RemoteTarget}:$RemoteRoot/"

Write-Host "Deployment complete: https://landportalv3.frcell.com"
