import apiClient from './api';
import { ENDPOINTS } from './endpoints';
import { APPROVAL_STATUSES } from '../constants';

const STORAGE_KEY = 'servicesphere_mock_approvals';

const INITIAL_APPROVALS = [
  {
    id: 1,
    ticket_id: 1,
    ticket_number: 'TCK-8821',
    ticket_subject: 'SSO Authentication latency during morning peak hours',
    requested_by: { id: 2, username: 'sarah_agent', first_name: 'Sarah', last_name: 'Connor' },
    approver: { id: 4, username: 'elena_approver', first_name: 'Elena', last_name: 'Rostova' },
    reason: 'Temporary cloud compute cluster auto-scaling override authorization required to absorb authentication peak loads.',
    status: APPROVAL_STATUSES.PENDING,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    records: [
      {
        id: 1,
        action: 'SUBMITTED',
        performed_by: 'Sarah Connor',
        comment: 'Request submitted for emergency scaling approval.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ],
  },
  {
    id: 2,
    ticket_id: 3,
    ticket_number: 'TCK-8819',
    ticket_subject: 'Database read replica synchronization delay',
    requested_by: { id: 1, username: 'alex_admin', first_name: 'Alex', last_name: 'Vance' },
    approver: { id: 4, username: 'elena_approver', first_name: 'Elena', last_name: 'Rostova' },
    reason: 'Authorize production database maintenance downtime window for replication re-indexing during weekend off-hours.',
    status: APPROVAL_STATUSES.INFO_REQUESTED,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    records: [
      {
        id: 2,
        action: 'SUBMITTED',
        performed_by: 'Alex Vance',
        comment: 'Initial downtime request.',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: 3,
        action: 'INFO_REQUESTED',
        performed_by: 'Elena Rostova',
        comment: 'Please specify the exact backup and rollback contingency plan if indexing exceeds the 2-hour window.',
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
    ],
  },
  {
    id: 3,
    ticket_id: 4,
    ticket_number: 'TCK-8818',
    ticket_subject: 'Invoice PDF generation formatting glitch in billing portal',
    requested_by: { id: 2, username: 'sarah_agent', first_name: 'Sarah', last_name: 'Connor' },
    approver: { id: 1, username: 'alex_admin', first_name: 'Alex', last_name: 'Vance' },
    reason: 'Apply $250 courtesy credit adjustment to client account due to reporting delay.',
    status: APPROVAL_STATUSES.APPROVED,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    records: [
      {
        id: 4,
        action: 'SUBMITTED',
        performed_by: 'Sarah Connor',
        comment: 'Credit request submitted.',
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
      },
      {
        id: 5,
        action: 'APPROVED',
        performed_by: 'Alex Vance',
        comment: 'Authorized as courtesy under enterprise SLA terms.',
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
      },
    ],
  },
];

function getStoredApprovals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_APPROVALS));
  return INITIAL_APPROVALS;
}

function saveStoredApprovals(approvals) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(approvals));
  } catch {
    // ignore
  }
}

export const approvalService = {
  async getApprovals(params = {}) {
    try {
      const response = await apiClient.get(ENDPOINTS.APPROVALS.LIST, { params });
      return response.data.results || response.data;
    } catch {
      let list = [...getStoredApprovals()];
      if (params.status && params.status !== 'ALL') {
        list = list.filter((a) => a.status === params.status);
      }
      return list;
    }
  },

  async getApproval(id) {
    try {
      const response = await apiClient.get(ENDPOINTS.APPROVALS.DETAIL(id));
      return response.data;
    } catch {
      const list = getStoredApprovals();
      const item = list.find((a) => String(a.id) === String(id));
      if (!item) throw new Error('Approval request not found');
      return item;
    }
  },

  async approve(id, comment = '', user) {
    try {
      const response = await apiClient.post(ENDPOINTS.APPROVALS.APPROVE(id), { comment });
      return response.data;
    } catch {
      const list = getStoredApprovals();
      const index = list.findIndex((a) => String(a.id) === String(id));
      if (index === -1) throw new Error('Approval request not found');

      list[index].status = APPROVAL_STATUSES.APPROVED;
      list[index].updated_at = new Date().toISOString();
      list[index].records.push({
        id: Date.now(),
        action: 'APPROVED',
        performed_by: user ? `${user.first_name} ${user.last_name || ''}` : 'Approver',
        comment: comment || 'Approved without comment.',
        timestamp: new Date().toISOString(),
      });

      saveStoredApprovals(list);
      return list[index];
    }
  },

  async reject(id, comment = '', user) {
    try {
      const response = await apiClient.post(ENDPOINTS.APPROVALS.REJECT(id), { comment });
      return response.data;
    } catch {
      const list = getStoredApprovals();
      const index = list.findIndex((a) => String(a.id) === String(id));
      if (index === -1) throw new Error('Approval request not found');

      list[index].status = APPROVAL_STATUSES.REJECTED;
      list[index].updated_at = new Date().toISOString();
      list[index].records.push({
        id: Date.now(),
        action: 'REJECTED',
        performed_by: user ? `${user.first_name} ${user.last_name || ''}` : 'Approver',
        comment: comment || 'Rejected without comment.',
        timestamp: new Date().toISOString(),
      });

      saveStoredApprovals(list);
      return list[index];
    }
  },

  async requestInfo(id, comment, user) {
    try {
      const response = await apiClient.post(ENDPOINTS.APPROVALS.REQUEST_INFO(id), { comment });
      return response.data;
    } catch {
      const list = getStoredApprovals();
      const index = list.findIndex((a) => String(a.id) === String(id));
      if (index === -1) throw new Error('Approval request not found');

      list[index].status = APPROVAL_STATUSES.INFO_REQUESTED;
      list[index].updated_at = new Date().toISOString();
      list[index].records.push({
        id: Date.now(),
        action: 'INFO_REQUESTED',
        performed_by: user ? `${user.first_name} ${user.last_name || ''}` : 'Approver',
        comment,
        timestamp: new Date().toISOString(),
      });

      saveStoredApprovals(list);
      return list[index];
    }
  },

  async resubmit(id, { reason, comment }, user) {
    try {
      const response = await apiClient.post(ENDPOINTS.APPROVALS.RESUBMIT(id), { reason, comment });
      return response.data;
    } catch {
      const list = getStoredApprovals();
      const index = list.findIndex((a) => String(a.id) === String(id));
      if (index === -1) throw new Error('Approval request not found');

      list[index].status = APPROVAL_STATUSES.PENDING;
      if (reason) list[index].reason = reason;
      list[index].updated_at = new Date().toISOString();
      list[index].records.push({
        id: Date.now(),
        action: 'RESUBMITTED',
        performed_by: user ? `${user.first_name} ${user.last_name || ''}` : 'Requester',
        comment: comment || 'Clarification provided and request resubmitted.',
        timestamp: new Date().toISOString(),
      });

      saveStoredApprovals(list);
      return list[index];
    }
  },
};

export default approvalService;

