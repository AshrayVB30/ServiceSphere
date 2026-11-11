import apiClient from './api';
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
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.DASHBOARD, { params });
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
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.TICKETS, { params });
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
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.TICKETS_TRENDS, { params });
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
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.TICKETS_BY_PRIORITY, { params });
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
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.TICKETS_BY_CATEGORY, { params });
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
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.AGENTS, { params });
    return response.data;
  },

  /**
   * Retrieves active ticket workload distribution across support agents.
   * Endpoint: GET /api/analytics/agents/workload/
   *
   * @returns {Promise<object>} Agent workload distribution data.
   */
  async getAgentWorkload() {
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.AGENTS_WORKLOAD);
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
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.SLA, { params });
    return response.data;
  },

  /**
   * Retrieves Key Result Areas (KRAs).
   * Endpoint: GET /api/analytics/kras/
   *
   * @returns {Promise<Array<object>>} List of KRAs.
   */
  async getKRAs() {
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.KRAS);
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves Key Performance Indicators (KPIs).
   * Endpoint: GET /api/analytics/kpis/
   *
   * @returns {Promise<Array<object>>} List of KPIs with target values.
   */
  async getKPIs() {
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.KPIS);
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
    const response = await apiClient.post(ENDPOINTS.ANALYTICS.KPI_EVALUATE, {
      agent_id: agentId,
      evaluation_period: evaluationPeriod,
    });
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
    const response = await apiClient.get(ENDPOINTS.ANALYTICS.TICKETS, {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ticket_analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default analyticsService;
