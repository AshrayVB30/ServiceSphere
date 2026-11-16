// Import central axios HTTP client configured with CSRF interceptors and credentials
import apiClient from './api';
// Import centralized endpoint dictionary for authentication routes
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
    // Send GET request to Django CSRF endpoint to seed the 'csrftoken' cookie
    const response = await apiClient.get(ENDPOINTS.AUTH.CSRF);
    // Return extracted CSRF token string from response payload
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
    // Ensure CSRF cookie is initialized before submitting POST request
    await this.getCsrfToken().catch(() => {});

    try {
      // Send POST request with user registration fields
      const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, userData);
      // Return user profile object from response
      return response.data.user || response.data;
    } catch (error) {
      // Throw descriptive error with formatted backend validation message
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
    // Accept either username or email as the login identifier
    const identifier = username || email;

    // Ensure CSRF cookie is initialized before submitting POST
    await this.getCsrfToken().catch(() => {});

    try {
      // Dispatch login request to Django backend authentication endpoint
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, {
        username: identifier,
        password,
      });
      // Return authenticated user profile data
      return response.data.user || response.data;
    } catch (error) {
      // Throw descriptive error with formatted message
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
      // Fetch authenticated user profile using active session cookie
      const response = await apiClient.get(ENDPOINTS.AUTH.ME);
      // Return user data object
      return response.data;
    } catch (error) {
      // Throw error if session is invalid or expired
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
      // Send logout request to backend to delete session on server
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
      // Send password update request with current and new passwords
      const response = await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        old_password,
        new_password,
      });
      // Return success response data
      return response.data;
    } catch (error) {
      // Throw formatted error message
      throw new Error(error.formattedMessage || 'Failed to update password.', {
        cause: error,
      });
    }
  },

  /**
   * Requests a password recovery link sent via email.
   * Endpoint: POST /api/auth/password-reset/
   */
  async requestPasswordReset(email) {
    // Ensure CSRF token is available
    await this.getCsrfToken().catch(() => {});
    try {
      // Submit password reset request with user email
      const response = await apiClient.post(ENDPOINTS.AUTH.PASSWORD_RESET, { email });
      // Return response payload
      return response.data;
    } catch (error) {
      // Throw formatted error
      throw new Error(error.formattedMessage || 'Failed to submit password reset request.', {
        cause: error,
      });
    }
  },

  /**
   * Confirms and sets a new password using a token received via email.
   * Endpoint: POST /api/auth/password-reset-confirm/
   */
  async confirmPasswordReset({ uid, token, new_password, new_password_confirm }) {
    // Ensure CSRF token is available
    await this.getCsrfToken().catch(() => {});
    try {
      // Submit new password along with uid and token parameters
      const response = await apiClient.post(ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM, {
        uid,
        token,
        new_password,
        new_password_confirm,
      });
      // Return confirmation response data
      return response.data;
    } catch (error) {
      // Throw formatted error
      throw new Error(error.formattedMessage || 'Password reset confirmation failed.', {
        cause: error,
      });
    }
  },
};

// Export authService as default export
export default authService;
