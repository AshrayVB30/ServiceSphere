// Import centralized axios client with session authentication credentials
import apiClient from './api';
// Import API endpoint constants
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
    // Send GET request to tickets list endpoint with query parameters
    const response = await apiClient.get(ENDPOINTS.TICKETS.LIST, { params });
    // Extract results from paginated DRF payload or fallback to raw array
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves full details for a single support ticket.
   *
   * @param {number|string} id - Ticket primary key.
   * @returns {Promise<object>} Ticket detail record.
   */
  async getTicket(id) {
    // Send GET request to ticket detail endpoint
    const response = await apiClient.get(ENDPOINTS.TICKETS.DETAIL(id));
    // Return full ticket detail object
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
    // Sanitize and structure ticket submission data payload
    const data = {
      // Issue subject title
      subject: payload.subject,
      // Markdown-formatted issue description
      description: payload.description,
      // Category identifier string
      category: payload.category,
      // Priority level string
      priority: payload.priority,
    };
    // Include client organization ID if explicitly provided (e.g. by admin)
    if (payload.client) {
      data.client = payload.client;
    }
    // Send POST request to create ticket
    const response = await apiClient.post(ENDPOINTS.TICKETS.LIST, data);
    // Return created ticket record
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
    // Send POST request to ticket assignment endpoint
    const response = await apiClient.post(ENDPOINTS.TICKETS.ASSIGN(id), {
      // Designated agent user ID
      assigned_to: agentId,
      // Optional assignment audit note
      note,
    });
    // Return updated ticket object
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
    // Send POST request to ticket status transition endpoint
    const response = await apiClient.post(ENDPOINTS.TICKETS.CHANGE_STATUS(id), {
      // Target lifecycle status
      status,
      // Operational change note
      note,
    });
    // Return updated ticket object
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
    // Send POST request to change ticket priority
    const response = await apiClient.post(ENDPOINTS.TICKETS.CHANGE_PRIORITY(id), {
      // New priority level
      priority,
    });
    // Return updated ticket object
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
    // Fetch comments list for the ticket
    const response = await apiClient.get(ENDPOINTS.TICKETS.COMMENTS(ticketId));
    // Return list of comments or empty array fallback
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
    // Construct sanitized comment submission payload
    const data = {
      // Message body from message or alias comment property
      message: payload.message || payload.comment || '',
      // Boolean flag indicating if note is private to staff
      is_internal: !!payload.is_internal,
    };
    // Post new comment to ticket conversation
    const response = await apiClient.post(ENDPOINTS.TICKETS.COMMENTS(ticketId), data);
    // Return created comment object
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
    // Fetch SLA tracking record from SLA app
    const response = await apiClient.get(ENDPOINTS.SLA.TICKET_TRACKING(ticketId));
    // Return SLA tracking metrics object
    return response.data;
  },
};

// Export ticketService as default export
export default ticketService;
