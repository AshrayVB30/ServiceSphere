import apiClient from './api';
import { ENDPOINTS } from './endpoints';

const STORAGE_KEY = 'servicesphere_mock_clients';

const INITIAL_CLIENTS = [
  {
    id: 1,
    name: 'Acme Global Corp',
    domain: 'acmeglobal.com',
    contact_email: 'support@acmeglobal.com',
    contact_phone: '+1 (555) 019-2831',
    tier: 'ENTERPRISE',
    is_active: true,
    active_tickets_count: 5,
    users_count: 42,
    created_at: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 2,
    name: 'Stark Industries',
    domain: 'starkindustries.com',
    contact_email: 'ops@starkindustries.com',
    contact_phone: '+1 (555) 892-1092',
    tier: 'ENTERPRISE',
    is_active: true,
    active_tickets_count: 3,
    users_count: 28,
    created_at: '2026-02-01T09:30:00.000Z',
  },
  {
    id: 3,
    name: 'Wayne Enterprises',
    domain: 'wayneenterprises.com',
    contact_email: 'admin@wayneenterprises.com',
    contact_phone: '+1 (555) 431-9082',
    tier: 'PREMIUM',
    is_active: true,
    active_tickets_count: 1,
    users_count: 15,
    created_at: '2026-02-20T14:15:00.000Z',
  },
  {
    id: 4,
    name: 'Cyberdyne Systems',
    domain: 'cyberdyne.io',
    contact_email: 'security@cyberdyne.io',
    contact_phone: '+1 (555) 762-3401',
    tier: 'STANDARD',
    is_active: false,
    active_tickets_count: 0,
    users_count: 6,
    created_at: '2026-03-10T11:45:00.000Z',
  },
];

function getStoredClients() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CLIENTS));
  return INITIAL_CLIENTS;
}

function saveStoredClients(clients) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  } catch {
    // ignore
  }
}

export const clientService = {
  async getClients(params = {}) {
    try {
      const response = await apiClient.get(ENDPOINTS.CLIENTS.LIST, { params });
      return response.data.results || response.data;
    } catch {
      let list = [...getStoredClients()];
      if (params.search) {
        const query = params.search.toLowerCase();
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.domain.toLowerCase().includes(query) ||
            c.contact_email.toLowerCase().includes(query)
        );
      }
      if (params.status === 'active') {
        list = list.filter((c) => c.is_active);
      } else if (params.status === 'inactive') {
        list = list.filter((c) => !c.is_active);
      }
      return list;
    }
  },

  async getClient(id) {
    try {
      const response = await apiClient.get(ENDPOINTS.CLIENTS.DETAIL(id));
      return response.data;
    } catch {
      const list = getStoredClients();
      const item = list.find((c) => String(c.id) === String(id));
      if (!item) throw new Error('Client organization not found');
      return item;
    }
  },

  async createClient(data) {
    try {
      const response = await apiClient.post(ENDPOINTS.CLIENTS.LIST, data);
      return response.data;
    } catch {
      const list = getStoredClients();
      const nextId = Math.max(...list.map((c) => c.id), 0) + 1;
      const newClient = {
        id: nextId,
        name: data.name,
        domain: data.domain,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone || '',
        tier: data.tier || 'STANDARD',
        is_active: true,
        active_tickets_count: 0,
        users_count: 1,
        created_at: new Date().toISOString(),
      };
      const updated = [newClient, ...list];
      saveStoredClients(updated);
      return newClient;
    }
  },

  async updateClient(id, data) {
    try {
      const response = await apiClient.patch(ENDPOINTS.CLIENTS.DETAIL(id), data);
      return response.data;
    } catch {
      const list = getStoredClients();
      const index = list.findIndex((c) => String(c.id) === String(id));
      if (index === -1) throw new Error('Client organization not found');
      list[index] = { ...list[index], ...data, updated_at: new Date().toISOString() };
      saveStoredClients(list);
      return list[index];
    }
  },

  async toggleActive(id) {
    const list = getStoredClients();
    const index = list.findIndex((c) => String(c.id) === String(id));
    if (index === -1) throw new Error('Client organization not found');
    list[index].is_active = !list[index].is_active;
    saveStoredClients(list);
    return list[index];
  },
};

export default clientService;

