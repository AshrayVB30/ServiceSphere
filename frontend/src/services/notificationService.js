// Import central axios HTTP client configured with CSRF tokens and session credentials
import apiClient from './api';
// Import notification endpoint mapping definitions
import { ENDPOINTS } from './endpoints';

/**
 * ServiceSphere In-App & Email Notification Service
 * Communicates with Django REST APIs under /api/notifications/
 */
export const notificationService = {
  /**
   * Retrieves all notifications addressed to the current authenticated user.
   * Endpoint: GET /api/notifications/
   *
   * @returns {Promise<Array<object>>} Chronological notification feed.
   */
  async getNotifications() {
    // Send GET request to notifications list endpoint
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST);
    // Return notifications results array
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves only unread notifications for the user.
   * Endpoint: GET /api/notifications/unread/
   *
   * @returns {Promise<Array<object>>} Unread notifications.
   */
  async getUnreadNotifications() {
    // Send GET request for unread notifications
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.UNREAD);
    // Return unread notifications array
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves the raw count of unread notifications for badge rendering.
   * Endpoint: GET /api/notifications/unread-count/
   *
   * @returns {Promise<number>} Unread count.
   */
  async getUnreadCount() {
    // Send GET request for unread notification count
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
    // Return numerical unread count
    return response.data.unread_count ?? 0;
  },

  /**
   * Marks a specific notification as read.
   * Endpoint: PATCH /api/notifications/{id}/read/
   *
   * @param {number|string} id - Notification ID.
   * @returns {Promise<object>} Updated notification record.
   */
  async markAsRead(id) {
    // Send PATCH request marking notification read
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    // Return updated notification record
    return response.data;
  },

  /**
   * Marks all unread notifications for the current user as read in bulk.
   * Endpoint: PATCH /api/notifications/mark-all-read/
   *
   * @returns {Promise<object>} Count of updated notifications.
   */
  async markAllRead() {
    // Send PATCH request marking all unread notifications as read
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    // Return response confirmation
    return response.data;
  },

  /**
   * Retrieves the current user's notification delivery preferences.
   * Endpoint: GET /api/notifications/preferences/
   *
   * @returns {Promise<object>} Notification preferences.
   */
  async getPreferences() {
    // Send GET request for notification delivery preferences
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.PREFERENCES);
    // Return preferences object
    return response.data;
  },

  /**
   * Updates the user's notification delivery settings.
   * Endpoint: PATCH /api/notifications/preferences/
   *
   * @param {object} payload - Updated preference flags.
   * @returns {Promise<object>} Updated preferences.
   */
  async updatePreferences(payload) {
    // Send PATCH request updating preferences
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.PREFERENCES, payload);
    // Return updated preferences
    return response.data;
  },
};

// Export notificationService as default export
export default notificationService;
