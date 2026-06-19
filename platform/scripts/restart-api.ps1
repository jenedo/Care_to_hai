# Restart AsaanCare API on Windows (free port 3000, rebuild, start)
$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  Write-Host "Stopping PID $($conn.OwningProcess) on port 3000..."
  Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

$apiDir = Join-Path $PSScriptRoot "..\artifacts\api-server"
Set-Location $apiDir
Write-Host "Building API..."
pnpm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Starting API on http://localhost:3000 ..."
node --env-file=.env --enable-source-maps ./dist/index.mjs
