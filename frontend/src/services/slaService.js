import apiClient from './api';
import { ENDPOINTS } from './endpoints';

/**
 * ServiceSphere Service Level Agreement (SLA) Service
 * Communicates with Django REST APIs under /api/sla/
 */
export const slaService = {
  /**
   * Retrieves all defined SLA policies.
   * Endpoint: GET /api/sla/policies/
   *
   * @returns {Promise<Array<object>>} List of SLA policies.
   */
  async getPolicies() {
    const response = await apiClient.get(ENDPOINTS.SLA.POLICIES);
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves an individual SLA policy by primary key.
   *
   * @param {number|string} id - Policy ID.
   * @returns {Promise<object>} Policy details.
   */
  async getPolicy(id) {
    const response = await apiClient.get(ENDPOINTS.SLA.POLICY_DETAIL(id));
    return response.data;
  },

  /**
   * Activates an SLA policy for its assigned priority level.
   * Endpoint: POST /api/sla/policies/{id}/activate/
   *
   * @param {number|string} id - Policy ID.
   * @returns {Promise<object>} Updated policy record.
   */
  async activatePolicy(id) {
    const response = await apiClient.post(ENDPOINTS.SLA.POLICY_ACTIVATE(id));
    return response.data;
  },

  /**
   * Updates SLA policy thresholds and parameters.
   * Endpoint: PATCH /api/sla/policies/{id}/
   *
   * @param {number|string} id - Policy ID.
   * @param {object} data - Partial policy updates (response_time_hours, resolution_time_hours, description).
   * @returns {Promise<object>} Updated policy record.
   */
  async updatePolicy(id, data) {
    const response = await apiClient.patch(ENDPOINTS.SLA.POLICY_DETAIL(id), data);
    return response.data;
  },

  /**
   * Deactivates an SLA policy.
   * Endpoint: POST /api/sla/policies/{id}/deactivate/
   *
   * @param {number|string} id - Policy ID.
   * @returns {Promise<object>} Updated policy record.
   */
  async deactivatePolicy(id) {
    const response = await apiClient.post(ENDPOINTS.SLA.POLICY_DEACTIVATE(id));
    return response.data;
  },

  /**
   * Retrieves SLA deadline monitoring metrics for a specific ticket.
   * Endpoint: GET /api/sla/tickets/{ticketId}/
   *
   * @param {number|string} ticketId - Ticket ID.
   * @returns {Promise<object>} Ticket SLA tracking details.
   */
  async getTicketSLA(ticketId) {
    const response = await apiClient.get(ENDPOINTS.SLA.TICKET_TRACKING(ticketId));
    return response.data;
  },

  /**
   * Retrieves aggregate SLA health metrics across all active tickets.
   * Endpoint: GET /api/sla/monitoring/
   *
   * @returns {Promise<object>} Aggregated SLA dashboard summary.
   */
  async getMonitoringSummary() {
    const response = await apiClient.get(ENDPOINTS.SLA.MONITORING);
    return response.data;
  },

  /**
   * Lists all active tickets that have breached either their first-response or resolution SLA.
   * Endpoint: GET /api/sla/overdue-tickets/
   *
   * @param {object} [params] - Optional filters (priority, client_id, assigned_to).
   * @returns {Promise<Array<object>>} Overdue ticket records.
   */
  async getOverdueTickets(params = {}) {
    const response = await apiClient.get(ENDPOINTS.SLA.OVERDUE_TICKETS, { params });
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves chronological log of active and historical SLA escalation events.
   * Endpoint: GET /api/sla/escalations/
   *
   * @returns {Promise<Array<object>>} List of escalation incidents.
   */
  async getEscalations() {
    const response = await apiClient.get(ENDPOINTS.SLA.ESCALATIONS);
    return response.data?.results || response.data || [];
  },

  /**
   * Acknowledges an SLA escalation incident with optional operational notes.
   * Endpoint: POST /api/sla/escalations/{id}/acknowledge/
   *
   * @param {number|string} id - Escalation incident ID.
   * @param {string} [note] - Operational acknowledgement comment.
   * @returns {Promise<object>} Updated escalation incident.
   */
  async acknowledgeEscalation(id, note = '') {
    const response = await apiClient.post(ENDPOINTS.SLA.ESCALATION_ACKNOWLEDGE(id), {
      note,
    });
    return response.data;
  },
};

export default slaService;
