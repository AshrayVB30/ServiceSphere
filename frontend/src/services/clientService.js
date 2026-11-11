import apiClient from './api';
import { ENDPOINTS } from './endpoints';

/**
 * ServiceSphere Client Organization Management Service
 * Communicates with Django REST APIs under /api/clients/
 */
export const clientService = {
  /**
   * Retrieves all registered client organizations.
   *
   * @param {object} [params] - Query parameters (e.g. search, ordering).
   * @returns {Promise<Array<object>>} List of client organizations.
   */
  async getClients(params = {}) {
    const response = await apiClient.get(ENDPOINTS.CLIENTS.LIST, { params });
    // Handles both paginated { results: [...] } and unpaginated [...] responses
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves details for a specific client organization.
   *
   * @param {number|string} id - Client organization primary key.
   * @returns {Promise<object>} Client profile data.
   */
  async getClient(id) {
    const response = await apiClient.get(ENDPOINTS.CLIENTS.DETAIL(id));
    return response.data;
  },

  /**
   * Registers/onboards a new client organization in the system.
   *
   * @param {object} payload - Client data.
   * @param {string} payload.name - Business organization name.
   * @param {string} [payload.code] - Unique slug code identifier.
   * @param {string} [payload.domain] - Corporate domain (used as fallback for code).
   * @param {string} [payload.contact_email] - Administrative contact email.
   * @param {string} [payload.phone_number] - Contact telephone number.
   * @param {string} [payload.contact_phone] - Alias for phone_number.
   * @param {string} [payload.address] - Physical address.
   * @returns {Promise<object>} Created client record.
   */
  async createClient(payload) {
    // Generate clean slug code if not explicitly provided
    const code =
      payload.code ||
      payload.domain?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() ||
      payload.name?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    const data = {
      name: payload.name,
      code,
      contact_email: payload.contact_email || '',
      phone_number: payload.phone_number || payload.contact_phone || '',
      address: payload.address || '',
      is_active: payload.is_active !== undefined ? payload.is_active : true,
    };

    const response = await apiClient.post(ENDPOINTS.CLIENTS.LIST, data);
    return response.data;
  },

  /**
   * Partially updates a client organization's profile.
   * Uses PATCH as enforced by backend ClientViewSet.
   *
   * @param {number|string} id - Client ID.
   * @param {object} payload - Fields to update.
   * @returns {Promise<object>} Updated client record.
   */
  async updateClient(id, payload) {
    const data = { ...payload };
    if (payload.contact_phone && !payload.phone_number) {
      data.phone_number = payload.contact_phone;
    }
    const response = await apiClient.patch(ENDPOINTS.CLIENTS.DETAIL(id), data);
    return response.data;
  },

  /**
   * Toggles the active/suspended status of a client organization.
   *
   * @param {number|string} id - Client ID.
   * @param {boolean} currentStatus - Current is_active value.
   * @returns {Promise<object>} Updated client record.
   */
  async toggleActive(id, currentStatus) {
    const response = await apiClient.patch(ENDPOINTS.CLIENTS.DETAIL(id), {
      is_active: !currentStatus,
    });
    return response.data;
  },
};

export default clientService;
