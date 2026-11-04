import apiClient from './api';
import { ENDPOINTS } from './endpoints';
import { TICKET_PRIORITIES } from '../constants';

const STORAGE_KEY_POLICIES = 'servicesphere_mock_sla_policies';

const INITIAL_POLICIES = [
  {
    id: 1,
    name: 'Mission Critical Outage Policy',
    priority: TICKET_PRIORITIES.URGENT,
    response_time_hours: '1.00',
    resolution_time_hours: '4.00',
    is_active: true,
    description: 'Zero-tolerance policy for production outages and severe client downtime.',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'High Impact Service Policy',
    priority: TICKET_PRIORITIES.HIGH,
    response_time_hours: '2.00',
    resolution_time_hours: '8.00',
    is_active: true,
    description: 'Applies to degraded system performance and core feature impairments.',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    name: 'Standard Operational SLA',
    priority: TICKET_PRIORITIES.MEDIUM,
    response_time_hours: '4.00',
    resolution_time_hours: '24.00',
    is_active: true,
    description: 'Standard support requests, configuration inquiries, and minor issues.',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 4,
    name: 'Low Urgency SLA',
    priority: TICKET_PRIORITIES.LOW,
    response_time_hours: '8.00',
    resolution_time_hours: '48.00',
    is_active: true,
    description: 'General informational requests and cosmetic enhancements.',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const INITIAL_ESCALATIONS = [
  {
    id: 1,
    ticket_id: 1,
    ticket_number: 'TCK-8821',
    subject: 'SSO Authentication latency during morning peak hours',
    client_name: 'Acme Global Corp',
    priority: TICKET_PRIORITIES.URGENT,
    tier: 1,
    reason: 'First response target 75% elapsed without public agent response',
    escalated_to: 'Sarah Connor & On-call Lead',
    status: 'TRIGGERED',
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 2,
    ticket_id: 3,
    ticket_number: 'TCK-8819',
    subject: 'Database read replica synchronization delay',
    client_name: 'Wayne Enterprises',
    priority: TICKET_PRIORITIES.HIGH,
    tier: 2,
    reason: 'Resolution target threshold warning',
    escalated_to: 'DevOps Tier 2 Escalation',
    status: 'ACKNOWLEDGED',
    created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
];

function getStoredPolicies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POLICIES);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEY_POLICIES, JSON.stringify(INITIAL_POLICIES));
  return INITIAL_POLICIES;
}

function saveStoredPolicies(policies) {
  try {
    localStorage.setItem(STORAGE_KEY_POLICIES, JSON.stringify(policies));
  } catch {
    // ignore
  }
}

export const slaService = {
  async getPolicies() {
    try {
      const response = await apiClient.get(ENDPOINTS.SLA.POLICIES);
      return response.data.results || response.data;
    } catch {
      return getStoredPolicies();
    }
  },

  async updatePolicy(id, data) {
    try {
      const response = await apiClient.patch(ENDPOINTS.SLA.POLICY_DETAIL(id), data);
      return response.data;
    } catch {
      const list = getStoredPolicies();
      const index = list.findIndex((p) => String(p.id) === String(id));
      if (index === -1) throw new Error('Policy not found');
      list[index] = { ...list[index], ...data };
      saveStoredPolicies(list);
      return list[index];
    }
  },

  async createPolicy(data) {
    try {
      const response = await apiClient.post(ENDPOINTS.SLA.POLICIES, data);
      return response.data;
    } catch {
      const list = getStoredPolicies();
      const nextId = Math.max(...list.map((p) => p.id), 0) + 1;
      const newPolicy = {
        id: nextId,
        ...data,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      const updated = [...list, newPolicy];
      saveStoredPolicies(updated);
      return newPolicy;
    }
  },

  async getEscalations() {
    try {
      const response = await apiClient.get(ENDPOINTS.SLA.ESCALATIONS);
      return response.data.results || response.data;
    } catch {
      return INITIAL_ESCALATIONS;
    }
  },
};

export default slaService;
