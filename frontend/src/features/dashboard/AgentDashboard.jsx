import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { PriorityBadge } from '../../components/feedback/PriorityBadge';
import { TICKET_STATUSES, TICKET_PRIORITIES, ROUTES } from '../../constants';

const agentAssignedTickets = [
  {
    id: 1,
    ticket_number: 'TCK-8821',
    subject: 'SSO Authentication latency during morning peak hours',
    client_name: 'Acme Global Corp',
    priority: TICKET_PRIORITIES.URGENT,
    status: TICKET_STATUSES.IN_PROGRESS,
    due_in: '1 hr 15 mins',
    is_urgent_warning: true,
  },
  {
    id: 5,
    ticket_number: 'TCK-8815',
    subject: 'Role permissions synchronization failure on client portal',
    client_name: 'Acme Global Corp',
    priority: TICKET_PRIORITIES.HIGH,
    status: TICKET_STATUSES.OPEN,
    due_in: '3 hrs 40 mins',
    is_urgent_warning: false,
  },
  {
    id: 4,
    ticket_number: 'TCK-8818',
    subject: 'Invoice PDF generation formatting glitch in billing portal',
    client_name: 'Cyberdyne Systems',
    priority: TICKET_PRIORITIES.LOW,
    status: TICKET_STATUSES.RESOLVED,
    due_in: 'Compliant',
    is_urgent_warning: false,
  },
];

export function AgentDashboard() {
  const columns = [
    {
      key: 'ticket_number',
      header: 'Ticket ID',
      render: (val, row) => (
        <Link
          to={ROUTES.TICKET_DETAIL(row.id)}
          className="font-mono text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          {val}
          {row.is_urgent_warning && (
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-rose-100" title="Approaching SLA Breach" />
          )}
        </Link>
      ),
    },
    {
      key: 'subject',
      header: 'Issue Subject & Tenant',
      render: (val, row) => (
        <div className="py-0.5 max-w-sm">
          <Link
            to={ROUTES.TICKET_DETAIL(row.id)}
            className="font-medium text-slate-900 hover:text-blue-600 text-xs leading-normal block truncate"
          >
            {val}
          </Link>
          <p className="text-xs text-slate-500 mt-0.5">{row.client_name}</p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (val) => <PriorityBadge priority={val} />,
    },
    {
      key: 'status',
      header: 'Lifecycle State',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'due_in',
      header: 'Resolution Target',
      render: (val, row) => (
        <div className="flex items-center space-x-1.5 font-mono text-xs">
          {row.is_urgent_warning ? (
            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md font-semibold">
              <Clock className="h-3 w-3 text-rose-500" />
              {val} left
            </span>
          ) : (
            <span className="text-slate-600">
              {val}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (_, row) => (
        <Link to={ROUTES.TICKET_DETAIL(row.id)}>
          <Button variant="ghost" size="sm" rightIcon={ArrowRight}>
            Open
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Specialist Triage Workbench
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized operational queue: focus on pending inquiries and time-critical SLA targets.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link to={ROUTES.TICKETS}>
            <Button variant="secondary" size="sm">
              All Tickets
            </Button>
          </Link>
          <Link to={ROUTES.KNOWLEDGE_BASE}>
            <Button variant="secondary" size="sm">
              Knowledge Base
            </Button>
          </Link>
        </div>
      </div>

      {/* SLA Breach Warning Callout (Active Triage Priority) */}
      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-rose-100 text-rose-600 shrink-0 mt-0.5">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                Imminent SLA Breach (Tier 1 Warning)
              </span>
              <span className="font-mono text-xs font-semibold text-rose-700 bg-rose-200/60 px-1.5 py-0.5 rounded">
                TCK-8821
              </span>
            </div>
            <p className="text-xs text-rose-800 mt-0.5">
              SSO Authentication latency for <strong>Acme Global Corp</strong> requires resolution in <strong>1 hr 15 mins</strong> to prevent a SLA contract breach.
            </p>
          </div>
        </div>

        <Link to={ROUTES.TICKET_DETAIL(1)}>
          <Button variant="danger" size="sm" rightIcon={ArrowRight}>
            Claim & Respond
          </Button>
        </Link>
      </div>

      {/* Specialist Capacity & Pipeline Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">My Assigned Tickets</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">7</span>
            <span className="text-xs font-medium text-slate-500">2 in progress</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: '70%' }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Urgent SLA Attention</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-rose-600">2</span>
            <span className="text-xs font-medium text-rose-600">under 4h left</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: '40%' }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Awaiting Customer</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">4</span>
            <span className="text-xs font-medium text-slate-500">pending replies</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: '50%' }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Resolved This Week</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">19</span>
            <span className="text-xs font-medium text-emerald-600">100% CSAT</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '95%' }} />
          </div>
        </div>
      </div>

      {/* Assigned Tickets List */}
      <Card
        title="Active Ticket Execution Queue"
        subtitle="Ordered by imminent SLA resolution deadline"
        padding={false}
      >
        <Table columns={columns} data={agentAssignedTickets} />
      </Card>
    </div>
  );
}

export default AgentDashboard;

