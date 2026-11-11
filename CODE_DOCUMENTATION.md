# ServiceSphere – Code Documentation & Module Reference

## 1. Directory Structure

```text
ServiceSphere/
├── backend/                       # Django 6.1+ REST Framework API
│   ├── accounts/                  # Custom User model, auth views, RBAC, seed command
│   ├── approvals/                 # Multi-stage approval requests and audit records
│   ├── clients/                   # Multi-tenant client organizations
│   ├── core/                      # Root API gateway, base models, global utilities
│   ├── notifications/             # In-app and email alert event triggers
│   ├── sla/                       # SLA policies, deadline calculators, escalations
│   └── tickets/                   # Support tickets, comments, attachments, history
├── frontend/                      # React 19 + Vite + Tailwind CSS Application
│   ├── src/
│   │   ├── components/            # Reusable UI primitives (buttons, badges, modals, layouts)
│   │   ├── contexts/              # Global state (AuthContext, ThemeContext, NotificationContext)
│   │   ├── features/              # Feature modules (auth, tickets, dashboard, analytics, sla, approvals)
│   │   ├── hooks/                 # Custom React hooks (useAuth, usePagination, useDebounce)
│   │   ├── routes/                # Route definitions & RoleBasedRoute guards
│   │   ├── services/              # API clients mapping to Django endpoints
│   │   └── utils/                 # Formatting utilities, date helpers, sanitizers
```

---

## 2. Backend Modules & Domain Architecture

### 2.1. `accounts`
- **Models**: `User(AbstractUser)` with `role` (`ADMIN`, `SUPPORT_AGENT`, `CLIENT`, `APPROVER`), `phone_number`, and `client` foreign key.
- **Views**:
  - `LoginAPIView`: Authenticates via email/username and password; creates session cookie.
  - `RegisterAPIView`: Public registration for new client organizations and staff.
  - `CurrentUserAPIView`: Returns profile details for `GET /api/auth/me/`.
  - `LogoutAPIView`: Terminates Django session.
- **Commands**:
  - `seed_demo_users`: Populates 4 canonical demo users, 2 organizations, 4 SLA policies, and sample tickets.

### 2.2. `tickets`
- **Models**:
  - `Ticket`: Core entity with `UUID` ticket number, `client`, `created_by`, `assigned_to`, `priority`, `status`, and timestamps.
  - `TicketComment`: Agent-client communications and internal staff notes.
  - `TicketAttachment`: File attachments linked to tickets or comments.
  - `TicketHistory`: Automated audit trail capturing all state transitions.
- **Views**:
  - `TicketViewSet`: ModelViewSet providing CRUD, filtering by status/priority, full-text search, and customer scoping.

### 2.3. `sla`
- **Models**:
  - `SLAPolicy`: Urgency tiers (`URGENT`, `HIGH`, `MEDIUM`, `LOW`) defining response and resolution hours.
  - `SLATracking`: Tracks elapsed time, live deadline countdown, and breach status per ticket.
  - `SLAEscalation`: Escalation levels (Warning, Breached, Escalated) for notifications.
- **Services**:
  - `assign_sla_to_ticket`: Automatically attaches SLA targets based on ticket priority.

### 2.4. `approvals`
- **Models**:
  - `ApprovalRequest`: Workflow item for manager authorizations tied to tickets.
  - `ApprovalRecord`: Immutable log of actions (`SUBMITTED`, `APPROVED`, `REJECTED`, `INFO_REQUESTED`).

---

## 3. Frontend Architecture

### 3.1. Authentication Context (`frontend/src/contexts/AuthContext.jsx`)
- Provides `user`, `role`, `isAuthenticated`, `loading`, `login(credentials)`, `register(userData)`, and `logout()`.
- Automatically checks session persistence on page refresh by calling `GET /api/auth/me/`.
- Routes unauthorized visitors to `/login` and redirects authenticated users according to their role.

### 3.2. Role-Based Route Guards (`frontend/src/routes/RoleBasedRoute.jsx`)
- Restricts route trees based on `allowedRoles`.
- Non-matching roles are automatically routed to their appropriate role home:
  - `ADMIN` -> `/dashboard/admin`
  - `SUPPORT_AGENT` -> `/dashboard/agent`
  - `CLIENT` -> `/dashboard/client`
  - `APPROVER` -> `/approvals`

### 3.3. API Service Layer (`frontend/src/services/`)
- `api.js`: Central Axios instance configured with `withCredentials: true`, timeout handling, and automatic CSRF header inclusion.
- `endpoints.js`: Single source of truth for all API URIs.
- Individual feature services: `authService`, `ticketService`, `slaService`, `approvalService`, `clientService`, `userService`.

