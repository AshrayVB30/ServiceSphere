import apiClient from './api';
import { USER_ROLES } from '../constants';

const STORAGE_KEY = 'servicesphere_mock_users';

const INITIAL_USERS = [
  {
    id: 1,
    username: 'alex_admin',
    email: 'admin@servicesphere.io',
    first_name: 'Alex',
    last_name: 'Vance',
    role: USER_ROLES.ADMIN,
    phone_number: '+1 (555) 123-4567',
    client: null,
    is_active: true,
    last_login: '2026-11-04T08:15:00.000Z',
    date_joined: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    username: 'sarah_agent',
    email: 'agent@servicesphere.io',
    first_name: 'Sarah',
    last_name: 'Connor',
    role: USER_ROLES.SUPPORT_AGENT,
    phone_number: '+1 (555) 987-6543',
    client: null,
    is_active: true,
    last_login: '2026-11-04T09:00:00.000Z',
    date_joined: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 3,
    username: 'john_client',
    email: 'client@acmecorp.com',
    first_name: 'John',
    last_name: 'Doe',
    role: USER_ROLES.CLIENT,
    phone_number: '+1 (555) 456-7890',
    client: { id: 1, name: 'Acme Global Corp' },
    is_active: true,
    last_login: '2026-11-03T16:20:00.000Z',
    date_joined: '2026-01-15T12:00:00.000Z',
  },
  {
    id: 4,
    username: 'elena_approver',
    email: 'approver@acmecorp.com',
    first_name: 'Elena',
    last_name: 'Rostova',
    role: USER_ROLES.APPROVER,
    phone_number: '+1 (555) 234-5678',
    client: { id: 1, name: 'Acme Global Corp' },
    is_active: true,
    last_login: '2026-11-02T11:45:00.000Z',
    date_joined: '2026-01-20T14:30:00.000Z',
  },
  {
    id: 5,
    username: 'tony_dev',
    email: 'tony@starkindustries.com',
    first_name: 'Tony',
    last_name: 'Stark',
    role: USER_ROLES.CLIENT,
    phone_number: '+1 (555) 345-6789',
    client: { id: 2, name: 'Stark Industries' },
    is_active: true,
    last_login: '2026-11-04T07:10:00.000Z',
    date_joined: '2026-02-01T09:00:00.000Z',
  },
];

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
}

function saveStoredUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

export const userService = {
  async getUsers(params = {}) {
    try {
      const response = await apiClient.get('/users/', { params });
      return response.data.results || response.data;
    } catch {
      let list = [...getStoredUsers()];
      if (params.search) {
        const query = params.search.toLowerCase();
        list = list.filter(
          (u) =>
            u.username.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query) ||
            u.first_name.toLowerCase().includes(query) ||
            u.last_name.toLowerCase().includes(query) ||
            u.client?.name?.toLowerCase().includes(query)
        );
      }
      if (params.role && params.role !== 'ALL') {
        list = list.filter((u) => u.role === params.role);
      }
      if (params.status === 'active') {
        list = list.filter((u) => u.is_active);
      } else if (params.status === 'inactive') {
        list = list.filter((u) => !u.is_active);
      }
      return list;
    }
  },

  async createUser(data) {
    try {
      const response = await apiClient.post('/users/', data);
      return response.data;
    } catch {
      const list = getStoredUsers();
      const nextId = Math.max(...list.map((u) => u.id), 0) + 1;
      const newUser = {
        id: nextId,
        username: data.username,
        email: data.email,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        role: data.role || USER_ROLES.CLIENT,
        phone_number: data.phone_number || '',
        client: data.client || null,
        is_active: true,
        last_login: null,
        date_joined: new Date().toISOString(),
      };
      const updated = [newUser, ...list];
      saveStoredUsers(updated);
      return newUser;
    }
  },

  async updateUser(id, data) {
    try {
      const response = await apiClient.patch(`/users/${id}/`, data);
      return response.data;
    } catch {
      const list = getStoredUsers();
      const index = list.findIndex((u) => String(u.id) === String(id));
      if (index === -1) throw new Error('User not found');
      list[index] = { ...list[index], ...data };
      saveStoredUsers(list);
      return list[index];
    }
  },

  async toggleActive(id) {
    const list = getStoredUsers();
    const index = list.findIndex((u) => String(u.id) === String(id));
    if (index === -1) throw new Error('User not found');
    list[index].is_active = !list[index].is_active;
    saveStoredUsers(list);
    return list[index];
  },
};

export default userService;

