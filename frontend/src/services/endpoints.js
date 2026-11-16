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

// Central endpoint dictionary defining all backend REST API routes
export const ENDPOINTS = {
  // Authentication & Session Management endpoints (/api/auth/)
  AUTH: {
    // Ping endpoint to initialize CSRF token cookie on browser
    CSRF: '/auth/csrf/',
    // Endpoint for user self-registration
    REGISTER: '/auth/register/',
    // Endpoint to authenticate user credentials and obtain sessionid cookie
    LOGIN: '/auth/login/',
    // Endpoint to destroy user session on server
    LOGOUT: '/auth/logout/',
    // Endpoint to retrieve current authenticated user profile
    ME: '/auth/me/',
    // Endpoint to change password with old password verification
    CHANGE_PASSWORD: '/auth/change-password/',
    // Endpoint to request password recovery email
    PASSWORD_RESET: '/auth/password-reset/',
    // Endpoint to submit new password with recovery token
    PASSWORD_RESET_CONFIRM: '/auth/password-reset-confirm/',
  },

  // System Core Health & Readiness endpoints (/api/health/)
  HEALTH: {
    // Detailed system health status check (database, cache, Celery)
    STATUS: '/health/',
    // Lightweight container liveness check for Docker and Kubernetes probes
    LIVENESS: '/health/liveness/',
  },

  // Client Organizations endpoints (/api/clients/)
  CLIENTS: {
    // List client organizations or create a new client
    LIST: '/clients/',
    // Retrieve, update, or delete a specific client organization by ID
    DETAIL: (id) => `/clients/${id}/`,
  },

  // User Directory endpoints (/api/users/)
  USERS: {
    // List all users with optional role and search filters
    LIST: '/users/',
    // Retrieve or update a specific user record by ID
    DETAIL: (id) => `/users/${id}/`,
    // Toggle active/suspended state of a user account
    TOGGLE_ACTIVE: (id) => `/users/${id}/toggle-active/`,
  },

  // Help Desk Tickets endpoints (/api/tickets/)
  TICKETS: {
    // List tickets or submit a new ticket
    LIST: '/tickets/',
    // Retrieve ticket details by primary key
    DETAIL: (id) => `/tickets/${id}/`,
    // Assign or reassign ticket to an internal support agent
    ASSIGN: (id) => `/tickets/${id}/assign/`,
    // Advance or transition ticket status
    CHANGE_STATUS: (id) => `/tickets/${id}/change_status/`,
    // Update ticket priority level
    CHANGE_PRIORITY: (id) => `/tickets/${id}/change_priority/`,
    // List comments or post a new comment/internal note to a ticket
    COMMENTS: (ticketId) => `/tickets/${ticketId}/comments/`,
  },

  // Multi-tier Approval Workflows endpoints (/api/approvals/)
  APPROVALS: {
    // List approval requests or create a new approval request
    LIST: '/approvals/',
    // Retrieve approval details and audit history
    DETAIL: (id) => `/approvals/${id}/`,
    // Grant authorization for an approval request
    APPROVE: (id) => `/approvals/${id}/approve/`,
    // Reject an approval request with mandatory reason
    REJECT: (id) => `/approvals/${id}/reject/`,
    // Request additional information from requester
    REQUEST_INFO: (id) => `/approvals/${id}/request-info/`,
    // Resubmit an updated request with clarification notes
    RESUBMIT: (id) => `/approvals/${id}/resubmit/`,
  },

  // Service Level Agreements (SLA) endpoints (/api/sla/)
  SLA: {
    // List SLA policies
    POLICIES: '/sla/policies/',
    // Retrieve or update SLA policy parameters
    POLICY_DETAIL: (id) => `/sla/policies/${id}/`,
    // Activate an SLA policy for its assigned priority
    POLICY_ACTIVATE: (id) => `/sla/policies/${id}/activate/`,
    // Deactivate an SLA policy
    POLICY_DEACTIVATE: (id) => `/sla/policies/${id}/deactivate/`,
    // Retrieve real-time SLA metrics for a ticket
    TICKET_TRACKING: (ticketId) => `/sla/tickets/${ticketId}/`,
    // Global SLA monitoring summary across all tickets
    MONITORING: '/sla/monitoring/',
    // List overdue tickets breaching response or resolution SLAs
    OVERDUE_TICKETS: '/sla/overdue-tickets/',
    // List SLA escalations log
    ESCALATIONS: '/sla/escalations/',
    // Acknowledge an SLA escalation incident
    ESCALATION_ACKNOWLEDGE: (id) => `/sla/escalations/${id}/acknowledge/`,
  },

  // Notification Feed & Preferences endpoints (/api/notifications/)
  NOTIFICATIONS: {
    // List all notifications for current user
    LIST: '/notifications/',
    // Retrieve single notification detail
    DETAIL: (id) => `/notifications/${id}/`,
    // Retrieve only unread notifications
    UNREAD: '/notifications/unread/',
    // Retrieve unread notification count for badge display
    UNREAD_COUNT: '/notifications/unread-count/',
    // Mark a specific notification as read
    MARK_READ: (id) => `/notifications/${id}/read/`,
    // Mark all unread notifications as read in bulk
    MARK_ALL_READ: '/notifications/mark-all-read/',
    // Retrieve or update notification delivery preferences
    PREFERENCES: '/notifications/preferences/',
  },

  // Knowledge Base & Documentation endpoints (/api/knowledge/)
  KNOWLEDGE: {
    // List knowledge base categories
    CATEGORIES: '/knowledge/categories/',
    // Retrieve category details
    CATEGORY_DETAIL: (id) => `/knowledge/categories/${id}/`,
    // List published articles or author a new article
    ARTICLES: '/knowledge/articles/',
    // Retrieve full article content and metadata
    ARTICLE_DETAIL: (id) => `/knowledge/articles/${id}/`,
    // Retrieve revision history snapshots for an article
    ARTICLE_REVISIONS: (articleId) => `/knowledge/articles/${articleId}/revisions/`,
    // List knowledge base articles linked to a ticket
    TICKET_ARTICLES: (ticketId) => `/knowledge/tickets/${ticketId}/articles/`,
  },

  // Analytics, Reports & KPIs endpoints (/api/analytics/)
  ANALYTICS: {
    // Executive dashboard summary statistics
    DASHBOARD: '/analytics/dashboard/',
    // Ticket analytics and status breakdown
    TICKETS: '/analytics/tickets/',
    // High-level ticket volume summary
    TICKETS_SUMMARY: '/analytics/tickets/summary/',
    // Ticket volume distribution by priority
    TICKETS_BY_PRIORITY: '/analytics/tickets/by-priority/',
    // Ticket volume distribution by category
    TICKETS_BY_CATEGORY: '/analytics/tickets/by-category/',
    // Daily ticket creation vs resolution timeline trends
    TICKETS_TRENDS: '/analytics/tickets/trends/',
    // Support agent performance leaderboard
    AGENTS: '/analytics/agents/',
    // Active ticket workload distribution across support agents
    AGENTS_WORKLOAD: '/analytics/agents/workload/',
    // Detailed performance profile for a specific agent
    AGENT_DETAIL: (agentId) => `/analytics/agents/${agentId}/`,
    // Performance metrics evaluation for an agent
    AGENT_PERFORMANCE: (agentId) => `/analytics/agents/${agentId}/performance/`,
    // Aggregate SLA compliance analytics
    SLA: '/analytics/sla/',
    // SLA compliance summary
    SLA_SUMMARY: '/analytics/sla/summary/',
    // SLA compliance rates
    SLA_COMPLIANCE: '/analytics/sla/compliance/',
    // List SLA breach incidents
    SLA_BREACHES: '/analytics/sla/breaches/',
    // Key Result Areas (KRAs)
    KRAS: '/analytics/kras/',
    // KRA assignments to staff
    KRA_ASSIGNMENTS: '/analytics/kras/assignments/',
    // Key Performance Indicators (KPIs)
    KPIS: '/analytics/kpis/',
    // KPI assignments
    KPI_ASSIGNMENTS: '/analytics/kpis/assignments/',
    // KPI evaluation historical records
    KPI_RECORDS: '/analytics/kpis/records/',
    // Trigger automated KPI performance evaluation
    KPI_EVALUATE: '/analytics/kpis/evaluate/',
    // Exportable reporting endpoints
    REPORTS: {
      // Ticket operational report
      TICKETS: '/analytics/reports/tickets/',
      // Agent productivity report
      AGENTS: '/analytics/reports/agents/',
      // SLA compliance report
      SLA: '/analytics/reports/sla/',
      // KPI evaluation report
      KPIS: '/analytics/reports/kpis/',
      // KRA achievement report
      KRAS: '/analytics/reports/kras/',
    },
  },
};

// Export ENDPOINTS as default export
export default ENDPOINTS;
