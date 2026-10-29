# Start an isolated local PostgreSQL used only by the pytest suite.
# Does not touch the system Postgres service or Neon.
#
# Usage (from repo root or backend/):
#   powershell -ExecutionPolicy Bypass -File backend/scripts/start_test_postgres.ps1
#
# Then run tests (auto-detects this DB, or set explicitly):
#   $env:TEST_DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/vestor_test"
#   cd backend; .\venv\Scripts\python.exe -m pytest

$ErrorActionPreference = "Stop"

$pgBinCandidates = @(
    "C:\Program Files\PostgreSQL\18\bin",
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin"
)
$pgBin = $pgBinCandidates | Where-Object { Test-Path "$_\initdb.exe" } | Select-Object -First 1
if (-not $pgBin) {
    throw "PostgreSQL binaries not found under 'C:\Program Files\PostgreSQL'. Install PostgreSQL locally."
}

$port = 55432
$dataDir = Join-Path $env:LOCALAPPDATA "vestor\pg_test"
$logFile = Join-Path $dataDir "logfile"
$dbUrl = "postgresql://postgres@127.0.0.1:$port/vestor_test"

New-Item -ItemType Directory -Force -Path (Split-Path $dataDir) | Out-Null

$running = $false
try {
    & "$pgBin\pg_isready.exe" -h 127.0.0.1 -p $port -U postgres | Out-Null
    if ($LASTEXITCODE -eq 0) { $running = $true }
} catch {
    $running = $false
}

if (-not $running) {
    if (-not (Test-Path (Join-Path $dataDir "PG_VERSION"))) {
        Write-Host "Initializing test Postgres cluster at $dataDir"
        & "$pgBin\initdb.exe" -D $dataDir -U postgres --auth=trust --encoding=UTF8 --locale=C
    }
    Write-Host "Starting test Postgres on port $port"
    & "$pgBin\pg_ctl.exe" -D $dataDir -l $logFile -o "-p $port -c listen_addresses=127.0.0.1" start
    Start-Sleep -Seconds 2
}

$dbExists = & "$pgBin\psql.exe" -h 127.0.0.1 -p $port -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='vestor_test'"
if ($dbExists -ne "1") {
    Write-Host "Creating database vestor_test"
    & "$pgBin\psql.exe" -h 127.0.0.1 -p $port -U postgres -c "CREATE DATABASE vestor_test;"
}

Write-Host ""
Write-Host "Test database ready:"
Write-Host "  $dbUrl"
Write-Host ""
Write-Host "Optional (pytest also auto-detects this URL when reachable):"
Write-Host "  `$env:TEST_DATABASE_URL = '$dbUrl'"
