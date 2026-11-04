# ServiceSphere — Help Desk & Support Ticket Management System

> Enterprise-grade help desk backend built with **Python**, **Django REST Framework**, and **PostgreSQL**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Prerequisites](#4-prerequisites)
5. [Environment Setup](#5-environment-setup)
6. [Running the Application](#6-running-the-application)
7. [Running Tests](#7-running-tests)
8. [API Overview](#8-api-overview)
9. [User Roles & Permissions](#9-user-roles--permissions)
10. [Ticket State Machine](#10-ticket-state-machine)
11. [SLA Engine](#11-sla-engine)
12. [KPI & KRA System](#12-kpi--kra-system)
13. [Background Tasks (Celery)](#13-background-tasks-celery)
14. [Logging](#14-logging)
15. [Production Checklist](#15-production-checklist)
16. [Database Backup & Recovery](#16-database-backup--recovery)

---

## 1. Project Overview

**ServiceSphere** is a full-featured Help Desk / Support Ticket Management System designed for multi-tenant enterprise environments. It provides:

- **Multi-tenant ticket management** with strict client organization isolation
- **Role-Based Access Control** (ADMIN, SUPPORT_AGENT, CLIENT, APPROVER)
- **Automated SLA monitoring** with multi-tier escalation alerts
- **Ticket approval workflows** with immutable audit trails
- **Knowledge Base** with article publication lifecycle and ticket linking
- **In-app and email notifications** with per-user preference management
- **Analytics & performance reporting** with KPI/KRA evaluation and CSV exports

The backend exposes a **RESTful JSON API** (session-based authentication) consumed by any frontend — the React frontend is planned for a future phase.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  React Frontend (Planned)          Postman / API Clients        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (JSON)
┌──────────────────────────▼──────────────────────────────────────┐
│                  Django REST Framework API                       │
│                                                                  │
│  accounts │ clients │ tickets │ approvals │ sla                 │
│  notifications │ knowledge_base │ analytics │ core              │
└──────┬───────────────────────────────────────────┬──────────────┘
       │ ORM                                        │ Tasks
┌──────▼──────────────────┐             ┌──────────▼──────────────┐
│   PostgreSQL (port 5433) │             │  Celery + Redis Worker  │
│   servicesphere_db       │             │  SLA monitoring, Emails │
└──────────────────────────┘             └─────────────────────────┘
```

**App dependency order** (safe migration order):

```
core → accounts → clients → tickets → approvals → sla → notifications → knowledge_base → analytics
```

---

## 3. Technology Stack

| Component | Technology |
|---|---|
| Language | Python 3.11+ |
| Web Framework | Django 6.1.2 |
| REST API | Django REST Framework 3.18.3 |
| Database | PostgreSQL 14+ (port 5433) |
| Task Queue | Celery 5.x + Redis |
| Auth | Session-based (Django sessions + CSRF) |
| Environment | Conda (env: `servicesphere`) |
| Dev OS | Windows 11, VS Code |
| API Testing | Postman |

---

## 4. Prerequisites

- **Conda** (Anaconda or Miniconda)
- **PostgreSQL** running on port `5433`
- **Redis** running on `127.0.0.1:6379` (for Celery tasks)

---

## 5. Environment Setup

### 5.1 Clone and Create Conda Environment

```bash
git clone <repo-url>
cd ServiceSphere

conda create -n servicesphere python=3.11 -y
conda activate servicesphere

pip install -r backend/requirements.txt
```

### 5.2 Configure Environment Variables

Copy the template and fill in your values:

```bash
cp backend/.env.example backend/.env
```

**Key variables in `.env`:**

| Variable | Description | Example |
|---|---|---|
| `DJANGO_SECRET_KEY` | Cryptographic signing key — keep secret! | `your-secret-key-here` |
| `DJANGO_DEBUG` | `True` in development, **always `False` in production** | `True` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hostnames | `127.0.0.1,localhost` |
| `DB_NAME` | PostgreSQL database name | `servicesphere_db` |
| `DB_USER` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `yourpassword` |
| `DB_HOST` | PostgreSQL host | `127.0.0.1` |
| `DB_PORT` | PostgreSQL port | `5433` |
| `CELERY_BROKER_URL` | Redis URL for Celery | `redis://127.0.0.1:6379/0` |
| `EMAIL_NOTIFICATIONS_ENABLED` | Enable SMTP email sending | `False` |
| `CORS_ALLOWED_ORIGINS` | Frontend origins (comma-separated) | `http://localhost:3000` |
| `CSRF_TRUSTED_ORIGINS` | CSRF-safe origins | `http://localhost:3000` |
| `SECURE_SSL_REDIRECT` | Force HTTPS in production | `False` (dev), `True` (prod) |
| `SESSION_COOKIE_SECURE` | Secure cookie flag | `False` (dev), `True` (prod) |

### 5.3 Set Up the Database

```bash
# Create the database in PostgreSQL first, then apply migrations
cd backend
python manage.py migrate
```

### 5.4 Create a Superuser (Administrator)

```bash
python manage.py createsuperuser
```

---

## 6. Running the Application

### Development Server

```bash
cd backend
python manage.py runserver
```

API available at: `http://127.0.0.1:8000/`

### Celery Worker (SLA Monitoring & Email Notifications)

In a **separate terminal**:

```bash
conda activate servicesphere
cd backend
celery -A config worker --loglevel=info
```

### Celery Beat Scheduler (Periodic SLA Monitoring)

In another **separate terminal**:

```bash
conda activate servicesphere
cd backend
celery -A config beat --loglevel=info
```

> The Celery Beat scheduler triggers SLA deadline monitoring every **5 minutes** automatically.

---

## 7. Running Tests

### Full Test Suite

```bash
cd ServiceSphere
python backend\manage.py test
```

Expected: **147 tests, 0 failures**

### Individual App Tests

```bash
python backend\manage.py test accounts
python backend\manage.py test clients
python backend\manage.py test tickets
python backend\manage.py test approvals
python backend\manage.py test sla
python backend\manage.py test notifications
python backend\manage.py test knowledge_base
python backend\manage.py test analytics
python backend\manage.py test core
```

### System Check

```bash
python backend\manage.py check
python backend\manage.py check --deploy   # Check production readiness
```

---

## 8. API Overview

> Full endpoint details are in [`API_REFERENCE.md`](API_REFERENCE.md).

### Base URL
```
http://127.0.0.1:8000/api/
```

### Authentication
All API endpoints require **session authentication**. Obtain a session by calling:

```
POST /api/auth/login/
Body: { "username": "...", "password": "..." }
```

### Quick Reference

| Group | Base Path | Description |
|---|---|---|
| Auth | `/api/auth/` | Login, logout, profile, CSRF, password change |
| Health | `/api/health/` | System and infrastructure health probes |
| Clients | `/api/clients/` | Client organization management (Admin only) |
| Tickets | `/api/tickets/` | Ticket CRUD, assignment, status transitions |
| Approvals | `/api/approvals/` | Approval workflows with audit trail |
| SLA | `/api/sla/` | SLA policies, tracking, escalations |
| Notifications | `/api/notifications/` | In-app notifications, preferences |
| Knowledge Base | `/api/knowledge/` | Articles, categories, revisions |
| Analytics | `/api/analytics/` | Dashboards, KPIs, KRAs, CSV exports |

---

## 9. User Roles & Permissions

| Role | Description | Key Permissions |
|---|---|---|
| `ADMIN` | System administrator | Full access to all data and management APIs |
| `SUPPORT_AGENT` | Internal support staff | View/manage assigned tickets, post comments, view analytics |
| `CLIENT` | Client company employee | Create tickets for own company, view own company's tickets |
| `APPROVER` | Manager/reviewer | View tickets and approval requests, approve/reject workflows |

**Admin check:** A user is considered a system administrator if `is_superuser=True` OR (`is_staff=True` AND `role='ADMIN'`).

---

## 10. Ticket State Machine

```
        ┌─────────────────────────────────────────┐
        │                                         │
     [OPEN] ──────────────────────► [IN_PROGRESS]
                                        │   ▲
                                        │   │
                               ┌────────┘   │
                               │            │
                               ▼            │
                   [AWAITING_CUSTOMER] ──────┘
                               │
                               │
                               ▼
                           [RESOLVED] ◄──────────────┐
                               │                     │
                               │                     │
                       ┌───────┘                     │
                       │                             │
                       ▼                             │
                   [CLOSED]          ──────────► [IN_PROGRESS]
```

**Allowed Transitions:**

| From | Allowed To |
|---|---|
| `OPEN` | `IN_PROGRESS` |
| `IN_PROGRESS` | `AWAITING_CUSTOMER`, `RESOLVED` |
| `AWAITING_CUSTOMER` | `IN_PROGRESS`, `RESOLVED` |
| `RESOLVED` | `IN_PROGRESS` (reopen), `CLOSED` |
| `CLOSED` | _(no further transitions)_ |

---

## 11. SLA Engine

Each ticket automatically receives an SLA tracking record when created. The engine:

1. **Assigns deadlines** based on the active SLA policy matching the ticket's priority
2. **Records first response time** when an agent posts a public (non-internal) comment
3. **Records resolution time** when the ticket moves to `RESOLVED` or `CLOSED`
4. **Monitors approaching deadlines** at 75% time consumed → generates Level 1 escalation
5. **Monitors breached deadlines** at 100%+ → generates Level 2/3 escalation

**Escalation Levels:**

| Level | Recipient |
|---|---|
| Level 1 | Assigned support agent |
| Level 2 | Support manager / Admin |
| Level 3 | Platform administrator (superuser) |

---

## 12. KPI & KRA System

**KRAs (Key Result Areas)** define strategic performance domains (e.g., *SLA Compliance*, *Resolution Velocity*).

**KPIs (Key Performance Indicators)** are measurable metrics within KRAs with configurable targets.

**Direction-Aware Achievement Calculation:**

| Direction | Formula |
|---|---|
| `HIGHER_IS_BETTER` | `(actual / target) × 100%` |
| `LOWER_IS_BETTER` | `(target / actual) × 100%` (100% if actual = 0) |
| `EXACT_MATCH` | `100% − (|actual − target| / target × 100%)` |

**Standard Auto-Calculated KPI Codes:**

| Code Pattern | Auto-Calculation Source |
|---|---|
| `*RESOLUTION_RATE*` | % of assigned tickets resolved |
| `*AVG_RESOLUTION*` or `*RESOLUTION_TIME*` | Average hours to resolve |
| `*AVG_RESPONSE*` or `*RESPONSE_TIME*` | Average first response hours |
| `*RESOLVED*COUNT*` | Total resolved ticket volume |
| `*SLA*` | SLA compliance percentage |

---

## 13. Background Tasks (Celery)

| Task | Schedule | Description |
|---|---|---|
| `sla.tasks.monitor_sla_deadlines_task` | Every 5 minutes | Scans active tickets, detects approaching/breached deadlines, creates escalations |
| `notifications.tasks.send_email_notification_task` | On-demand (async) | Sends email notifications with retry logic (3 attempts, 60s delay) |

---

## 14. Logging

Log files are written to `backend/logs/`:

| File | Level | Contents |
|---|---|---|
| `servicesphere.log` | INFO+ | Application events, SLA runs, ticket operations |
| `security.log` | WARNING+ | Auth failures, permission denials, security events |

Log files rotate at **10 MB** with **5 backup copies** retained.

---

## 15. Production Checklist

Before deploying to production, ensure:

- [ ] `DJANGO_DEBUG=False` in `.env`
- [ ] `DJANGO_SECRET_KEY` is set to a strong random value
- [ ] `DJANGO_ALLOWED_HOSTS` includes only production domain(s)
- [ ] `SECURE_SSL_REDIRECT=True`
- [ ] `SESSION_COOKIE_SECURE=True`
- [ ] `CSRF_COOKIE_SECURE=True`
- [ ] `SECURE_HSTS_SECONDS=31536000` (1 year)
- [ ] `EMAIL_NOTIFICATIONS_ENABLED=True` with valid SMTP credentials
- [ ] `CORS_ALLOWED_ORIGINS` set to production frontend URL only
- [ ] PostgreSQL running with strong credentials
- [ ] Redis running and accessible
- [ ] Celery worker and beat scheduler running as system services
- [ ] `python manage.py collectstatic` run before serving static files
- [ ] `python manage.py check --deploy` returns 0 issues

---

## 16. Database Backup & Recovery

See [`BACKUP_AND_RECOVERY.md`](BACKUP_AND_RECOVERY.md) for detailed instructions.

**Quick backup (PowerShell):**

```powershell
.\backend\scripts\backup_db.ps1
```

**Quick restore:**

```powershell
.\backend\scripts\restore_db.ps1 -BackupFile "path\to\backup.dump"
```
