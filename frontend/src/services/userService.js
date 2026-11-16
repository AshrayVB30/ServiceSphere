// Import central axios HTTP client configured with CSRF tokens and session credentials
import apiClient from './api';
// Import user and analytics endpoint mappings
import { ENDPOINTS } from './endpoints';

/**
 * ServiceSphere User & Agent Directory Service
 * Interfaces with backend user and agent endpoints.
 * Note: Full user CRUD (/api/users/) is a documented pending backend requirement.
 * Support agents are retrieved dynamically from /api/analytics/agents/workload/.
 */
export const userService = {
  /**
   * Retrieves active support agents available for ticket assignment.
   * Fetches real agent records from the backend analytics workload service.
   *
   * @returns {Promise<Array<object>>} List of support agents.
   */
  async getAgents() {
    try {
      // Query backend agent workload endpoint to discover active staff
      const response = await apiClient.get(ENDPOINTS.ANALYTICS.AGENTS_WORKLOAD);
      // Extract workload list from response
      const workload = response.data?.workload || [];
      // Transform raw workload data into standard agent profile structures
      return workload.map((agent) => ({
        // Agent user identifier
        id: agent.agent_id,
        // Username string
        username: agent.username,
        // Full display name
        full_name: agent.full_name,
        // Standard user role
        role: 'SUPPORT_AGENT',
        // Count of active tickets assigned to this agent
        pending_tickets: agent.pending_tickets,
      }));
    } catch {
      // Return empty array fallback in case of endpoint failure
      return [];
    }
  },

  /**
   * Retrieves user directory records.
   * Endpoint: GET /api/users/
   *
   * @param {object} [params] - Query filter parameters (search, role).
   * @returns {Promise<Array<object>>} User list.
   */
  async getUsers(params = {}) {
    try {
      // Build query object from input parameters
      const query = {};
      // Apply trimmed search term if provided
      if (params.search?.trim()) query.search = params.search.trim();
      // Apply role filter if specified and not 'ALL'
      if (params.role && params.role !== 'ALL') query.role = params.role;

      // Send GET request to users list endpoint
      const response = await apiClient.get(ENDPOINTS.USERS.LIST, { params: query });
      // Return user results array from paginated response or raw data
      return response.data?.results || response.data || [];
    } catch {
      // Return empty array on failure
      return [];
    }
  },

  /**
   * Provisions a new user account.
   * Endpoint: POST /api/users/
   *
   * @param {object} userData - User record details.
   */
  async createUser(userData) {
    // Send POST request to create user
    const response = await apiClient.post(ENDPOINTS.USERS.LIST, userData);
    // Return created user object
    return response.data;
  },

  /**
   * Updates an existing user record.
   * Endpoint: PATCH /api/users/{id}/
   *
   * @param {number|string} id - User ID.
   * @param {object} userData - Partial user record updates.
   */
  async updateUser(id, userData) {
    // Send PATCH request with updated user fields
    const response = await apiClient.patch(ENDPOINTS.USERS.DETAIL(id), userData);
    // Return updated user object
    return response.data;
  },

  /**
   * Toggles active/suspended state of a user.
   * Endpoint: POST /api/users/{id}/toggle-active/
   *
   * @param {number|string} id - User ID.
   */
  async toggleActive(id) {
    // Send POST request to toggle active status
    const response = await apiClient.post(ENDPOINTS.USERS.TOGGLE_ACTIVE(id));
    // Return updated user data
    return response.data;
  },
};

// Export userService as default export
export default userService;
