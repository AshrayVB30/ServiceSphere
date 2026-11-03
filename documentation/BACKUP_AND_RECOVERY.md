# ServiceSphere – PostgreSQL Backup & Disaster Recovery Guide

## 1. Overview
ServiceSphere utilizes PostgreSQL (port 5433 / version 18) for all persistent relational data, including user accounts, client tenancy organizations, tickets, approval records, SLA policies, and KPI/KRA performance reviews.

This guide documents the procedures for automated scheduled backups, manual snapshot generation, verification, and disaster recovery.

---

## 2. Automated Daily Backup Script (`backup_db.ps1`)

The backup script is located at: `backend/scripts/backup_db.ps1`.

### Execution:
```powershell
# From E:\ServiceSphere\backend:
.\scripts\backup_db.ps1 -BackupDir "E:\ServiceSphere\backups" -RetentionDays 14
```

### Features:
1. Automatically parses database credentials securely from `.env`.
2. Generates timestamped, compressed custom format dumps: `servicesphere_db_backup_YYYYMMDD_HHMMSS.dump`.
3. Verifies that the resulting archive is non-empty.
4. Auto-prunes backups older than the configured retention period (default: 14 days).

---

## 3. Database Restoration Procedure (`restore_db.ps1`)

The restoration script is located at: `backend/scripts/restore_db.ps1`.

### Execution:
```powershell
# From E:\ServiceSphere\backend:
.\scripts\restore_db.ps1 -BackupFile "E:\ServiceSphere\backups\servicesphere_db_backup_YYYYMMDD_HHMMSS.dump"
```

### Recovery Flags:
- `--clean`: Drops existing database objects prior to creating them.
- `--if-exists`: Avoids errors if objects do not exist yet.
- `--no-owner`: Prevents permission issues across different PostgreSQL users.
- `--no-privileges`: Prevents overwriting target system role privileges.

---

## 4. Manual CLI Commands (Direct `pg_dump` & `pg_restore`)

If running outside the PowerShell script:

### Manual Backup:
```powershell
$env:PGPASSWORD = "ashray"
pg_dump -h 127.0.0.1 -p 5433 -U postgres -d servicesphere_db -F c -b -v -f "E:\ServiceSphere\backups\manual_snapshot.dump"
```

### Manual Restore:
```powershell
$env:PGPASSWORD = "ashray"
pg_restore -h 127.0.0.1 -p 5433 -U postgres -d servicesphere_db --clean --if-exists --no-owner -v "E:\ServiceSphere\backups\manual_snapshot.dump"
```

---

## 5. Automated Windows Task Scheduler Setup

To run daily automated backups at 02:00 AM:

```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File E:\ServiceSphere\backend\scripts\backup_db.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "ServiceSphere_Daily_DB_Backup" -Description "Daily PostgreSQL backup for ServiceSphere"
```

