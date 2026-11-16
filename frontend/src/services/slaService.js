// Import central axios HTTP client configured with CSRF tokens and session credentials
import apiClient from './api';
// Import SLA endpoint paths
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
    // Send GET request to SLA policies endpoint
    const response = await apiClient.get(ENDPOINTS.SLA.POLICIES);
    // Return policies array from paginated results or raw data
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves an individual SLA policy by primary key.
   *
   * @param {number|string} id - Policy ID.
   * @returns {Promise<object>} Policy details.
   */
  async getPolicy(id) {
    // Send GET request to policy detail endpoint
    const response = await apiClient.get(ENDPOINTS.SLA.POLICY_DETAIL(id));
    // Return policy details object
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
    // Send POST request to activate SLA policy
    const response = await apiClient.post(ENDPOINTS.SLA.POLICY_ACTIVATE(id));
    // Return updated policy record
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
    // Send PATCH request with partial policy attributes
    const response = await apiClient.patch(ENDPOINTS.SLA.POLICY_DETAIL(id), data);
    // Return updated policy record
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
    // Send POST request to deactivate policy
    const response = await apiClient.post(ENDPOINTS.SLA.POLICY_DEACTIVATE(id));
    // Return updated policy record
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
    // Send GET request to ticket SLA tracking endpoint
    const response = await apiClient.get(ENDPOINTS.SLA.TICKET_TRACKING(ticketId));
    // Return ticket SLA metrics
    return response.data;
  },

  /**
   * Retrieves aggregate SLA health metrics across all active tickets.
   * Endpoint: GET /api/sla/monitoring/
   *
   * @returns {Promise<object>} Aggregated SLA dashboard summary.
   */
  async getMonitoringSummary() {
    // Send GET request to global SLA monitoring endpoint
    const response = await apiClient.get(ENDPOINTS.SLA.MONITORING);
    // Return monitoring statistics object
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
    // Send GET request for overdue tickets with query filters
    const response = await apiClient.get(ENDPOINTS.SLA.OVERDUE_TICKETS, { params });
    // Return overdue tickets array
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves chronological log of active and historical SLA escalation events.
   * Endpoint: GET /api/sla/escalations/
   *
   * @returns {Promise<Array<object>>} List of escalation incidents.
   */
  async getEscalations() {
    // Send GET request to escalations log endpoint
    const response = await apiClient.get(ENDPOINTS.SLA.ESCALATIONS);
    // Return escalation incident records
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
    // Send POST request acknowledging escalation
    const response = await apiClient.post(ENDPOINTS.SLA.ESCALATION_ACKNOWLEDGE(id), {
      // Optional acknowledgment comment
      note,
    });
    // Return updated escalation incident record
    return response.data;
  },
};

// Export slaService as default export
export default slaService;
