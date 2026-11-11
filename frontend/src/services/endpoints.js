/**
 * ServiceSphere Backend API Endpoint Mapping
 * Strictly mapped to backend URL configurations across all Django apps:
 * - accounts.urls (/api/auth/)
 * - clients.urls (/api/clients/)
 * - tickets.urls (/api/tickets/)
 * - approvals.urls (/api/approvals/)
 * - sla.urls (/api/sla/)
 * - notifications.urls (/api/notifications/)
 * - knowledge_base.urls (/api/knowledge/)
 * - analytics.urls (/api/analytics/)
 * - core.urls (/api/health/)
 */

export const ENDPOINTS = {
  // Authentication & Session Management (/api/auth/)
  AUTH: {
    CSRF: '/auth/csrf/',
    REGISTER: '/auth/register/',
    LOGIN: '/auth/login/',
    LOGOUT: '/auth/logout/',
    ME: '/auth/me/',
    CHANGE_PASSWORD: '/auth/change-password/',
    PASSWORD_RESET: '/auth/password-reset/',
    PASSWORD_RESET_CONFIRM: '/auth/password-reset-confirm/',
  },

  // System Core Health (/api/health/)
  HEALTH: {
    STATUS: '/health/',
    LIVENESS: '/health/liveness/',
  },

  // Client Organizations (/api/clients/)
  CLIENTS: {
    LIST: '/clients/',
    DETAIL: (id) => `/clients/${id}/`,
  },

  // Help Desk Tickets (/api/tickets/)
  TICKETS: {
    LIST: '/tickets/',
    DETAIL: (id) => `/tickets/${id}/`,
    ASSIGN: (id) => `/tickets/${id}/assign/`,
    CHANGE_STATUS: (id) => `/tickets/${id}/change_status/`,
    CHANGE_PRIORITY: (id) => `/tickets/${id}/change_priority/`,
    COMMENTS: (ticketId) => `/tickets/${ticketId}/comments/`,
  },

  // Approval Workflows (/api/approvals/)
  APPROVALS: {
    LIST: '/approvals/',
    DETAIL: (id) => `/approvals/${id}/`,
    APPROVE: (id) => `/approvals/${id}/approve/`,
    REJECT: (id) => `/approvals/${id}/reject/`,
    REQUEST_INFO: (id) => `/approvals/${id}/request-info/`,
    RESUBMIT: (id) => `/approvals/${id}/resubmit/`,
  },

  // Service Level Agreements (/api/sla/)
  SLA: {
    POLICIES: '/sla/policies/',
    POLICY_DETAIL: (id) => `/sla/policies/${id}/`,
    POLICY_ACTIVATE: (id) => `/sla/policies/${id}/activate/`,
    POLICY_DEACTIVATE: (id) => `/sla/policies/${id}/deactivate/`,
    TICKET_TRACKING: (ticketId) => `/sla/tickets/${ticketId}/`,
    MONITORING: '/sla/monitoring/',
    OVERDUE_TICKETS: '/sla/overdue-tickets/',
    ESCALATIONS: '/sla/escalations/',
    ESCALATION_ACKNOWLEDGE: (id) => `/sla/escalations/${id}/acknowledge/`,
  },

  // Notifications (/api/notifications/)
  NOTIFICATIONS: {
    LIST: '/notifications/',
    DETAIL: (id) => `/notifications/${id}/`,
    UNREAD: '/notifications/unread/',
    UNREAD_COUNT: '/notifications/unread-count/',
    MARK_READ: (id) => `/notifications/${id}/read/`,
    MARK_ALL_READ: '/notifications/mark-all-read/',
    PREFERENCES: '/notifications/preferences/',
  },

  // Knowledge Base (/api/knowledge/)
  KNOWLEDGE: {
    CATEGORIES: '/knowledge/categories/',
    CATEGORY_DETAIL: (id) => `/knowledge/categories/${id}/`,
    ARTICLES: '/knowledge/articles/',
    ARTICLE_DETAIL: (id) => `/knowledge/articles/${id}/`,
    ARTICLE_REVISIONS: (articleId) => `/knowledge/articles/${articleId}/revisions/`,
    TICKET_ARTICLES: (ticketId) => `/knowledge/tickets/${ticketId}/articles/`,
  },

  // Analytics, Reports & KPIs (/api/analytics/)
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard/',
    TICKETS: '/analytics/tickets/',
    TICKETS_SUMMARY: '/analytics/tickets/summary/',
    TICKETS_BY_PRIORITY: '/analytics/tickets/by-priority/',
    TICKETS_BY_CATEGORY: '/analytics/tickets/by-category/',
    TICKETS_TRENDS: '/analytics/tickets/trends/',
    AGENTS: '/analytics/agents/',
    AGENTS_WORKLOAD: '/analytics/agents/workload/',
    AGENT_DETAIL: (agentId) => `/analytics/agents/${agentId}/`,
    AGENT_PERFORMANCE: (agentId) => `/analytics/agents/${agentId}/performance/`,
    SLA: '/analytics/sla/',
    SLA_SUMMARY: '/analytics/sla/summary/',
    SLA_COMPLIANCE: '/analytics/sla/compliance/',
    SLA_BREACHES: '/analytics/sla/breaches/',
    KRAS: '/analytics/kras/',
    KRA_ASSIGNMENTS: '/analytics/kras/assignments/',
    KPIS: '/analytics/kpis/',
    KPI_ASSIGNMENTS: '/analytics/kpis/assignments/',
    KPI_RECORDS: '/analytics/kpis/records/',
    KPI_EVALUATE: '/analytics/kpis/evaluate/',
    REPORTS: {
      TICKETS: '/analytics/reports/tickets/',
      AGENTS: '/analytics/reports/agents/',
      SLA: '/analytics/reports/sla/',
      KPIS: '/analytics/reports/kpis/',
      KRAS: '/analytics/reports/kras/',
    },
  },
};

export default ENDPOINTS;
