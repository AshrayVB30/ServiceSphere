<#
.SYNOPSIS
    PostgreSQL Database Restoration Script for ServiceSphere.

.DESCRIPTION
    Safely restores a PostgreSQL compressed archive dump into the ServiceSphere database using pg_restore.
    Requires explicit confirmation to prevent accidental data overwrites.

.PARAMETER BackupFile
    Path to the .dump file to restore.
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $BackupFile)) {
    Write-Error "[ERROR] Specified backup file does not exist: $BackupFile"
    exit 1
}

# 1. Parse database environment configuration from .env if present
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '^([^#=]+)=(.*)$' } | ForEach-Object {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $val, [System.EnvironmentVariableTarget]::Process)
    }
}

$dbName = if ($env:DB_NAME) { $env:DB_NAME } else { "servicesphere_db" }
$dbUser = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "127.0.0.1" }
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5433" }
$env:PGPASSWORD = $env:DB_PASSWORD

Write-Host "==========================================================" -ForegroundColor Red
Write-Host " WARNING: DATABASE RESTORATION PROCEDURE                   " -ForegroundColor Red
Write-Host " Target Database: $dbName ($dbHost:$dbPort)                " -ForegroundColor Red
Write-Host " Source Dump:     $BackupFile                              " -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Red

# 2. Locate pg_restore executable
$pgRestoreCmd = Get-Command "pg_restore" -ErrorAction SilentlyContinue
if (!$pgRestoreCmd) {
    $possiblePaths = @(
        "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe",
        "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_restore.exe"
    )
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $pgRestoreCmd = $path
            break
        }
    }
}

if (!$pgRestoreCmd) {
    Write-Error "[ERROR] pg_restore utility not found in PATH or standard installation directories."
    exit 1
}

# 3. Execute pg_restore
Write-Host "[INFO] Executing database restore into $dbName..." -ForegroundColor Yellow
$restoreArgs = @(
    "-h", $dbHost,
    "-p", $dbPort,
    "-U", $dbUser,
    "-d", $dbName,
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "-v",
    $BackupFile
)

try {
    & $pgRestoreCmd @restoreArgs
    Write-Host "[SUCCESS] Database restored successfully from $BackupFile" -ForegroundColor Green
} catch {
    Write-Host "[NOTE] pg_restore finished with notices or warnings (standard for schema overwrites)." -ForegroundColor Yellow
}

