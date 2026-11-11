import apiClient from './api';
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
    const query = { ...params };
    if (query.status === 'ALL') {
      delete query.status;
    }
    const response = await apiClient.get(ENDPOINTS.APPROVALS.LIST, { params: query });
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves an individual approval request with its nested audit trail.
   *
   * @param {number|string} id - Approval request ID.
   * @returns {Promise<object>} Approval request detail with records.
   */
  async getApproval(id) {
    const response = await apiClient.get(ENDPOINTS.APPROVALS.DETAIL(id));
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
    const response = await apiClient.post(ENDPOINTS.APPROVALS.LIST, {
      ticket: payload.ticket,
      approver: payload.approver,
      reason: payload.reason,
    });
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
    const response = await apiClient.post(ENDPOINTS.APPROVALS.APPROVE(id), {
      comment,
    });
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
    const response = await apiClient.post(ENDPOINTS.APPROVALS.REJECT(id), {
      comment,
    });
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
    const response = await apiClient.post(ENDPOINTS.APPROVALS.REQUEST_INFO(id), {
      comment,
    });
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
    const response = await apiClient.post(ENDPOINTS.APPROVALS.RESUBMIT(id), {
      comment: payload.comment || '',
    });
    return response.data;
  },
};

export default approvalService;
