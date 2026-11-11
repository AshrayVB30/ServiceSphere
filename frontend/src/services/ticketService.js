import apiClient from './api';
import { ENDPOINTS } from './endpoints';

/**
 * ServiceSphere Ticket Management Service
 * Communicates with Django REST APIs under /api/tickets/
 */
export const ticketService = {
  /**
   * Retrieves support tickets visible to the current authenticated user.
   * Scoped server-side based on role:
   * - Admins see all tickets
   * - Support Agents see their assigned tickets
   * - Clients see their company's tickets
   *
   * @param {object} [params] - Query parameters (status, priority, search).
   * @returns {Promise<Array<object>>} List of tickets.
   */
  async getTickets(params = {}) {
    const response = await apiClient.get(ENDPOINTS.TICKETS.LIST, { params });
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves full details for a single support ticket.
   *
   * @param {number|string} id - Ticket primary key.
   * @returns {Promise<object>} Ticket detail record.
   */
  async getTicket(id) {
    const response = await apiClient.get(ENDPOINTS.TICKETS.DETAIL(id));
    return response.data;
  },

  /**
   * Submits a new support ticket to the help desk.
   * Server derives client organization and creator automatically from request.user.
   *
   * @param {object} payload - Ticket attributes.
   * @param {string} payload.subject - Issue summary.
   * @param {string} payload.description - Detailed problem explanation.
   * @param {string} payload.category - Functional category (e.g. Technical Support, Bug).
   * @param {string} payload.priority - Priority level (LOW, MEDIUM, HIGH, URGENT).
   * @returns {Promise<object>} Created ticket record.
   */
  async createTicket(payload) {
    const data = {
      subject: payload.subject,
      description: payload.description,
      category: payload.category,
      priority: payload.priority,
    };
    const response = await apiClient.post(ENDPOINTS.TICKETS.LIST, data);
    return response.data;
  },

  /**
   * Assigns or reassigns a support ticket to an internal support agent.
   * Endpoint: POST /api/tickets/{id}/assign/
   *
   * @param {number|string} id - Ticket ID.
   * @param {number|string} agentId - Support agent user ID.
   * @param {string} [note] - Optional assignment note for audit history.
   * @returns {Promise<object>} Updated ticket record.
   */
  async assignTicket(id, agentId, note = '') {
    const response = await apiClient.post(ENDPOINTS.TICKETS.ASSIGN(id), {
      assigned_to: agentId,
      note,
    });
    return response.data;
  },

  /**
   * Advances the ticket lifecycle status according to backend state machine rules.
   * Endpoint: POST /api/tickets/{id}/change_status/
   *
   * @param {number|string} id - Ticket ID.
   * @param {string} status - New lifecycle status (OPEN, IN_PROGRESS, AWAITING_CUSTOMER, RESOLVED, CLOSED).
   * @param {string} [note] - Optional explanation for audit history.
   * @returns {Promise<object>} Updated ticket record.
   */
  async changeStatus(id, status, note = '') {
    const response = await apiClient.post(ENDPOINTS.TICKETS.CHANGE_STATUS(id), {
      status,
      note,
    });
    return response.data;
  },

  /**
   * Updates the priority of a ticket and recalculates SLA deadlines server-side.
   * Endpoint: POST /api/tickets/{id}/change_priority/
   *
   * @param {number|string} id - Ticket ID.
   * @param {string} priority - New priority level (LOW, MEDIUM, HIGH, URGENT).
   * @returns {Promise<object>} Updated ticket record.
   */
  async changePriority(id, priority) {
    const response = await apiClient.post(ENDPOINTS.TICKETS.CHANGE_PRIORITY(id), {
      priority,
    });
    return response.data;
  },

  /**
   * Retrieves conversation comments and internal notes for a specific ticket.
   * Endpoint: GET /api/tickets/{ticketId}/comments/
   *
   * @param {number|string} ticketId - Ticket ID.
   * @returns {Promise<Array<object>>} Chronological comment records.
   */
  async getComments(ticketId) {
    const response = await apiClient.get(ENDPOINTS.TICKETS.COMMENTS(ticketId));
    return response.data || [];
  },

  /**
   * Posts a new public reply or internal staff note to a ticket conversation.
   * Endpoint: POST /api/tickets/{ticketId}/comments/
   *
   * @param {number|string} ticketId - Ticket ID.
   * @param {object} payload - Comment payload.
   * @param {string} [payload.message] - Comment text.
   * @param {string} [payload.comment] - Alias for message.
   * @param {boolean} [payload.is_internal] - True for private internal note, False for public reply.
   * @returns {Promise<object>} Created comment record.
   */
  async addComment(ticketId, payload) {
    const data = {
      message: payload.message || payload.comment || '',
      is_internal: !!payload.is_internal,
    };
    const response = await apiClient.post(ENDPOINTS.TICKETS.COMMENTS(ticketId), data);
    return response.data;
  },

  /**
   * Retrieves the real-time SLA metrics, deadlines, and breach status for a ticket.
   * Endpoint: GET /api/sla/tickets/{ticketId}/
   *
   * @param {number|string} ticketId - Ticket ID.
   * @returns {Promise<object>} SLA tracking metrics.
   */
  async getSLA(ticketId) {
    const response = await apiClient.get(ENDPOINTS.SLA.TICKET_TRACKING(ticketId));
    return response.data;
  },
};

export default ticketService;
