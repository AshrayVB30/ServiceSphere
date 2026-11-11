import apiClient from './api';
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
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST);
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves only unread notifications for the user.
   * Endpoint: GET /api/notifications/unread/
   *
   * @returns {Promise<Array<object>>} Unread notifications.
   */
  async getUnreadNotifications() {
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.UNREAD);
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves the raw count of unread notifications for badge rendering.
   * Endpoint: GET /api/notifications/unread-count/
   *
   * @returns {Promise<number>} Unread count.
   */
  async getUnreadCount() {
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
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
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    return response.data;
  },

  /**
   * Marks all unread notifications for the current user as read in bulk.
   * Endpoint: PATCH /api/notifications/mark-all-read/
   *
   * @returns {Promise<object>} Count of updated notifications.
   */
  async markAllRead() {
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    return response.data;
  },

  /**
   * Retrieves the current user's notification delivery preferences.
   * Endpoint: GET /api/notifications/preferences/
   *
   * @returns {Promise<object>} Notification preferences.
   */
  async getPreferences() {
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.PREFERENCES);
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
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.PREFERENCES, payload);
    return response.data;
  },
};

export default notificationService;
