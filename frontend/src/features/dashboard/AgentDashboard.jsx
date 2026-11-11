import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  ArrowRight,
  Flame,
  CheckCircle2,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { PriorityBadge } from '../../components/feedback/PriorityBadge';
import { ticketService } from '../../services/ticketService';
import { TICKET_STATUSES, TICKET_PRIORITIES, ROUTES } from '../../constants';

/**
 * Format timestamp into human readable relative duration or formatted date.
 * @param {string} dateStr - ISO date string.
 * @returns {string} Human formatted string.
 */
function formatTimeRemaining(dateStr, priority) {
  if (!dateStr) {
    if (priority === 'URGENT') return '4 hours SLA';
    if (priority === 'HIGH') return '8 hours SLA';
    return '24 hours SLA';
  }
  const created = new Date(dateStr);
  const now = new Date();
  const diffHours = (now - created) / (1000 * 60 * 60);

  // Target window based on standard SLA: Urgent=4h, High=8h, Medium=24h, Low=48h
  const targetMap = { URGENT: 4, HIGH: 8, MEDIUM: 24, LOW: 48 };
  const target = targetMap[priority] || 24;
  const remaining = Math.max(0, target - diffHours);

  if (remaining <= 0) return 'Overdue';
  if (remaining < 1) return `${Math.round(remaining * 60)} mins left`;
  return `${Math.round(remaining)} hrs left`;
}

/**
 * Support Agent Workbench Dashboard Component
 * Displays the agent's personalized ticket assignment queue, imminent SLA deadlines,
 * and active triage capacity metrics retrieved from the Django REST API.
 */
export function AgentDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAgentWorkload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend TicketViewSet.get_queryset() automatically filters to assigned_to=request.user
      const data = await ticketService.getTickets();
      const ticketList = Array.isArray(data) ? data : data?.results || [];
      setTickets(ticketList);
    } catch (err) {
      setError(err.message || 'Failed to load assigned ticket workload.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgentWorkload();
  }, [fetchAgentWorkload]);

  // Derived metrics from real assigned tickets
  const totalAssigned = tickets.length;
  const inProgressCount = tickets.filter((t) => t.status === TICKET_STATUSES.IN_PROGRESS).length;
  const urgentCount = tickets.filter(
    (t) =>
      (t.priority === TICKET_PRIORITIES.URGENT || t.priority === TICKET_PRIORITIES.HIGH) &&
      t.status !== TICKET_STATUSES.RESOLVED &&
      t.status !== TICKET_STATUSES.CLOSED
  ).length;
  const awaitingCustomerCount = tickets.filter(
    (t) => t.status === TICKET_STATUSES.AWAITING_CUSTOMER
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === TICKET_STATUSES.RESOLVED || t.status === TICKET_STATUSES.CLOSED
  ).length;

  // Find most critical urgent ticket approaching breach
  const topCriticalTicket = tickets.find(
    (t) =>
      t.priority === TICKET_PRIORITIES.URGENT &&
      t.status !== TICKET_STATUSES.RESOLVED &&
      t.status !== TICKET_STATUSES.CLOSED
  ) || tickets.find(
    (t) =>
      t.priority === TICKET_PRIORITIES.HIGH &&
      t.status !== TICKET_STATUSES.RESOLVED &&
      t.status !== TICKET_STATUSES.CLOSED
  );

  const columns = [
    {
      key: 'ticket_number',
      header: 'Ticket ID',
      render: (val, row) => {
        const isUrgent =
          row.priority === TICKET_PRIORITIES.URGENT &&
          row.status !== TICKET_STATUSES.RESOLVED &&
          row.status !== TICKET_STATUSES.CLOSED;
        return (
          <Link
            to={ROUTES.TICKET_DETAIL(row.id)}
            className="font-mono text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1.5"
          >
            {val}
            {isUrgent && (
              <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-rose-100 animate-pulse" title="High / Urgent Priority" />
            )}
          </Link>
        );
      },
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
          <p className="text-xs text-slate-500 mt-0.5">{row.client_name || row.client?.name || 'General Inquiry'}</p>
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
      key: 'created_at',
      header: 'Resolution Target',
      render: (val, row) => {
        const isClosed = row.status === TICKET_STATUSES.RESOLVED || row.status === TICKET_STATUSES.CLOSED;
        if (isClosed) {
          return (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md text-xs font-medium">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Completed
            </span>
          );
        }
        const remainingStr = formatTimeRemaining(val, row.priority);
        const isWarning = row.priority === TICKET_PRIORITIES.URGENT || remainingStr.includes('left') || remainingStr === 'Overdue';
        return (
          <div className="flex items-center space-x-1.5 font-mono text-xs">
            {isWarning ? (
              <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md font-semibold">
                <Clock className="h-3 w-3 text-rose-500" />
                {remainingStr}
              </span>
            ) : (
              <span className="text-slate-600">{remainingStr}</span>
            )}
          </div>
        );
      },
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 space-y-3">
        <div className="flex items-center space-x-2 font-semibold text-sm">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>Specialist Workbench Unavailable</span>
        </div>
        <p className="text-xs text-rose-700">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchAgentWorkload} leftIcon={RotateCw}>
          Retry Connection
        </Button>
      </div>
    );
  }

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

      {/* SLA Breach Warning Callout or All Clear */}
      {topCriticalTicket ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600 shrink-0 mt-0.5">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                  Critical SLA Attention Required
                </span>
                <span className="font-mono text-xs font-semibold text-rose-700 bg-rose-200/60 px-1.5 py-0.5 rounded">
                  {topCriticalTicket.ticket_number}
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                {topCriticalTicket.subject} — Priority <strong>{topCriticalTicket.priority}</strong> requires immediate specialist action.
              </p>
            </div>
          </div>

          <Link to={ROUTES.TICKET_DETAIL(topCriticalTicket.id)}>
            <Button variant="danger" size="sm" rightIcon={ArrowRight}>
              Claim & Respond
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center space-x-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>All assigned tickets are currently within guaranteed SLA response time thresholds.</span>
          </div>
          <span className="text-xs font-medium text-emerald-700 font-mono">100% On-Target</span>
        </div>
      )}

      {/* Specialist Capacity & Pipeline Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">My Assigned Tickets</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{totalAssigned}</span>
            <span className="text-xs font-medium text-slate-500">{inProgressCount} in progress</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${Math.min(totalAssigned > 0 ? (inProgressCount / totalAssigned) * 100 : 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Urgent SLA Attention</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-rose-600">{urgentCount}</span>
            <span className="text-xs font-medium text-rose-600">high priority</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full"
              style={{ width: `${Math.min(totalAssigned > 0 ? (urgentCount / totalAssigned) * 100 : 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Awaiting Customer</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{awaitingCustomerCount}</span>
            <span className="text-xs font-medium text-slate-500">pending client</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${Math.min(totalAssigned > 0 ? (awaitingCustomerCount / totalAssigned) * 100 : 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Resolved Cases</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">{resolvedCount}</span>
            <span className="text-xs font-medium text-emerald-600">cleared</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(totalAssigned > 0 ? (resolvedCount / totalAssigned) * 100 : 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Assigned Tickets List */}
      <Card
        title="Active Ticket Execution Queue"
        subtitle="Ordered by assignment priority and operational urgency"
        padding={false}
      >
        {tickets.length === 0 ? (
          <EmptyState
            title="No Assigned Tickets"
            description="Your personal triage queue is completely cleared. New tickets will appear here once assigned."
          />
        ) : (
          <Table columns={columns} data={tickets} />
        )}
      </Card>
    </div>
  );
}

export default AgentDashboard;
