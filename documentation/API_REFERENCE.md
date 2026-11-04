# ServiceSphere — API Reference

> **Authentication:** All endpoints (except login, CSRF, and health checks) require an active session cookie.  
> **Base URL:** `http://127.0.0.1:8000/api/`  
> **Content-Type:** `application/json`  
> **Date Filtering:** Most analytics endpoints accept `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`  
> **CSV Export:** Analytics endpoints accept `?format=csv` to download reports.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Health Checks](#2-health-checks)
3. [Client Organizations](#3-client-organizations)
4. [Tickets](#4-tickets)
5. [Approvals](#5-approvals)
6. [SLA](#6-sla)
7. [Notifications](#7-notifications)
8. [Knowledge Base](#8-knowledge-base)
9. [Analytics & Reports](#9-analytics--reports)

---

## 1. Authentication

Base path: `/api/auth/`

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/auth/csrf/` | ❌ | Any | Returns CSRF token cookie for SPA clients |
| `POST` | `/api/auth/login/` | ❌ | Any | Authenticates and creates a session |
| `POST` | `/api/auth/logout/` | ✅ | Any | Destroys current session |
| `GET` | `/api/auth/me/` | ✅ | Any | Returns authenticated user profile |
| `POST` | `/api/auth/change-password/` | ✅ | Any | Changes user password |

### POST `/api/auth/login/`
```json
// Request
{ "username": "john_doe", "password": "securepassword" }

// Response 200
{
  "detail": "Successfully authenticated.",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "SUPPORT_AGENT",
    "role_display": "Support Agent",
    "client": null,
    "client_name": null,
    "is_staff": false,
    "is_superuser": false
  }
}
```

### POST `/api/auth/change-password/`
```json
// Request
{ "old_password": "current", "new_password": "NewSecure123!" }

// Response 200
{ "detail": "Password updated successfully." }
```

---

## 2. Health Checks

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health/` | ❌ | Deep health check — probes PostgreSQL and Redis |
| `GET` | `/api/health/liveness/` | ❌ | Lightweight liveness probe for orchestrators |

### GET `/api/health/`
```json
// Response 200 (healthy)
{
  "status": "healthy",
  "service": "ServiceSphere API",
  "version": "1.0.0",
  "timestamp": "2026-11-04T09:00:00+05:30",
  "dependencies": {
    "database": "healthy",
    "cache_broker": "healthy"
  }
}

// Response 503 (unhealthy — database down)
{ "status": "unhealthy", "dependencies": { "database": "unhealthy", ... } }
```

---

## 3. Client Organizations

Base path: `/api/clients/`  
**Authorization:** System Administrators only.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/clients/` | List all client organizations |
| `POST` | `/api/clients/` | Create (onboard) a new client organization |
| `GET` | `/api/clients/{id}/` | Retrieve a specific client |
| `PATCH` | `/api/clients/{id}/` | Partially update a client (e.g., deactivate) |

### POST `/api/clients/`
```json
// Request
{
  "name": "Acme Corporation",
  "code": "acme-corp",
  "contact_email": "admin@acme.com",
  "phone_number": "+91-9876543210",
  "address": "123 Business Park, Mumbai"
}

// Response 201
{
  "id": 5,
  "name": "Acme Corporation",
  "code": "acme-corp",
  "contact_email": "admin@acme.com",
  "is_active": true,
  "created_at": "2026-11-04T09:00:00Z"
}
```

### PATCH `/api/clients/{id}/` — Deactivate a Client
```json
// Request
{ "is_active": false }
```

> **Note:** `DELETE` is intentionally disabled. Deactivate clients with `PATCH {"is_active": false}`.

---

## 4. Tickets

Base path: `/api/tickets/`

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/tickets/` | ✅ | All | List visible tickets (filtered by role) |
| `POST` | `/api/tickets/` | ✅ | CLIENT | Create a new support ticket |
| `GET` | `/api/tickets/{id}/` | ✅ | All | Retrieve ticket details |
| `GET` | `POST` `/api/tickets/{id}/assign/` | ✅ | ADMIN | Assign ticket to a support agent |
| `GET` | `POST` `/api/tickets/{id}/change_status/` | ✅ | ADMIN, AGENT | Transition ticket status |
| `POST` | `/api/tickets/{id}/change_priority/` | ✅ | ADMIN, AGENT | Change ticket priority (recalculates SLA) |
| `GET` | `POST` `/api/tickets/{id}/comments/` | ✅ | All† | View or add comments / internal notes |

†Approvers can view comments but cannot post them.

### POST `/api/tickets/`
```json
// Request (CLIENT role only)
{
  "subject": "Cannot access the billing portal",
  "description": "Getting a 403 error when clicking the billing section since yesterday.",
  "category": "Billing",
  "priority": "HIGH"
}

// Response 201
{
  "id": 42,
  "ticket_number": "550e8400-e29b-41d4-a716-446655440000",
  "client": 3,
  "client_name": "Acme Corporation",
  "created_by": 7,
  "created_by_username": "alice_client",
  "assigned_to": null,
  "assigned_to_username": null,
  "subject": "Cannot access the billing portal",
  "category": "Billing",
  "priority": "HIGH",
  "status": "OPEN",
  "created_at": "2026-11-04T09:00:00Z"
}
```

### POST `/api/tickets/{id}/assign/`
```json
// Request (ADMIN only)
{ "assigned_to": 5, "note": "Assigned to Bob for investigation" }

// Response 200 — Returns updated ticket object
```

### POST `/api/tickets/{id}/change_status/`
```json
// Request (ADMIN or assigned AGENT)
{ "status": "IN_PROGRESS", "note": "Starting diagnosis" }

// Valid status values: OPEN, IN_PROGRESS, AWAITING_CUSTOMER, RESOLVED, CLOSED
// See state machine diagram in README.md for allowed transitions
```

### POST `/api/tickets/{id}/comments/`
```json
// Request
{
  "message": "Could you please share your browser console logs?",
  "is_internal": false
}

// Internal note (AGENT/ADMIN only)
{ "message": "Customer seems confused about portal URL — checking backend logs.", "is_internal": true }
```

---

## 5. Approvals

Base path: `/api/approvals/`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/approvals/` | All‡ | List accessible approval requests |
| `POST` | `/api/approvals/` | ADMIN, AGENT | Submit a new approval request |
| `GET` | `/api/approvals/{id}/` | All‡ | Retrieve request details + audit trail |
| `POST` | `/api/approvals/{id}/approve/` | APPROVER, ADMIN | Approve the request |
| `POST` | `/api/approvals/{id}/reject/` | APPROVER, ADMIN | Reject the request |
| `POST` | `/api/approvals/{id}/request-info/` | APPROVER, ADMIN | Ask for more information |
| `POST` | `/api/approvals/{id}/resubmit/` | Original requester, ADMIN | Resubmit after clarification |

‡Each role sees only the requests they are authorized to view.

### POST `/api/approvals/`
```json
// Request
{
  "ticket": 42,
  "approver": 9,
  "reason": "Requesting hardware purchase approval for client workstation upgrade."
}
```

### POST `/api/approvals/{id}/approve/`
```json
// Request (comment is optional)
{ "comment": "Approved — within Q4 budget allocation." }
```

### POST `/api/approvals/{id}/request-info/`
```json
// Request (comment is required)
{ "comment": "Please provide the vendor quotation and IT department sign-off." }
```

### POST `/api/approvals/{id}/resubmit/`
```json
// Request (comment required; reason is optional update)
{
  "comment": "Attached vendor quotation and IT approval as requested.",
  "reason": "Updated: Hardware purchase including IT-approved specifications."
}
```

---

## 6. SLA

Base path: `/api/sla/`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/sla/policies/` | All | List SLA policies |
| `POST` | `/api/sla/policies/` | ADMIN | Create a new SLA policy |
| `GET` | `/api/sla/policies/{id}/` | All | Retrieve a specific policy |
| `PATCH` | `/api/sla/policies/{id}/` | ADMIN | Update policy details |
| `POST` | `/api/sla/policies/{id}/activate/` | ADMIN | Activate policy (deactivates conflicting one) |
| `POST` | `/api/sla/policies/{id}/deactivate/` | ADMIN | Deactivate policy |
| `GET` | `/api/sla/tickets/{ticket_id}/` | Role-scoped | Retrieve SLA tracking for a specific ticket |
| `GET` | `/api/sla/monitoring/` | ADMIN | Global SLA health dashboard |
| `GET` | `/api/sla/overdue/` | ADMIN | List tickets past their resolution deadline |
| `GET` | `/api/sla/escalations/` | ADMIN | List all SLA escalation events |
| `GET` | `/api/sla/escalations/{id}/` | ADMIN | Retrieve escalation details |
| `POST` | `/api/sla/escalations/{id}/acknowledge/` | ADMIN, AGENT | Acknowledge an escalation |

### POST `/api/sla/policies/`
```json
// Request
{
  "name": "High Priority Standard SLA",
  "priority": "HIGH",
  "response_time_hours": 2.0,
  "resolution_time_hours": 8.0,
  "description": "Applies to all HIGH priority tickets — 2h response, 8h resolution target.",
  "is_active": true
}
```

---

## 7. Notifications

Base path: `/api/notifications/`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications/` | List all notifications for the current user |
| `GET` | `/api/notifications/{id}/` | Retrieve a specific notification |
| `GET` | `/api/notifications/unread/` | List unread notifications only |
| `GET` | `/api/notifications/unread-count/` | Get unread badge count |
| `PATCH` | `/api/notifications/{id}/read/` | Mark a single notification as read |
| `PATCH` | `/api/notifications/mark-all-read/` | Mark all notifications as read |
| `GET` | `/api/notifications/preferences/` | Get notification delivery preferences |
| `PATCH` | `/api/notifications/preferences/` | Update delivery preferences |

### PATCH `/api/notifications/preferences/`
```json
// Request — toggle any combination
{
  "in_app_enabled": true,
  "email_enabled": false,
  "ticket_notifications": true,
  "approval_notifications": true,
  "sla_notifications": true
}
```

---

## 8. Knowledge Base

Base path: `/api/knowledge/`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/knowledge/categories/` | All | List active categories |
| `POST` | `/api/knowledge/categories/` | ADMIN | Create a category |
| `GET` | `PATCH` `/api/knowledge/categories/{id}/` | ADMIN | Retrieve / update a category |
| `GET` | `/api/knowledge/articles/` | All† | List published articles |
| `POST` | `/api/knowledge/articles/` | AGENT, ADMIN | Create a new article (starts as DRAFT) |
| `GET` | `/api/knowledge/articles/{id}/` | All† | Retrieve article details |
| `PATCH` | `/api/knowledge/articles/{id}/` | Author, ADMIN | Update article content |
| `POST` | `/api/knowledge/articles/{id}/publish/` | AGENT, ADMIN | Publish a draft article |
| `POST` | `/api/knowledge/articles/{id}/archive/` | AGENT, ADMIN | Archive a published article |
| `GET` | `/api/knowledge/articles/{id}/revisions/` | ADMIN, AGENT | View article revision history |
| `POST` | `/api/knowledge/articles/{id}/link-ticket/` | AGENT, ADMIN | Link article to a ticket |
| `GET` | `/api/knowledge/articles/{id}/linked-tickets/` | AGENT, ADMIN | List tickets linked to an article |

†Clients can only view PUBLISHED articles.

### POST `/api/knowledge/articles/`
```json
// Request
{
  "title": "How to reset your billing portal password",
  "content": "Follow these steps to reset your password...",
  "category": 3,
  "tags": ["billing", "password", "account"]
}
```

### POST `/api/knowledge/articles/{id}/publish/`
```json
// Request (no body required)
{}

// Response 200 — Article status transitions DRAFT → PUBLISHED
```

---

## 9. Analytics & Reports

Base path: `/api/analytics/`  
**Authorization:** Internal staff (ADMIN, AGENT) unless noted.

### 9.1 Executive Dashboard

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/analytics/dashboard/` | ADMIN, AGENT | Consolidated executive overview |

### 9.2 Ticket Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/tickets/` | Full ticket analytics (status, priority, category) |
| `GET` | `/api/analytics/tickets/summary/` | Ticket count summary and completion rate |
| `GET` | `/api/analytics/tickets/by-priority/` | Counts and % by priority level |
| `GET` | `/api/analytics/tickets/by-category/` | Counts and % by functional category |
| `GET` | `/api/analytics/tickets/trends/` | Daily created vs. resolved timeline |

**Query parameters:** `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&format=csv`

### 9.3 Agent Performance

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/analytics/agents/` | ADMIN | Agent performance leaderboard |
| `GET` | `/api/analytics/agents/workload/` | ADMIN | Workload distribution |
| `GET` | `/api/analytics/agents/{agent_id}/` | ADMIN, own AGENT | Individual agent scorecard |

### 9.4 SLA Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/sla/` | SLA summary + priority/agent breakdown |
| `GET` | `/api/analytics/sla/summary/` | Compliance percentage, overdue count, avg durations |
| `GET` | `/api/analytics/sla/compliance/` | Compliance by priority and agent |
| `GET` | `/api/analytics/sla/breaches/` | List of all breached tickets |

### 9.5 KRA Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` `POST` | `/api/analytics/kras/` | List / create KRAs (write: ADMIN only) |
| `GET` `PATCH` `DELETE` | `/api/analytics/kras/{id}/` | Retrieve / update / delete a KRA |
| `GET` | `/api/analytics/kras/{id}/performance/` | Aggregate KPI performance for this KRA |
| `GET` `POST` | `/api/analytics/kras/assignments/` | List / create KRA agent assignments |

### 9.6 KPI Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` `POST` | `/api/analytics/kpis/` | List / create KPIs (write: ADMIN only) |
| `GET` `PATCH` | `/api/analytics/kpis/{id}/` | Retrieve / update a KPI |
| `GET` | `/api/analytics/kpis/{id}/performance/` | Evaluation history for a specific KPI |
| `GET` `POST` | `/api/analytics/kpis/assignments/` | List / create KPI agent assignments |
| `GET` `POST` | `/api/analytics/kpis/records/` | List / create KPI performance records |
| `POST` | `/api/analytics/kpis/evaluate/` | Trigger automated KPI evaluation (ADMIN only) |

### POST `/api/analytics/kpis/evaluate/`
```json
// Request
{
  "agent": 5,
  "period_start": "2026-10-01",
  "period_end": "2026-10-31",
  "save_records": true
}

// Response 200
{
  "agent_id": 5,
  "username": "support_bob",
  "kpis_evaluated_count": 4,
  "kpi_records": [
    {
      "kpi_name": "Resolution Rate",
      "target_value": 90.0,
      "actual_value": 94.5,
      "achievement_percentage": 105.0
    }
  ],
  "kra_summary": [
    { "kra_name": "Incident Resolution", "average_achievement_percentage": 105.0 }
  ]
}
```

### 9.7 CSV Export Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/analytics/reports/tickets/` | ADMIN, AGENT | Full ticket dataset as CSV |
| `GET` | `/api/analytics/reports/agents/` | ADMIN | Agent performance report as CSV |
| `GET` | `/api/analytics/reports/sla/` | ADMIN, AGENT | SLA compliance report as CSV |
| `GET` | `/api/analytics/reports/kpis/` | ADMIN, AGENT | KPI evaluation records as CSV |
| `GET` | `/api/analytics/reports/kras/` | ADMIN, AGENT | KRA definitions as CSV |

All CSV endpoints accept `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` date filters.

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| `200 OK` | Successful read or action |
| `201 Created` | Resource created successfully |
| `400 Bad Request` | Validation error — check response body for field errors |
| `401 Unauthorized` | Not authenticated — log in first |
| `403 Forbidden` | Authenticated but not authorized for this operation |
| `404 Not Found` | Resource does not exist or is not visible to your role |
| `405 Method Not Allowed` | HTTP method is disabled for this endpoint |
| `503 Service Unavailable` | Infrastructure dependency (DB/Redis) is offline |

---

## Common Error Response Format

```json
// Field validation error
{
  "field_name": ["Error message describing the problem."]
}

// Permission denial
{
  "detail": "Only administrators can assign tickets to support agents."
}

// Not found
{
  "detail": "Not found."
}
```

