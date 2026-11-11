import apiClient from './api';
import { ENDPOINTS } from './endpoints';

/**
 * ServiceSphere Authentication & Session Service
 * Communicates with Django session-based authentication endpoints.
 */
export const authService = {
  /**
   * Initializes the CSRF cookie on the browser client by pinging the backend CSRF endpoint.
   * Must be called before initiating authentication requests.
   *
   * @returns {Promise<string>} CSRF token string.
   */
  async getCsrfToken() {
    const response = await apiClient.get(ENDPOINTS.AUTH.CSRF);
    return response.data.csrfToken;
  },

  /**
   * Registers a new client or approver account on ServiceSphere.
   * On 201 Created, Django binds a session and returns the user's profile metadata.
   *
   * @param {object} userData - Registration payload.
   * @returns {Promise<object>} User profile object.
   */
  async register(userData) {
    // Ensure CSRF cookie is initialized before submitting POST
    await this.getCsrfToken().catch(() => {});

    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, userData);
      return response.data.user || response.data;
    } catch (error) {
      throw new Error(error.formattedMessage || 'Registration failed. Please check form details.', {
        cause: error,
      });
    }
  },

  /**
   * Authenticates user credentials against the Django backend.
   * On 200 OK, Django establishes a session and returns the user's profile metadata.
   *
   * @param {object} credentials - User credentials.
   * @param {string} [credentials.username] - User's username.
   * @param {string} [credentials.email] - User's registered email address.
   * @param {string} credentials.password - Account password.
   * @returns {Promise<object>} User profile object.
   */
  async login({ email, username, password }) {
    const identifier = username || email;

    // Ensure CSRF cookie is initialized before submitting POST
    await this.getCsrfToken().catch(() => {});

    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, {
        username: identifier,
        password,
      });
      return response.data.user || response.data;
    } catch (error) {
      throw new Error(error.formattedMessage || 'Authentication failed. Please verify credentials.', {
        cause: error,
      });
    }
  },

  /**
   * Retrieves the current authenticated user's profile, role, and organization affiliation.
   * Endpoint: GET /api/auth/me/
   *
   * @returns {Promise<object>} User profile object.
   */
  async getMe() {
    try {
      const response = await apiClient.get(ENDPOINTS.AUTH.ME);
      return response.data;
    } catch (error) {
      throw new Error(error.formattedMessage || 'Session expired or unauthenticated.', {
        cause: error,
      });
    }
  },

  /**
   * Terminates the active Django session and clears session cookies on the server.
   * Endpoint: POST /api/auth/logout/
   *
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // Invalidate frontend state regardless of network response
    }
  },

  /**
   * Updates the authenticated user's password with old-password verification
   * and Django complexity rules.
   * Endpoint: POST /api/auth/change-password/
   *
   * @param {object} payload - Passwords payload.
   * @param {string} payload.old_password - Current password.
   * @param {string} payload.new_password - New replacement password.
   * @returns {Promise<object>} Success detail response.
   */
  async changePassword({ old_password, new_password }) {
    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        old_password,
        new_password,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.formattedMessage || 'Failed to update password.', {
        cause: error,
      });
    }
  },
};

export default authService;
