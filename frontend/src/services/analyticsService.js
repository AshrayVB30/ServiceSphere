// Import central axios HTTP client configured with CSRF tokens and session credentials
import apiClient from './api';
// Import analytics endpoint mapping definitions
import { ENDPOINTS } from './endpoints';

/**
 * ServiceSphere Analytics, SLA Metrics & Reporting Service
 * Communicates with Django REST APIs under /api/analytics/
 */
export const analyticsService = {
  /**
   * Retrieves executive operational dashboard summary metrics.
   * Endpoint: GET /api/analytics/dashboard/
   *
   * @param {object} [params] - Date filter parameters (start_date, end_date).
   * @returns {Promise<object>} Dashboard operational metrics.
   */
  async getDashboardSummary(params = {}) {
    // Send GET request for high-level dashboard metrics
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.DASHBOARD, { params });
    // Return dashboard metrics payload
    return response.data;
  },

  /**
   * Retrieves comprehensive ticket metrics, status breakdown, and volume counts.
   * Endpoint: GET /api/analytics/tickets/
   *
   * @param {object} [params] - Date boundaries.
   * @returns {Promise<object>} Ticket metrics.
   */
  async getTicketAnalytics(params = {}) {
    // Send GET request for ticket volume and performance analytics
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.TICKETS, { params });
    // Return ticket analytics object
    return response.data;
  },

  /**
   * Retrieves daily ticket creation vs resolution timeline trends.
   * Endpoint: GET /api/analytics/tickets/trends/
   *
   * @param {object} [params] - Date filter parameters.
   * @returns {Promise<Array<object>>} Daily trend data points.
   */
  async getTicketTrends(params = {}) {
    // Send GET request for ticket trends timeline data
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.TICKETS_TRENDS, { params });
    // Return trends data array from trends field or raw response
    return response.data?.trends || response.data || [];
  },

  /**
   * Retrieves ticket volume distribution grouped by priority.
   * Endpoint: GET /api/analytics/tickets/by-priority/
   *
   * @param {object} [params] - Date boundaries.
   * @returns {Promise<Array<object>>} Priority breakdown.
   */
  async getTicketsByPriority(params = {}) {
    // Send GET request for priority breakdown
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.TICKETS_BY_PRIORITY, { params });
    // Return priority breakdown array
    return response.data?.by_priority || [];
  },

  /**
   * Retrieves ticket volume distribution grouped by category.
   * Endpoint: GET /api/analytics/tickets/by-category/
   *
   * @param {object} [params] - Date boundaries.
   * @returns {Promise<Array<object>>} Category breakdown.
   */
  async getTicketsByCategory(params = {}) {
    // Send GET request for category breakdown
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.TICKETS_BY_CATEGORY, { params });
    // Return category breakdown array
    return response.data?.by_category || [];
  },

  /**
   * Retrieves support agent performance leaderboard.
   * Endpoint: GET /api/analytics/agents/
   *
   * @param {object} [params] - Date boundaries.
   * @returns {Promise<object>} Leaderboard data with ranked agents.
   */
  async getAgentLeaderboard(params = {}) {
    // Send GET request for agent performance leaderboard
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.AGENTS, { params });
    // Return agent leaderboard object
    return response.data;
  },

  /**
   * Retrieves active ticket workload distribution across support agents.
   * Endpoint: GET /api/analytics/agents/workload/
   *
   * @returns {Promise<object>} Agent workload distribution data.
   */
  async getAgentWorkload() {
    // Send GET request for agent workload distribution
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.AGENTS_WORKLOAD);
    // Return agent workload object
    return response.data;
  },

  /**
   * Retrieves SLA compliance summary, breach counts, and response/resolution averages.
   * Endpoint: GET /api/analytics/sla/
   *
   * @param {object} [params] - Date boundaries.
   * @returns {Promise<object>} SLA metrics summary.
   */
  async getSLAAnalytics(params = {}) {
    // Send GET request for SLA analytics summary
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.SLA, { params });
    // Return SLA analytics payload
    return response.data;
  },

  /**
   * Retrieves Key Result Areas (KRAs).
   * Endpoint: GET /api/analytics/kras/
   *
   * @returns {Promise<Array<object>>} List of KRAs.
   */
  async getKRAs() {
    // Send GET request for KRAs list
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.KRAS);
    // Return KRAs results array
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves Key Performance Indicators (KPIs).
   * Endpoint: GET /api/analytics/kpis/
   *
   * @returns {Promise<Array<object>>} List of KPIs with target values.
   */
  async getKPIs() {
    // Send GET request for KPIs list
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.KPIS);
    // Return KPIs results array
    return response.data?.results || response.data || [];
  },

  /**
   * Executes automated KPI performance evaluation for an agent.
   * Endpoint: POST /api/analytics/kpis/evaluate/
   *
   * @param {number} agentId - Support agent user ID.
   * @param {string} evaluationPeriod - Evaluation period (e.g. 'MONTHLY', 'QUARTERLY').
   * @returns {Promise<object>} Evaluation results.
   */
  async evaluateKPIs(agentId, evaluationPeriod) {
    // Send POST request triggering KPI evaluation
    const response = await apiClient.post(ENDPOINTS.ANALYTICS.KPI_EVALUATE, {
      // Evaluated agent user ID
      agent_id: agentId,
      // Target period string
      evaluation_period: evaluationPeriod,
    });
    // Return evaluation result payload
    return response.data;
  },

  /**
   * Downloads ticket analytics report in RFC 4180 CSV format generated server-side by Django.
   * Endpoint: GET /api/analytics/tickets/?format=csv
   *
   * @param {object} [params] - Date boundaries.
   * @returns {Promise<void>}
   */
  async exportTicketsCsv(params = {}) {
    // Request CSV blob download from server
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.TICKETS, {
      // Pass format=csv parameter
      params: { ...params, format: 'csv' },
      // Set responseType to blob for binary/file streaming
      responseType: 'blob',
    });
    // Create new Blob from binary CSV response data
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    // Create an object URL representing the blob
    const url = window.URL.createObjectURL(blob);
    // Create temporary link anchor element
    const link = document.createElement('a');
    // Set href to object URL
    link.href = url;
    // Set download attribute with formatted timestamped filename
    link.setAttribute('download', `ticket_analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
    // Append anchor to document body
    document.body.appendChild(link);
    // Programmatically click link to trigger browser download dialog
    link.click();
    // Remove temporary anchor from DOM
    document.body.removeChild(link);
    // Revoke object URL to free memory
    window.URL.revokeObjectURL(url);
  },
};

// Export analyticsService as default export
export default analyticsService;
