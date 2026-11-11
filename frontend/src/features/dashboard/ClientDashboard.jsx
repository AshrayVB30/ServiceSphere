import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Clock, CheckCircle2, Ticket, ArrowRight, ShieldCheck, AlertCircle, RotateCw } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { PriorityBadge } from '../../components/feedback/PriorityBadge';
import { TICKET_STATUSES, ROUTES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { ticketService } from '../../services/ticketService';

/**
 * Client Portal Dashboard Component
 * Displays the client tenant's submitted support inquiries, active stages,
 * clarification alerts, and resolution metrics retrieved from the Django API.
 */
export function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClientTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend automatically filters to client=request.user.client
      const data = await ticketService.getTickets();
      const ticketList = Array.isArray(data) ? data : data?.results || [];
      setTickets(ticketList);
    } catch (err) {
      setError(err.message || 'Failed to retrieve your organization tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientTickets();
  }, [fetchClientTickets]);

  // Derived real metrics
  const activeTickets = tickets.filter((t) =>
    [TICKET_STATUSES.OPEN, TICKET_STATUSES.IN_PROGRESS].includes(t.status)
  ).length;

  const awaitingClientCount = tickets.filter(
    (t) => t.status === TICKET_STATUSES.AWAITING_CUSTOMER
  ).length;

  const resolvedTickets = tickets.filter((t) =>
    [TICKET_STATUSES.RESOLVED, TICKET_STATUSES.CLOSED].includes(t.status)
  ).length;

  const organizationName = user?.client?.name || user?.client_name || 'Organization Portal';

  const columns = [
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
      key: 'updated_at',
      header: 'Latest Activity',
      align: 'right',
      render: (val, row) => {
        const timestamp = val || row.created_at;
        const formatted = timestamp ? new Date(timestamp).toLocaleDateString() : 'Recent';
        return <span className="text-xs text-slate-500 font-medium">{formatted}</span>;
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 space-y-3">
        <div className="flex items-center space-x-2 font-semibold text-sm">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>Client Portal Data Unavailable</span>
        </div>
        <p className="text-xs text-rose-700">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchClientTickets} leftIcon={RotateCw}>
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enterprise Service Desk Command Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              {organizationName}
            </span>
            <span className="text-xs text-slate-500 font-mono">Enterprise Service Desk</span>
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
            <span className="text-2xl font-bold tracking-tight text-slate-900">{activeTickets}</span>
            <span className="text-xs text-slate-500">tickets in progress</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            All tickets currently within guaranteed SLA response time.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Awaiting Client Clarification</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600">{awaitingClientCount}</span>
            <span className="text-xs text-slate-500">actions pending</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            {awaitingClientCount > 0
              ? 'Our specialists have requested information on your ticket.'
              : 'No diagnostic logs or feedback required from your team.'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Resolved Inquiries</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{resolvedTickets}</span>
            <span className="text-xs text-slate-500">cases completed</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Closed issues remain accessible for historical audit.
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
        {tickets.length === 0 ? (
          <EmptyState
            title="No Inquiries Filed"
            description="You have not created any tickets yet. Click 'Create Ticket' above to reach our support team."
          />
        ) : (
          <Table columns={columns} data={tickets} />
        )}
      </Card>
    </div>
  );
}

export default ClientDashboard;
