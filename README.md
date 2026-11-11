# ServiceSphere — Enterprise Help Desk & Incident Management Platform

[![Django](https://img.shields.io/badge/Django-6.1.2-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Celery](https://img.shields.io/badge/Celery-5.x-37814A?style=for-the-badge&logo=celery&logoColor=white)](https://docs.celeryq.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-147%20Passing-success?style=for-the-badge&logo=pytest&logoColor=white)](#running-automated-tests)

---

## Executive Overview & Problem Statement

In modern enterprise environments, client support requests, incident escalations, and technical inquiries frequently deteriorate into fragmented communications across unmonitored email inboxes, ad-hoc chat channels, and unmaintained spreadsheets. This lack of structure leads to:
* **Missed Service-Level Agreements (SLAs)** with severe financial and contractual penalties.
* **Unclear accountability and ownership** causing ticket stagnation and duplicate work.
* **Security & compliance risks** from cross-tenant data leaks and unmonitored ticket access.
* **Opaque approval chains** where high-risk changes lack documented manager sign-offs.
* **High repetitive support burdens** due to the absence of a verified, searchable knowledge repository.

**ServiceSphere** resolves these systemic failures by delivering a production-grade, multi-tenant Incident Management and Help Desk platform. It centralizes client onboarding, strict tenant data isolation, role-based workflows, automated SLA tracking with multi-tier escalations, formal approval gates, a rich Markdown knowledge base, real-time in-app notifications, and KPI/KRA performance analytics.

---

## System Architecture

![ServiceSphere system architecture](documentation/ServiceSphere-System%20Architecture.drawio.png)

## Core Capabilities & Modules

| Module | Description | Key Capabilities |
|---|---|---|
| **Multi-Tenant Scoping** | Enterprise client organization management | Strict row-level query isolation, customized SLA tier assignment, and independent user directories. |
| **Role-Based Access (RBAC)** | Fine-grained permission matrix | Distinct portals and capabilities for `ADMIN`, `SUPPORT_AGENT`, `CLIENT`, and `APPROVER`. |
| **Ticket State Machine** | Finite state machine workflow engine | Enforced state transitions (`OPEN` → `IN_PROGRESS` → `AWAITING_CUSTOMER` → `RESOLVED` → `CLOSED`) with immutable audit histories. |
| **SLA & Escalation Engine** | Dynamic response/resolution tracking | Automatic deadline assignment by priority, 75% early warning alerts, 100% breach detection, and 3-tier escalation dispatch. |
| **Approval Workflows** | Managerial change & cost authorization | Linked ticket approvals, justification audits, and role-restricted approve/reject actions. |
| **Knowledge Base (Runbooks)**| Enterprise technical documentation | Markdown-rendered articles with tables, code snippets, category filtering, search, and ticket resolution linking. |
| **Notifications Center** | Omnichannel user notification engine | Instant in-app alerts, unread badges, mark-all-as-read, and per-user email notification preferences. |
| **Analytics & KPIs/KRAs** | Operational intelligence dashboard | Real-time SLA compliance rates, agent resolution velocities, direction-aware KPI scoring, and one-click CSV export. |
| **Self-Service Auth** | Secure authentication and account recovery | Session isolation, CSRF protection, profile management, and tokenized self-service password reset. |

---

## Technology Stack

| Layer | Component | Technology | Version | Purpose |
|---|---|---|---|---|
| **Frontend** | Framework | React | 19.1.1 | Modern single-page application |
| | Build Tool | Vite | 6.x | Fast HMR development and optimized production bundling |
| | Styling | Tailwind CSS | v4.0 | Utility-first responsive design system |
| | Icons | Lucide React | Latest | Clean, consistent vector iconography |
| | Routing | React Router DOM | 7.x | Declarative client-side routing & auth guards |
| | Markdown | Custom AST Parser | Native | Zero-dependency rendering of tables, code, and links |
| **Backend** | Language | Python | 3.12 / 3.11 | High-efficiency modern backend runtime |
| | Framework | Django & DRF | 6.1.2 / 3.18.3 | RESTful API, ORM, and enterprise security framework |
| | Application Server | Gunicorn | 23.0.0 | Production WSGI HTTP server |
| **Data Tier** | Relational DB | PostgreSQL | 16.x / 14+ | ACID-compliant relational data store |
| | Cache & Broker | Redis | 7.x / 6+ | In-memory message broker and caching layer |
| **Tasks** | Queue & Scheduler | Celery & Celery Beat | 5.4.x | Asynchronous task execution and periodic SLA monitoring |
| **DevOps** | Reverse Proxy | Nginx | 1.25 Alpine | Reverse proxy gateway, SSL termination, SPA routing |
| | Containers | Docker & Compose | Compose v2 | Containerized reproducible deployment |

---

## Project Directory Tree

```text
ServiceSphere/
├── .env                              # Root environment variables for Docker
├── .env.example                      # Template environment variables
├── docker-compose.yml                # Docker multi-container composition
├── README.md                         # Master project overview (this file)
│
├── backend/                          # Django REST Framework Backend
│   ├── Dockerfile                    # Python 3.12-slim production container
│   ├── entrypoint.py                 # Automated migration & seeder entrypoint
│   ├── requirements.txt              # Backend dependencies (Django, DRF, Celery, Gunicorn)
│   ├── manage.py                     # Django CLI command runner
│   ├── config/                       # Settings, root URLs, WSGI, Celery app
│   ├── accounts/                     # Custom User model, RBAC, Auth, Password Reset
│   ├── clients/                      # Multi-tenant Client organizations
│   ├── tickets/                      # Ticket models, state machine, comments, attachments
│   ├── approvals/                    # Approval requests and immutable audit logs
│   ├── sla/                          # SLA policies, deadline calculators, escalation tasks
│   ├── notifications/                # In-app notifications, user preferences, email tasks
│   ├── knowledge_base/               # Categories, articles, markdown storage, ticket linking
│   ├── analytics/                    # Performance metrics, KPI/KRA engine, CSV export
│   └── core/                         # Health probes, shared base models, utilities
│
├── frontend/                         # React 19 Frontend SPA
│   ├── Dockerfile                    # Multi-stage build (Node 22 -> Nginx Alpine)
│   ├── nginx.conf                    # SPA routing configuration (try_files fallback)
│   ├── package.json                  # Frontend dependencies and build scripts
│   ├── vite.config.js                # Vite build and development configuration
│   └── src/
│       ├── components/               # Navbar, Sidebar, Layout, MarkdownRenderer, Modals
│       ├── pages/                    # Dashboard, Tickets, Approvals, KB, Analytics, Auth
│       ├── services/                 # Axios-based API client and service endpoints
│       └── context/                  # Authentication and global state providers
│
├── docker/                           # Container Infrastructure Configurations
│   └── nginx/
│       └── default.conf              # Reverse proxy gateway routing configuration
│
└── documentation/                    # Master Technical Documentation & Presentation Guide
    ├── README.md                     # Complete System Architecture, Runbooks & Presentation Guide
    └── ServiceSphere-System Architecture.drawio.png  # High-resolution architecture blueprint
```

---

## Quick Start with Docker (Recommended)

Run the entire full-stack enterprise platform with a single command.

### 1. Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running on Windows, macOS, or Linux).

### 2. Launch the Application
In your terminal, navigate to the project root and execute:

```bash
docker-compose up --build -d
```

Docker Compose will build and orchestrate 6 coordinated services:
* `servicesphere-frontend` — Node 22 build served via Nginx Alpine.
* `servicesphere-backend` — Gunicorn running Django REST Framework.
* `servicesphere-celery` — Celery worker and periodic beat scheduler.
* `servicesphere-db` — PostgreSQL 16 database.
* `servicesphere-redis` — Redis 7 message broker.
* `servicesphere-nginx` — Edge Gateway routing traffic on port 80.

### 3. Seed Demo Data & Superuser (One-Time Setup)
Initialize the database with default SLA policies, sample clients, and pre-configured test users:

```bash
# Seed standard demo accounts, clients, SLA policies, and sample tickets
docker-compose exec backend python manage.py seed_demo_users

# Seed standard knowledge base categories
docker-compose exec backend python manage.py seed_kb_categories

# Bulk-publish knowledge base runbooks
docker-compose exec backend python manage.py publish_all_articles
```

### 4. Access the Application
Open your web browser and navigate to:
* **Web Application (UI):** [http://localhost](http://localhost)
* **REST API Root:** [http://localhost/api/](http://localhost/api/)
* **Django Admin Portal:** [http://localhost/admin/](http://localhost/admin/)
* **System Health Check:** [http://localhost/api/health/](http://localhost/api/health/)

---

## Manual Local Development Setup

If you prefer running services outside of Docker for active local development:

### Step 1: Clone the Repository
```bash
git clone https://github.com/AshrayVB30/ServiceSphere.git
cd ServiceSphere
```

### Step 2: Backend Setup (Python & Django)
```bash
# 1. Create and activate a Conda environment
conda create -n servicesphere python=3.12 -y
conda activate servicesphere

# 2. Install backend dependencies
cd backend
pip install -r requirements.txt

# 3. Configure local environment variables (.env)
cp .env.example .env

# 4. Run database migrations
python manage.py migrate

# 5. Seed demo data
python manage.py seed_demo_users
python manage.py seed_kb_categories
python manage.py publish_all_articles

# 6. Start Django development server
python manage.py runserver 8000
```

### Step 3: Frontend Setup (Node & Vite)
In a **new terminal**:
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:5173`

### Step 4: Background Workers (Celery & Redis)
Ensure local Redis is running on port `6379`, then start the Celery worker and beat scheduler in a **third terminal**:
```bash
conda activate servicesphere
cd backend

# Start Celery Worker
celery -A config worker --loglevel=info

# In another terminal: Start Celery Beat (SLA polling every 5 minutes)
celery -A config beat --loglevel=info
```

---

## Running Automated Tests

ServiceSphere comes equipped with a comprehensive automated test suite spanning all domain applications (accounts, clients, tickets, approvals, sla, notifications, knowledge_base, analytics, core).

```bash
# Run all 147 test cases
cd backend
python manage.py test
```

**Expected Result:**
```text
Ran 147 tests in 18.421s
OK
```

To run individual app test suites:
```bash
python manage.py test tickets
python manage.py test sla
python manage.py test approvals
python manage.py test accounts
```

---

## REST API Overview

ServiceSphere exposes an enterprise-grade RESTful API secured by session isolation and CSRF validation:

| Resource | Base Path | Key Endpoints | Purpose |
|---|---|---|---|
| **Authentication** | `/api/auth/` | `POST /login/`<br>`POST /logout/`<br>`GET /me/`<br>`POST /password-reset/` | Session login, profile retrieval, tokenized password recovery. |
| **Clients** | `/api/clients/` | `GET /`<br>`POST /`<br>`GET /{id}/` | Multi-tenant organization CRUD (Admin restricted). |
| **Tickets** | `/api/tickets/` | `GET /`<br>`POST /`<br>`POST /{id}/assign/`<br>`POST /{id}/status/` | Ticket management, "Assign to Me", state machine updates. |
| **Approvals** | `/api/approvals/` | `GET /`<br>`POST /`<br>`POST /{id}/action/` | Formal approval requests, justification audits, approve/reject. |
| **SLA Policies** | `/api/sla/` | `GET /policies/`<br>`GET /records/`<br>`GET /escalations/` | SLA policy rules, countdown tracking, escalation logs. |
| **Knowledge Base** | `/api/knowledge/` | `GET /categories/`<br>`GET /articles/`<br>`POST /articles/` | Runbooks, articles, Markdown rendering, category filtering. |
| **Notifications** | `/api/notifications/`| `GET /`<br>`POST /mark-read/`<br>`GET /preferences/` | User in-app notifications, unread counts, email toggle. |
| **Analytics** | `/api/analytics/` | `GET /overview/`<br>`GET /kpi/`<br>`GET /export/csv/` | Operational KPI metrics, team velocity, CSV audit exports. |
| **System Health** | `/api/health/` | `GET /`<br>`GET /ready/`<br>`GET /live/` | Kubernetes & Docker health, database, and Redis ping probes. |

> Complete request/response schemas are available in [`documentation/API_REFERENCE.md`](documentation/API_REFERENCE.md).

---