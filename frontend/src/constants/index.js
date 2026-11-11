/**
 * ServiceSphere Canonical Constants
 * Aligned with backend models (User, Ticket, SLAPolicy, ApprovalRequest).
 */

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  CLIENT: 'CLIENT',
  APPROVER: 'APPROVER',
};

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.SUPPORT_AGENT]: 'Support Agent',
  [USER_ROLES.CLIENT]: 'Client User',
  [USER_ROLES.APPROVER]: 'Approver / Manager',
};

export const TICKET_PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const TICKET_STATUSES = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  AWAITING_CUSTOMER: 'AWAITING_CUSTOMER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};

export const APPROVAL_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  INFO_REQUESTED: 'INFO_REQUESTED',
};

export const SLA_TRACKING_STATUSES = {
  ACTIVE: 'ACTIVE',
  RESPONSE_BREACHED: 'RESPONSE_BREACHED',
  RESOLUTION_BREACHED: 'RESOLUTION_BREACHED',
  COMPLIANT: 'COMPLIANT',
  PAUSED: 'PAUSED',
};

export const ROUTES = {
  // Public / Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Core App
  DASHBOARD: '/',
  ADMIN_DASHBOARD: '/dashboard/admin',
  AGENT_DASHBOARD: '/dashboard/agent',
  CLIENT_DASHBOARD: '/dashboard/client',
  APPROVER_DASHBOARD: '/dashboard/approver',

  // Feature Modules
  TICKETS: '/tickets',
  TICKET_CREATE: '/tickets/new',
  TICKET_DETAIL: (id = ':id') => `/tickets/${id}`,
  
  CLIENTS: '/clients',
  CLIENT_DETAIL: (id = ':id') => `/clients/${id}`,
  
  USERS: '/users',
  
  APPROVALS: '/approvals',
  APPROVAL_DETAIL: (id = ':id') => `/approvals/${id}`,
  
  SLA: '/sla',
  SLA_POLICIES: '/sla/policies',
  
  NOTIFICATIONS: '/notifications',
  
  KNOWLEDGE_BASE: '/knowledge-base',
  KB_ARTICLE: (id = ':id') => `/knowledge-base/articles/${id}`,
  KB_CREATE: '/knowledge-base/articles/new',
  
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
};

