import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Clock, CheckCircle2, Ticket, ArrowRight, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { PriorityBadge } from '../../components/feedback/PriorityBadge';
import { TICKET_STATUSES, TICKET_PRIORITIES, ROUTES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

const clientTickets = [
  {
    id: 1,
    ticket_number: 'TCK-8821',
    subject: 'SSO Authentication latency during morning peak hours',
    status: TICKET_STATUSES.IN_PROGRESS,
    priority: TICKET_PRIORITIES.URGENT,
    last_update: '15 mins ago by Sarah Connor',
  },
  {
    id: 5,
    ticket_number: 'TCK-8815',
    subject: 'Role permissions synchronization failure on client portal',
    status: TICKET_STATUSES.OPEN,
    priority: TICKET_PRIORITIES.HIGH,
    last_update: '1 hour ago',
  },
];

export function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Enterprise Service Desk Command Header (Replaces AI Gradient Hero) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              {user?.client?.name || 'Acme Global Corp'}
            </span>
            <span className="text-xs text-slate-500 font-mono">Enterprise 24/7 SLA</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Client Support & Service Operations
          </h1>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Track active service inquiries, review real-time incident resolution stages, or file a technical ticket with our dedicated enterprise engineering team.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="primary"
            size="md"
            leftIcon={Plus}
            onClick={() => navigate(ROUTES.TICKET_CREATE)}
          >
            Create Ticket
          </Button>
          <Button
            variant="secondary"
            size="md"
            leftIcon={BookOpen}
            onClick={() => navigate(ROUTES.KNOWLEDGE_BASE)}
          >
            Documentation
          </Button>
        </div>
      </div>

      {/* Account Request Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Support Requests</span>
            <Ticket className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">2</span>
            <span className="text-xs text-slate-500">tickets in progress</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            All tickets currently within guaranteed SLA response time.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Awaiting Client Clarification</span>
            <Clock className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">0</span>
            <span className="text-xs text-slate-500">actions pending</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            No questions or diagnostic logs needed from your team.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Resolved This Month</span>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">11</span>
            <span className="text-xs text-slate-500">cases completed</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Mean resolution turnaround: <strong className="text-slate-800">2.8 hours</strong>.
          </p>
        </div>
      </div>

      {/* Client Tickets Table */}
      <Card
        title="Active Support Inquiries"
        subtitle="Real-time status updates on tickets filed under your organization account"
        padding={false}
        headerAction={
          <Link
            to={ROUTES.TICKETS}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View Complete History <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <Table
          columns={[
            {
              key: 'ticket_number',
              header: 'Ticket ID',
              render: (val, row) => (
                <Link
                  to={ROUTES.TICKET_DETAIL(row.id)}
                  className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                >
                  {val}
                </Link>
              ),
            },
            {
              key: 'subject',
              header: 'Issue Subject',
              render: (val, row) => (
                <Link
                  to={ROUTES.TICKET_DETAIL(row.id)}
                  className="font-medium text-slate-900 hover:text-blue-600 text-xs leading-normal block truncate max-w-md"
                >
                  {val}
                </Link>
              ),
            },
            {
              key: 'priority',
              header: 'Urgency Tier',
              render: (val) => <PriorityBadge priority={val} />,
            },
            {
              key: 'status',
              header: 'Status Stage',
              render: (val) => <StatusBadge status={val} />,
            },
            {
              key: 'last_update',
              header: 'Latest Activity',
              align: 'right',
              render: (val) => <span className="text-xs text-slate-500 font-medium">{val}</span>,
            },
          ]}
          data={clientTickets}
        />
      </Card>
    </div>
  );
}

export default ClientDashboard;

