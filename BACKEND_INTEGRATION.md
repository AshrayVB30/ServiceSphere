# ServiceSphere – Backend Integration Guide

## 1. Executive Summary

ServiceSphere is an enterprise-grade Help Desk and Support Ticket Management System built on a decoupled architecture:
- **Backend**: Django 6.1+ REST Framework (DRF) running with PostgreSQL.
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide icons, React Router v7, React Hook Form.

All mock data, simulated network delays, and hardcoded fallback arrays have been completely decommissioned. The frontend interacts directly with live Django REST Framework endpoints.

---

## 2. Authentication & Session Architecture

### Session-Based Cookie Authentication with Django CSRF
- **Mechanism**: Standard Django session cookies (`sessionid`) and CSRF tokens (`csrftoken`).
- **Security**:
  - `HttpOnly` cookie protection prevents XSS attacks from extracting session tokens.
  - `SameSite=Lax` cookie configuration prevents Cross-Site Request Forgery (CSRF).
  - `X-CSRFToken` request header is automatically extracted from cookies or fetched via `/api/auth/csrf/` and sent with every mutating HTTP request (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Axios Configuration** (`frontend/src/services/api.js`):
  ```javascript
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  ```

### Authentication Endpoints
| HTTP Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/auth/csrf/` | Fetches a valid CSRF cookie prior to authentication | Public |
| `POST` | `/api/auth/login/` | Authenticates with `email` (or `username`) and `password` | Public |
| `POST` | `/api/auth/register/` | Self-service registration for new Client and Approver accounts | Public |
| `GET` | `/api/auth/me/` | Retrieves authenticated user profile, role, and client details | Authenticated |
| `POST` | `/api/auth/logout/` | Terminates Django session and clears session cookie | Authenticated |

---

## 3. Real Database Integration & Service Endpoints

Every frontend service strictly maps to real Django REST Framework viewsets:

### 3.1. Tickets & History (`frontend/src/services/ticketService.js`)
- `GET /api/tickets/` – Filtered and paginated tickets list (supports `search`, `status`, `priority`, `ordering`).
- `POST /api/tickets/` – Creates a new ticket associated with the authenticated user's organization.
- `GET /api/tickets/{id}/` – Retrieves full ticket detail by ID or UUID.
- `PATCH /api/tickets/{id}/` – Updates ticket status, priority, or assignment.
- `GET /api/tickets/{id}/history/` – Chronological audit trail of ticket modifications.
- `GET /api/tickets/{id}/comments/` – Internal agent notes and public customer communications.
- `POST /api/tickets/{id}/comments/` – Adds a public or internal comment.

### 3.2. SLA Policies & Tracking (`frontend/src/services/slaService.js`)
- `GET /api/sla/policies/` – Active SLA policies (Urgent, High, Medium, Low).
- `GET /api/sla/tracking/` – Live countdown deadlines, breach states, and time elapsed.
- `GET /api/sla/escalations/` – Multi-tiered escalation records for near-breach and breached tickets.

### 3.3. Approval Workflows (`frontend/src/services/approvalService.js`)
- `GET /api/approvals/` – Approval request queue filtered by role (Approvers see their pending tasks; Agents see requests they filed).
- `POST /api/approvals/` – Files a formal authorization request on a ticket.
- `POST /api/approvals/{id}/decide/` – Approves, rejects, or requests additional information.

### 3.4. Clients & Organizations (`frontend/src/services/clientService.js`)
- `GET /api/clients/` – Multi-tenant organization directory (Admin and Support staff access).
- `POST /api/clients/` – Onboards a new client organization.

### 3.5. Users & Roles (`frontend/src/services/userService.js`)
- `GET /api/users/` – Directory of platform users, filtering by role (`ADMIN`, `SUPPORT_AGENT`, `CLIENT`, `APPROVER`).

---

## 4. Role-Based Access Control (RBAC) Matrix

| Feature / Page | System Admin (`ADMIN`) | Support Agent (`SUPPORT_AGENT`) | Client User (`CLIENT`) | Approver (`APPROVER`) |
|---|---|---|---|---|
| Admin Dashboard (`/dashboard/admin`) | Full Access | No (Redirect) | No (Redirect) | No (Redirect) |
| Agent Dashboard (`/dashboard/agent`) | Full Access | Full Access | No (Redirect) | No (Redirect) |
| Client Portal (`/dashboard/client`) | Full Access | View Only | Full Access | View Only |
| Approvals Portal (`/approvals`) | Full Access | View Requests | View Own Requests | Authorize / Reject |
| SLA Management (`/sla`) | Full Access | View Only | No Access | No Access |
| Analytics (`/analytics`) | Full Access | Team Metrics | Client Reports | No Access |
| Ticket Creation (`/tickets/new`) | Yes | Yes | Yes | Yes |

---

## 5. Demo Environment & Seeding Command

To populate demo accounts, SLA tiers, and test tickets in a fresh database:
```bash
python manage.py seed_demo_users
```

### Pre-Configured Credentials (All accounts use `Password123!`):
- **Administrator**: `admin@servicesphere.io`
- **Support Agent**: `agent@servicesphere.io`
- **Client User**: `client@acmecorp.com`
- **Approver**: `approver@acmecorp.com`

