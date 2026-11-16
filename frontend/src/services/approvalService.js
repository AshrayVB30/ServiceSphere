// Import central axios HTTP client configured with CSRF tokens and session credentials
import apiClient from './api';
// Import approval endpoint mapping definitions
import { ENDPOINTS } from './endpoints';

/**
 * ServiceSphere Approval Workflow Service
 * Communicates with Django REST APIs under /api/approvals/
 */
export const approvalService = {
  /**
   * Retrieves all approval requests visible to the authenticated user.
   * Scoped server-side based on user role (Admin, Approver, Agent, Client).
   *
   * @param {object} [params] - Query parameters (status filter, etc.).
   * @returns {Promise<Array<object>>} List of approval requests.
   */
  async getApprovals(params = {}) {
    // Clone query parameters
    const query = { ...params };
    // Remove status parameter if 'ALL' to retrieve all statuses
    if (query.status === 'ALL') {
      delete query.status;
    }
    // Send GET request to approvals list endpoint with filters
    const response = await apiClient.get(ENDPOINTS.APPROVALS.LIST, { params: query });
    // Return approval records array from results or raw response
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves an individual approval request with its nested audit trail.
   *
   * @param {number|string} id - Approval request ID.
   * @returns {Promise<object>} Approval request detail with records.
   */
  async getApproval(id) {
    // Send GET request to approval detail endpoint
    const response = await apiClient.get(ENDPOINTS.APPROVALS.DETAIL(id));
    // Return approval request detail object
    return response.data;
  },

  /**
   * Initiates a new approval request for a ticket.
   * Endpoint: POST /api/approvals/
   *
   * @param {object} payload - Approval submission data.
   * @param {number} payload.ticket - Linked ticket ID.
   * @param {number} payload.approver - Designated approver user ID.
   * @param {string} payload.reason - Business justification.
   * @returns {Promise<object>} Created approval request.
   */
  async createApproval(payload) {
    // Send POST request to create new approval workflow
    const response = await apiClient.post(ENDPOINTS.APPROVALS.LIST, {
      // Linked ticket identifier
      ticket: payload.ticket,
      // Target approver user ID
      approver: payload.approver,
      // Justification text
      reason: payload.reason,
    });
    // Return created approval record
    return response.data;
  },

  /**
   * Grants authorization / approves an operational request.
   * Endpoint: POST /api/approvals/{id}/approve/
   *
   * @param {number|string} id - Approval request ID.
   * @param {string} [comment] - Optional decision rationale.
   * @returns {Promise<object>} Updated approval request.
   */
  async approve(id, comment = '') {
    // Send POST request approving request
    const response = await apiClient.post(ENDPOINTS.APPROVALS.APPROVE(id), {
      // Optional decision rationale note
      comment,
    });
    // Return updated approval record
    return response.data;
  },

  /**
   * Rejects an operational request.
   * Endpoint: POST /api/approvals/{id}/reject/
   *
   * @param {number|string} id - Approval request ID.
   * @param {string} [comment] - Optional rejection reason.
   * @returns {Promise<object>} Updated approval request.
   */
  async reject(id, comment = '') {
    // Send POST request rejecting request
    const response = await apiClient.post(ENDPOINTS.APPROVALS.REJECT(id), {
      // Rejection explanation
      comment,
    });
    // Return updated approval record
    return response.data;
  },

  /**
   * Requests additional clarification from the requester.
   * Endpoint: POST /api/approvals/{id}/request-info/
   *
   * @param {number|string} id - Approval request ID.
   * @param {string} comment - Mandatory explanation of what information is needed.
   * @returns {Promise<object>} Updated approval request.
   */
  async requestInfo(id, comment) {
    // Send POST request requesting more information
    const response = await apiClient.post(ENDPOINTS.APPROVALS.REQUEST_INFO(id), {
      // Explanation of required information
      comment,
    });
    // Return updated approval record
    return response.data;
  },

  /**
   * Resubmits an updated approval request with clarification notes.
   * Endpoint: POST /api/approvals/{id}/resubmit/
   *
   * @param {number|string} id - Approval request ID.
   * @param {object} payload - Resubmission payload.
   * @param {string} payload.comment - Explanatory notes.
   * @returns {Promise<object>} Updated approval request.
   */
  async resubmit(id, payload = {}) {
    // Send POST request resubmitting approval request
    const response = await apiClient.post(ENDPOINTS.APPROVALS.RESUBMIT(id), {
      // Resubmission clarification comment
      comment: payload.comment || '',
    });
    // Return updated approval record
    return response.data;
  },
};

// Export approvalService as default export
export default approvalService;
