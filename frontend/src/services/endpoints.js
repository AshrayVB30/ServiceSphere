/**
 * ServiceSphere Backend API Endpoints
 * Reflects backend/config/urls.py and Phase 12 documentation.
 */

export const ENDPOINTS = {
  // Authentication & Session
  AUTH: {
    LOGIN: '/auth/login/',
    LOGOUT: '/auth/logout/',
    ME: '/auth/me/',
    CSRF: '/auth/csrf/',
    CHANGE_PASSWORD: '/auth/change-password/',
  },

  // Health
  HEALTH: '/health/',

  // Clients (Tenant Organizations)
  CLIENTS: {
    LIST: '/clients/',
    DETAIL: (id) => `/clients/${id}/`,
  },

  // Tickets
  TICKETS: {
    LIST: '/tickets/',
    DETAIL: (id) => `/tickets/${id}/`,
    ASSIGN: (id) => `/tickets/${id}/assign/`,
    CHANGE_STATUS: (id) => `/tickets/${id}/change_status/`,
    COMMENTS: (ticketId) => `/tickets/${ticketId}/comments/`,
    ATTACHMENTS: (ticketId) => `/tickets/${ticketId}/attachments/`,
    HISTORY: (ticketId) => `/tickets/${ticketId}/history/`,
  },

  // Approvals
  APPROVALS: {
    LIST: '/approvals/',
    DETAIL: (id) => `/approvals/${id}/`,
    APPROVE: (id) => `/approvals/${id}/approve/`,
    REJECT: (id) => `/approvals/${id}/reject/`,
    REQUEST_INFO: (id) => `/approvals/${id}/request-info/`,
    RESUBMIT: (id) => `/approvals/${id}/resubmit/`,
  },

  // SLA Management
  SLA: {
    POLICIES: '/sla/policies/',
    POLICY_DETAIL: (id) => `/sla/policies/${id}/`,
    TICKET_TRACKING: (ticketId) => `/sla/tickets/${ticketId}/`,
    ESCALATIONS: '/sla/escalations/',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications/',
    DETAIL: (id) => `/notifications/${id}/`,
    MARK_READ: (id) => `/notifications/${id}/read/`,
    MARK_ALL_READ: '/notifications/mark-all-read/',
    UNREAD_COUNT: '/notifications/unread-count/',
    PREFERENCES: '/notifications/preferences/',
  },

  // Knowledge Base
  KNOWLEDGE: {
    CATEGORIES: '/knowledge/categories/',
    CATEGORY_DETAIL: (id) => `/knowledge/categories/${id}/`,
    ARTICLES: '/knowledge/articles/',
    ARTICLE_DETAIL: (id) => `/knowledge/articles/${id}/`,
    REVISIONS: (articleId) => `/knowledge/articles/${articleId}/revisions/`,
    TICKET_ARTICLES: (ticketId) => `/knowledge/tickets/${ticketId}/articles/`,
  },

  // Analytics & KPIs
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard/',
    TICKETS: '/analytics/tickets/',
    AGENTS: '/analytics/agents/',
    AGENT_DETAIL: (agentId) => `/analytics/agents/${agentId}/`,
    SLA: '/analytics/sla/',
    KPIS: '/analytics/kpis/',
    KPI_ASSIGNMENTS: '/analytics/kpis/assignments/',
    KRAS: '/analytics/kras/',
    EXPORT_CSV: '/analytics/export/csv/',
  },
};

