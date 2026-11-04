import apiClient from './api';
import { ENDPOINTS } from './endpoints';
import { TICKET_STATUSES, TICKET_PRIORITIES } from '../constants';

/**
 * ServiceSphere Ticket Management Service
 * Integrates with Django REST APIs with resilient local storage fallback for interactive UI testing.
 */

const STORAGE_KEY = 'servicesphere_mock_tickets';

// Initial realistic dataset for development & preview
const INITIAL_TICKETS = [
  {
    id: 1,
    ticket_number: 'TCK-8821',
    uuid: '550e8400-e29b-41d4-a716-446655440001',
    subject: 'SSO Authentication latency during morning peak hours',
    description:
      'Several users at Acme Global Corp reported timeouts when authenticating via the Okta SAML integration between 08:30 and 09:15 AM EST. Average login duration spiked to 14.2 seconds.',
    category: 'Technical Support',
    priority: TICKET_PRIORITIES.URGENT,
    status: TICKET_STATUSES.IN_PROGRESS,
    client: { id: 1, name: 'Acme Global Corp' },
    created_by: { id: 3, username: 'john_client', first_name: 'John', last_name: 'Doe' },
    assigned_to: { id: 2, username: 'sarah_agent', first_name: 'Sarah', last_name: 'Connor' },
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    resolved_at: null,
    sla: {
      policy_name: 'Enterprise Mission Critical',
      response_deadline: new Date(Date.now() + 3600000 * 1).toISOString(),
      resolution_deadline: new Date(Date.now() + 3600000 * 6).toISOString(),
      status: 'ACTIVE',
      is_breached: false,
    },
    comments: [
      {
        id: 101,
        author: { id: 3, username: 'john_client', first_name: 'John', last_name: 'Doe' },
        comment: 'Attaching HAR capture file for reproduction during the 9 AM spike.',
        is_internal: false,
        created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      },
      {
        id: 102,
        author: { id: 2, username: 'sarah_agent', first_name: 'Sarah', last_name: 'Connor' },
        comment: 'HAR received. Investigating Redis session cluster latency in US-East-1.',
        is_internal: false,
        created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
      {
        id: 103,
        author: { id: 2, username: 'sarah_agent', first_name: 'Sarah', last_name: 'Connor' },
        comment: 'Internal Note: DevOps restarted connection pool at 09:40. Monitoring connection metrics.',
        is_internal: true,
        created_at: new Date(Date.now() - 3600000 * 1.2).toISOString(),
      },
    ],
    history: [
      {
        id: 201,
        action: 'CREATED',
        details: 'Ticket opened by John Doe',
        performed_by: 'John Doe',
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: 202,
        action: 'ASSIGNED',
        details: 'Assigned to Sarah Connor',
        performed_by: 'System SLA Router',
        created_at: new Date(Date.now() - 3600000 * 2.8).toISOString(),
      },
      {
        id: 203,
        action: 'STATUS_CHANGED',
        details: 'Status transitioned from OPEN to IN_PROGRESS',
        performed_by: 'Sarah Connor',
        created_at: new Date(Date.now() - 3600000 * 1.8).toISOString(),
      },
    ],
  },
  {
    id: 2,
    ticket_number: 'TCK-8820',
    uuid: '550e8400-e29b-41d4-a716-446655440002',
    subject: 'Request for secondary API webhook endpoint provisioning',
    description:
      'We are deploying our ERP connector and require a secondary webhook delivery URL configured for billing event notifications with HMAC secret verification.',
    category: 'Feature Request',
    priority: TICKET_PRIORITIES.MEDIUM,
    status: TICKET_STATUSES.OPEN,
    client: { id: 2, name: 'Stark Industries' },
    created_by: { id: 5, username: 'tony_dev', first_name: 'Tony', last_name: 'Stark' },
    assigned_to: null,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    resolved_at: null,
    sla: {
      policy_name: 'Standard SLA',
      response_deadline: new Date(Date.now() + 3600000 * 4).toISOString(),
      resolution_deadline: new Date(Date.now() + 3600000 * 24).toISOString(),
      status: 'ACTIVE',
      is_breached: false,
    },
    comments: [],
    history: [
      {
        id: 204,
        action: 'CREATED',
        details: 'Ticket opened by Tony Stark',
        performed_by: 'Tony Stark',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ],
  },
  {
    id: 3,
    ticket_number: 'TCK-8819',
    subject: 'Database read replica synchronization delay',
    description:
      'Reporting queries on analytics endpoints return stale data approximately 45 minutes behind transaction write records. Please inspect the streaming replication replication slot.',
    category: 'Bug',
    priority: TICKET_PRIORITIES.HIGH,
    status: TICKET_STATUSES.AWAITING_CUSTOMER,
    client: { id: 3, name: 'Wayne Enterprises' },
    created_by: { id: 6, username: 'bruce_client', first_name: 'Bruce', last_name: 'Wayne' },
    assigned_to: { id: 1, username: 'alex_admin', first_name: 'Alex', last_name: 'Vance' },
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    resolved_at: null,
    sla: {
      policy_name: 'High Priority SLA',
      response_deadline: new Date(Date.now() - 3600000 * 18).toISOString(),
      resolution_deadline: new Date(Date.now() + 3600000 * 8).toISOString(),
      status: 'ACTIVE',
      is_breached: false,
    },
    comments: [
      {
        id: 104,
        author: { id: 1, username: 'alex_admin', first_name: 'Alex', last_name: 'Vance' },
        comment: 'Replication lag dropped to 200ms. Could you verify if query results on your analytics dashboard are now current?',
        is_internal: false,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ],
    history: [],
  },
  {
    id: 4,
    ticket_number: 'TCK-8818',
    subject: 'Invoice PDF generation formatting glitch in billing portal',
    description:
      'The currency symbol displays corrupt Unicode characters when downloading November 2026 invoice PDFs in the client portal accounting tab.',
    category: 'Billing',
    priority: TICKET_PRIORITIES.LOW,
    status: TICKET_STATUSES.RESOLVED,
    client: { id: 4, name: 'Cyberdyne Systems' },
    created_by: { id: 7, username: 'miles_dyson', first_name: 'Miles', last_name: 'Dyson' },
    assigned_to: { id: 2, username: 'sarah_agent', first_name: 'Sarah', last_name: 'Connor' },
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    resolved_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    sla: {
      policy_name: 'Low Priority SLA',
      response_deadline: new Date(Date.now() - 3600000 * 44).toISOString(),
      resolution_deadline: new Date(Date.now() - 3600000 * 12).toISOString(),
      status: 'COMPLIANT',
      is_breached: false,
    },
    comments: [
      {
        id: 105,
        author: { id: 2, username: 'sarah_agent', first_name: 'Sarah', last_name: 'Connor' },
        comment: 'Font embedding configuration in PDF generator was patched and deployed. Verified across all European currency symbols.',
        is_internal: false,
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ],
    history: [],
  },
];

function getStoredTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TICKETS));
  return INITIAL_TICKETS;
}

function saveStoredTickets(tickets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch {
    // ignore
  }
}

export const ticketService = {
  /**
   * Fetches ticket listing with optional filters
   */
  async getTickets(params = {}) {
    try {
      const response = await apiClient.get(ENDPOINTS.TICKETS.LIST, { params });
      return response.data.results || response.data;
    } catch {
      // Local fallback
      let list = [...getStoredTickets()];

      if (params.status && params.status !== 'ALL') {
        list = list.filter((t) => t.status === params.status);
      }
      if (params.priority && params.priority !== 'ALL') {
        list = list.filter((t) => t.priority === params.priority);
      }
      if (params.category && params.category !== 'ALL') {
        list = list.filter((t) => t.category === params.category);
      }
      if (params.search) {
        const query = params.search.toLowerCase();
        list = list.filter(
          (t) =>
            t.subject.toLowerCase().includes(query) ||
            t.ticket_number.toLowerCase().includes(query) ||
            t.client?.name?.toLowerCase().includes(query)
        );
      }
      return list;
    }
  },

  /**
   * Fetches single ticket details by ID or ticket_number
   */
  async getTicket(id) {
    try {
      const response = await apiClient.get(ENDPOINTS.TICKETS.DETAIL(id));
      return response.data;
    } catch {
      const list = getStoredTickets();
      const item = list.find((t) => String(t.id) === String(id) || t.ticket_number === id);
      if (!item) throw new Error('Ticket not found');
      return item;
    }
  },

  /**
   * Creates a new support ticket
   */
  async createTicket(payload) {
    try {
      const response = await apiClient.post(ENDPOINTS.TICKETS.LIST, payload);
      return response.data;
    } catch {
      const list = getStoredTickets();
      const nextId = Math.max(...list.map((t) => t.id), 0) + 1;
      const newTicket = {
        id: nextId,
        ticket_number: `TCK-${8821 + nextId}`,
        uuid: `550e8400-e29b-41d4-a716-4466554400${nextId.toString().padStart(2, '0')}`,
        subject: payload.subject,
        description: payload.description,
        category: payload.category || 'General',
        priority: payload.priority || TICKET_PRIORITIES.MEDIUM,
        status: TICKET_STATUSES.OPEN,
        client: payload.client || { id: 1, name: 'Acme Global Corp' },
        created_by: payload.created_by || { id: 3, username: 'john_client', first_name: 'John', last_name: 'Doe' },
        assigned_to: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resolved_at: null,
        sla: {
          policy_name: `${payload.priority || 'Medium'} Policy SLA`,
          response_deadline: new Date(Date.now() + 3600000 * 4).toISOString(),
          resolution_deadline: new Date(Date.now() + 3600000 * 24).toISOString(),
          status: 'ACTIVE',
          is_breached: false,
        },
        comments: [],
        history: [
          {
            id: Date.now(),
            action: 'CREATED',
            details: 'Ticket opened',
            performed_by: payload.created_by?.username || 'Client User',
            created_at: new Date().toISOString(),
          },
        ],
      };

      const updated = [newTicket, ...list];
      saveStoredTickets(updated);
      return newTicket;
    }
  },

  /**
   * Updates ticket status (e.g., from OPEN -> IN_PROGRESS -> RESOLVED)
   */
  async changeStatus(id, newStatus) {
    try {
      const response = await apiClient.post(ENDPOINTS.TICKETS.CHANGE_STATUS(id), {
        status: newStatus,
      });
      return response.data;
    } catch {
      const list = getStoredTickets();
      const index = list.findIndex((t) => String(t.id) === String(id));
      if (index === -1) throw new Error('Ticket not found');

      const oldStatus = list[index].status;
      list[index].status = newStatus;
      list[index].updated_at = new Date().toISOString();
      if (newStatus === TICKET_STATUSES.RESOLVED) {
        list[index].resolved_at = new Date().toISOString();
      }

      list[index].history.unshift({
        id: Date.now(),
        action: 'STATUS_CHANGED',
        details: `Status updated from ${oldStatus} to ${newStatus}`,
        performed_by: 'Current User',
        created_at: new Date().toISOString(),
      });

      saveStoredTickets(list);
      return list[index];
    }
  },

  /**
   * Assigns ticket to an agent
   */
  async assignTicket(id, agent) {
    try {
      const response = await apiClient.post(ENDPOINTS.TICKETS.ASSIGN(id), {
        assigned_to: agent.id,
      });
      return response.data;
    } catch {
      const list = getStoredTickets();
      const index = list.findIndex((t) => String(t.id) === String(id));
      if (index === -1) throw new Error('Ticket not found');

      list[index].assigned_to = agent;
      list[index].updated_at = new Date().toISOString();

      list[index].history.unshift({
        id: Date.now(),
        action: 'ASSIGNED',
        details: `Assigned to ${agent ? agent.first_name + ' ' + agent.last_name : 'Unassigned'}`,
        performed_by: 'Current User',
        created_at: new Date().toISOString(),
      });

      saveStoredTickets(list);
      return list[index];
    }
  },

  /**
   * Adds comment or internal note to ticket
   */
  async addComment(id, { comment, is_internal = false, author }) {
    try {
      const response = await apiClient.post(ENDPOINTS.TICKETS.COMMENTS(id), {
        comment,
        is_internal,
      });
      return response.data;
    } catch {
      const list = getStoredTickets();
      const index = list.findIndex((t) => String(t.id) === String(id));
      if (index === -1) throw new Error('Ticket not found');

      const newComment = {
        id: Date.now(),
        author: author || { username: 'Current User', first_name: 'Current', last_name: 'User' },
        comment,
        is_internal,
        created_at: new Date().toISOString(),
      };

      list[index].comments.push(newComment);
      list[index].updated_at = new Date().toISOString();

      saveStoredTickets(list);
      return newComment;
    }
  },
};

export default ticketService;

