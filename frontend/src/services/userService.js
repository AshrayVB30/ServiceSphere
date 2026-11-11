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
   * Currently maps to active staff accounts via agent workload endpoint.
   *
   * @param {object} [params] - Query filter parameters.
   * @returns {Promise<Array<object>>} User list.
   */
  async getUsers(params = {}) {
    try {
      const agents = await this.getAgents();
      let list = agents.map((a) => ({
        id: a.id,
        username: a.username,
        email: `${a.username}@servicesphere.io`,
        first_name: a.full_name?.split(' ')[0] || a.username,
        last_name: a.full_name?.split(' ').slice(1).join(' ') || '',
        role: a.role,
        is_active: true,
        client: null,
      }));

      if (params.search) {
        const q = params.search.toLowerCase();
        list = list.filter(
          (u) =>
            u.username.toLowerCase().includes(q) ||
            u.first_name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        );
      }
      return list;
    } catch {
      return [];
    }
  },

  /**
   * Creates a new user record.
   * Note: Dedicated user CRUD is a pending backend feature; administrative onboarding is handled via Django Admin.
   *
   * @param {object} userData - User record details.
   */
  async createUser(userData) {
    throw new Error(
      `User creation for '${userData.username}' requires the pending /api/users/ administrative endpoint. Account provisioning is currently performed via Django Admin.`
    );
  },

  /**
   * Updates an existing user record.
   * Note: Dedicated user CRUD is a pending backend feature; administrative updates are handled via Django Admin.
   *
   * @param {number|string} id - User ID.
   * @param {object} [_userData] - Partial user record updates.
   */
  async updateUser(id, _userData) {
    throw new Error(
      `User modification for ID #${id} requires the pending /api/users/ administrative endpoint. Profile changes are currently performed via Django Admin.`
    );
  },

  /**
   * Toggles active/suspended state of a user.
   * Note: Dedicated user CRUD is a pending backend feature.
   *
   * @param {number|string} id - User ID.
   */
  async toggleActive(id) {
    throw new Error(
      `User status modification for ID #${id} requires the pending /api/users/ administrative endpoint. Account status is currently updated via Django Admin.`
    );
  },
};

export default userService;
