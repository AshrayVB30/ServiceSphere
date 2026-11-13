import apiClient from './api';
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
      const response = await apiClient.get(ENDPOINTS.ANALYTICS.AGENTS_WORKLOAD);
      const workload = response.data?.workload || [];
      return workload.map((agent) => ({
        id: agent.agent_id,
        username: agent.username,
        full_name: agent.full_name,
        role: 'SUPPORT_AGENT',
        pending_tickets: agent.pending_tickets,
      }));
    } catch {
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
      const query = {};
      if (params.search?.trim()) query.search = params.search.trim();
      if (params.role && params.role !== 'ALL') query.role = params.role;

      const response = await apiClient.get(ENDPOINTS.USERS.LIST, { params: query });
      return response.data?.results || response.data || [];
    } catch {
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
    const response = await apiClient.post(ENDPOINTS.USERS.LIST, userData);
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
    const response = await apiClient.patch(ENDPOINTS.USERS.DETAIL(id), userData);
    return response.data;
  },

  /**
   * Toggles active/suspended state of a user.
   * Endpoint: POST /api/users/{id}/toggle-active/
   *
   * @param {number|string} id - User ID.
   */
  async toggleActive(id) {
    const response = await apiClient.post(ENDPOINTS.USERS.TOGGLE_ACTIVE(id));
    return response.data;
  },
};

export default userService;
