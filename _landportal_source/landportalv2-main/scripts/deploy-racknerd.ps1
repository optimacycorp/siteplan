param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteTarget,

  [Parameter(Mandatory = $true)]
  [string]$RemoteRoot
)

$ErrorActionPreference = "Stop"

npm.cmd run build --workspace @landportal/web
ssh $RemoteTarget "mkdir -p '$RemoteRoot'"
scp -r apps/web/dist/* "${RemoteTarget}:$RemoteRoot/"

Write-Host "Deployment complete: https://landportalv2.frcell.com"
