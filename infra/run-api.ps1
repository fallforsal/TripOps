param([switch]$Lan)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$env:DOTNET_CLI_HOME = Join-Path $taskRoot '.local/dotnet'
$env:NUGET_PACKAGES = Join-Path $taskRoot '.local/nuget'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$apiUrl = if ($Lan) { 'http://0.0.0.0:5080' } else { 'http://localhost:5080' }
Push-Location $taskRoot
try {
    dotnet run --project backend/src/TripOps.Api --no-launch-profile --urls $apiUrl
    exit $LASTEXITCODE
} finally { Pop-Location }
