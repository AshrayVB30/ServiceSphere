<#
.SYNOPSIS
    Automated PostgreSQL Database Backup Script for ServiceSphere.

.DESCRIPTION
    Creates a timestamped, compressed PostgreSQL backup using pg_dump.
    Verifies that the dump file is non-empty and prunes backups older than the retention window.

.PARAMETER BackupDir
    Directory path where backup archives will be stored. Default: E:\ServiceSphere\backups

.PARAMETER RetentionDays
    Number of days to keep backup files before auto-pruning. Default: 14 days
#>

param (
    [string]$BackupDir = "E:\ServiceSphere\backups",
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

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

# 2. Ensure Backup Destination Directory Exists
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "[INFO] Created backup directory at $BackupDir" -ForegroundColor Cyan
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dumpFileName = "${dbName}_backup_${timestamp}.dump"
$dumpFilePath = Join-Path $BackupDir $dumpFileName

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Starting PostgreSQL Backup for $dbName ($dbHost:$dbPort) " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# 3. Locate pg_dump executable
$pgDumpCmd = Get-Command "pg_dump" -ErrorAction SilentlyContinue
if (!$pgDumpCmd) {
    # Check common PostgreSQL installation paths on Windows
    $possiblePaths = @(
        "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
    )
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $pgDumpCmd = $path
            break
        }
    }
}

if (!$pgDumpCmd) {
    Write-Error "[ERROR] pg_dump utility not found in PATH or standard installation directories. Please install PostgreSQL client tools or add bin directory to PATH."
    exit 1
}

# 4. Execute pg_dump with custom compressed archive format (-F c)
Write-Host "[INFO] Executing pg_dump into $dumpFilePath..." -ForegroundColor Yellow
$dumpArgs = @(
    "-h", $dbHost,
    "-p", $dbPort,
    "-U", $dbUser,
    "-d", $dbName,
    "-F", "c",
    "-b",
    "-v",
    "-f", $dumpFilePath
)

& $pgDumpCmd @dumpArgs

# 5. Verify Backup Integrity
if ((Test-Path $dumpFilePath) -and ((Get-Item $dumpFilePath).Length -gt 0)) {
    $sizeMB = [math]::Round(((Get-Item $dumpFilePath).Length / 1MB), 2)
    Write-Host "[SUCCESS] Database backup completed successfully!" -ForegroundColor Green
    Write-Host "  File: $dumpFilePath"
    Write-Host "  Size: $sizeMB MB"
} else {
    Write-Error "[FAILED] Backup file was not created or is empty."
    exit 1
}

# 6. Retention Policy Pruning
Write-Host "[INFO] Pruning backup files older than $RetentionDays days..." -ForegroundColor Gray
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "${dbName}_backup_*.dump" | Where-Object { $_.CreationTime -lt $cutoffDate } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "[PRUNED] Removed expired backup archive: $($_.Name)" -ForegroundColor DarkGray
}

Write-Host "[COMPLETE] Backup and retention cycle finished." -ForegroundColor Green

