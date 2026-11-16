/**
 * ServiceSphere Canonical Constants
 * Aligned with backend models (User, Ticket, SLAPolicy, ApprovalRequest).
 * Serves as single source of truth across all frontend modules.
 */

// User Role Enumeration: Matches Django User.ROLE_CHOICES in accounts/models.py
export const USER_ROLES = {
  // Superuser / System Administrator with unrestricted access across all tenant records
  ADMIN: 'ADMIN',
  // Internal Support Engineer responsible for triaging, working, and resolving tickets
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  // External Customer or client staff member reporting and tracking incidents
  CLIENT: 'CLIENT',
  // Designated Manager or Finance Approver authorizing operational requests & SLA credits
  APPROVER: 'APPROVER',
};

// Human-readable labels mapped directly to each role enumeration key for UI headers and badges
export const ROLE_LABELS = {
  // User-facing label for administrators
  [USER_ROLES.ADMIN]: 'Administrator',
  // User-facing label for support agents
  [USER_ROLES.SUPPORT_AGENT]: 'Support Agent',
  // User-facing label for client users
  [USER_ROLES.CLIENT]: 'Client User',
  // User-facing label for approvers and managers
  [USER_ROLES.APPROVER]: 'Approver / Manager',
};

// Support Ticket Priority Levels: Aligned with Django Ticket.PRIORITY_CHOICES in tickets/models.py
export const TICKET_PRIORITIES = {
  // Routine inquiries or minor cosmetic issues with generous SLA response windows
  LOW: 'LOW',
  // Standard operational problems with moderate business impact
  MEDIUM: 'MEDIUM',
  // Severe issues causing business impairment or partial system outages
  HIGH: 'HIGH',
  // Critical production outages or security incidents requiring immediate intervention
  URGENT: 'URGENT',
};

// Support Ticket Lifecycle State Machine: Aligned with Django Ticket.STATUS_CHOICES
export const TICKET_STATUSES = {
  // Newly created incident awaiting triage or initial staff review
  OPEN: 'OPEN',
  // Ticket actively being diagnosed, reproduced, or investigated by an assigned agent
  IN_PROGRESS: 'IN_PROGRESS',
  // Agent has requested additional reproduction steps or input from the customer
  AWAITING_CUSTOMER: 'AWAITING_CUSTOMER',
  // Remediation deployed or workaround confirmed; pending customer sign-off
  RESOLVED: 'RESOLVED',
  // Final state; ticket marked complete and SLA cycle closed
  CLOSED: 'CLOSED',
};

// Operational Approval Workflow States: Aligned with Django ApprovalRequest.STATUS_CHOICES
export const APPROVAL_STATUSES = {
  // Initial state upon submission; pending review by the assigned approver
  PENDING: 'PENDING',
  // Formally approved; downstream operational or financial actions may execute
  APPROVED: 'APPROVED',
  // Denied by approver with documented rationale in the audit trail
  REJECTED: 'REJECTED',
  // Approver has requested additional justification or cost breakdown from requester
  INFO_REQUESTED: 'INFO_REQUESTED',
};

// SLA Policy Real-Time Compliance States: Aligned with Django TicketSLATracking model
export const SLA_TRACKING_STATUSES = {
  // Active SLA cycle with time remaining before target deadlines
  ACTIVE: 'ACTIVE',
  // Failed to provide first response within policy-mandated window
  RESPONSE_BREACHED: 'RESPONSE_BREACHED',
  // Failed to resolve ticket within policy-mandated resolution threshold
  RESOLUTION_BREACHED: 'RESOLUTION_BREACHED',
  // Both response and resolution milestones achieved within agreed terms
  COMPLIANT: 'COMPLIANT',
  // SLA clock temporarily paused while awaiting client information
  PAUSED: 'PAUSED',
};

// Unified Route Dictionary: Centralized path definitions for React Router v7 navigation
export const ROUTES = {
  // Public Authentication Routes
  // Path for user authentication and login
  LOGIN: '/login',
  // Path for client and organization self-registration
  REGISTER: '/register',
  // Path to request a password recovery email
  FORGOT_PASSWORD: '/forgot-password',
  // Path to submit new password with uid and security token
  RESET_PASSWORD: '/reset-password',

  // Core Application Shell & Dashboards
  // Root index path (redirects dynamically based on user role)
  DASHBOARD: '/',
  // Dedicated executive operations dashboard for system administrators
  ADMIN_DASHBOARD: '/dashboard/admin',
  // Workload and active ticket dashboard for support engineers
  AGENT_DASHBOARD: '/dashboard/agent',
  // Self-service incident overview and history dashboard for clients
  CLIENT_DASHBOARD: '/dashboard/client',
  // Pending authorization and review dashboard for financial/manager approvers
  APPROVER_DASHBOARD: '/dashboard/approver',

  // Feature Modules & Workspaces
  // Ticket queue list view
  TICKETS: '/tickets',
  // Shortcut to ticket creation modal / view
  TICKET_CREATE: '/tickets/new',
  // Parametric URL generator for individual ticket detail workspaces
  TICKET_DETAIL: (id = ':id') => `/tickets/${id}`,
  
  // Client organizations management list view
  CLIENTS: '/clients',
  // Parametric URL generator for client organization profile
  CLIENT_DETAIL: (id = ':id') => `/clients/${id}`,
  
  // Internal staff and user directory management view
  USERS: '/users',
  
  // Multi-tier operational approvals list view
  APPROVALS: '/approvals',
  // Parametric URL generator for approval request detail view
  APPROVAL_DETAIL: (id = ':id') => `/approvals/${id}`,
  
  // Real-time SLA compliance monitoring and escalation dashboard
  SLA: '/sla',
  // SLA policy configuration and threshold definitions view
  SLA_POLICIES: '/sla/policies',
  
  // User notifications feed and preferences management
  NOTIFICATIONS: '/notifications',
  
  // Knowledge Base articles and technical documentation hub
  KNOWLEDGE_BASE: '/knowledge-base',
  // Parametric URL generator for reading a specific knowledge base article
  KB_ARTICLE: (id = ':id') => `/knowledge-base/articles/${id}`,
  // Path to author a new knowledge base runbook
  KB_CREATE: '/knowledge-base/articles/new',
  
  // Executive analytics, KPIs, KRAs, and compliance reports view
  ANALYTICS: '/analytics',
  // Organization and user preferences settings view
  SETTINGS: '/settings',
};
