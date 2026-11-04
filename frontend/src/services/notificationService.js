import apiClient from './api';
import { ENDPOINTS } from './endpoints';

const STORAGE_KEY = 'servicesphere_mock_notifications';

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: 'High Priority SLA Warning',
    message: 'Ticket TCK-8821 response deadline is 75% elapsed. Action required within 1 hr.',
    type: 'SLA_ALERT',
    target_url: '/tickets/1',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 0.5).toISOString(),
  },
  {
    id: 2,
    title: 'New Approval Request Submitted',
    message: 'Sarah Connor requested hardware server tier upgrade authorization on TCK-8812.',
    type: 'APPROVAL',
    target_url: '/approvals',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 3,
    title: 'Ticket Assigned to You',
    message: 'You have been assigned to Ticket TCK-8819 (Database read replica delay).',
    type: 'TICKET_ASSIGNED',
    target_url: '/tickets/3',
    is_read: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 4,
    title: 'Customer Added Comment',
    message: 'John Doe attached HAR log files on Ticket TCK-8821.',
    type: 'COMMENT',
    target_url: '/tickets/1',
    is_read: true,
    created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
  },
];

function getStoredNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
  return INITIAL_NOTIFICATIONS;
}

function saveStoredNotifications(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export const notificationService = {
  async getNotifications() {
    try {
      const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST);
      return response.data.results || response.data;
    } catch {
      return getStoredNotifications();
    }
  },

  async markAsRead(id) {
    try {
      await apiClient.post(ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    } catch {
      const list = getStoredNotifications();
      const index = list.findIndex((n) => String(n.id) === String(id));
      if (index !== -1) {
        list[index].is_read = true;
        saveStoredNotifications(list);
      }
    }
  },

  async markAllRead() {
    try {
      await apiClient.post(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    } catch {
      const list = getStoredNotifications().map((n) => ({ ...n, is_read: true }));
      saveStoredNotifications(list);
      return list;
    }
  },
};

export default notificationService;

