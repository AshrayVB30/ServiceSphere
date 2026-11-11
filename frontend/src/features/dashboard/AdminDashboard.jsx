import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  ShieldCheck,
  Activity,
  ArrowRight,
  RotateCw,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Card } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { PriorityBadge } from '../../components/feedback/PriorityBadge';
import { analyticsService } from '../../services/analyticsService';
import { ticketService } from '../../services/ticketService';
import { ROUTES } from '../../constants';

// Priority bar colors
const PRIORITY_COLORS = {
  LOW: '#64748B',
  MEDIUM: '#2563EB',
  HIGH: '#D97706',
  URGENT: '#DC2626',
};

/**
 * Format ISO date string into short readable date / weekday.
 * @param {string} dateStr - Date string (YYYY-MM-DD or ISO).
 * @returns {string} Short formatted date.
 */
function formatTrendDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
}

/**
 * Format created_at timestamp into relative or short readable date.
 * @param {string} dateStr - ISO timestamp.
 * @returns {string} Readable timestamp.
 */
function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

/**
 * System Administrator Dashboard Component
 * Displays real-time operational KPI metrics, intake/resolution trends,
 * priority distribution, and recent tickets stream from the Django backend.
 */
export function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, trendsRes, priorityRes, ticketsRes] = await Promise.all([
        analyticsService.getDashboardSummary(),
        analyticsService.getTicketTrends(),
        analyticsService.getTicketsByPriority(),
        ticketService.getTickets({ limit: 5 }),
      ]);

      setSummary(summaryRes);

      // Format timeline data for AreaChart
      const rawTimeline = trendsRes?.timeline || trendsRes || [];
      const formattedTimeline = rawTimeline.map((item) => ({
        day: formatTrendDate(item.date),
        created: item.created || 0,
        resolved: item.resolved || 0,
      }));
      setTrends(formattedTimeline);

      // Format priority data for BarChart
      const rawPriority = Array.isArray(priorityRes) ? priorityRes : priorityRes?.by_priority || [];
      const formattedPriority = rawPriority.map((p) => ({
        name: p.priority_display || p.priority,
        count: p.count || 0,
        fill: PRIORITY_COLORS[p.priority] || '#2563EB',
      }));
      setPriorityData(formattedPriority);

      // Slice recent tickets
      const ticketList = Array.isArray(ticketsRes) ? ticketsRes : ticketsRes?.results || [];
      setRecentTickets(ticketList.slice(0, 5));
    } catch (err) {
      setError(err.message || 'Failed to load operational analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
      header: 'Subject & Organization',
      render: (val, row) => (
        <div className="py-0.5 max-w-md">
          <Link
            to={ROUTES.TICKET_DETAIL(row.id)}
            className="font-medium text-slate-900 hover:text-blue-600 transition-colors block text-xs leading-normal truncate"
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
      header: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'assigned_to_username',
      header: 'Assigned Specialist',
      render: (val, row) => {
        const name = val || row.assigned_to?.username || 'Unassigned';
        const initial = name !== 'Unassigned' ? name[0] : '?';
        return (
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px] flex items-center justify-center uppercase">
              {initial}
            </div>
            <span className="text-xs text-slate-700 font-medium">{name}</span>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Logged',
      align: 'right',
      render: (val) => <span className="text-xs text-slate-500">{formatTimeAgo(val)}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
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
          <span>Operational Dashboard Data Unavailable</span>
        </div>
        <p className="text-xs text-rose-700">{error}</p>
        <Button variant="secondary" size="sm" onClick={loadDashboardData} leftIcon={RotateCw}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const activeTickets = summary?.tickets?.active_tickets ?? 0;
  const resolvedTickets = summary?.tickets?.completed_tickets ?? 0;
  const compliancePct = summary?.sla?.compliance_percentage ?? 100;
  const overdueCount = summary?.sla?.overdue_tickets_count ?? 0;
  const activeAgents = summary?.workload?.active_agents_count ?? 0;
  const unassignedCount = summary?.tickets?.status_breakdown?.open ?? 0;
  const avgResolutionHours = summary?.sla?.avg_resolution_time_hours ?? 0;

  return (
    <div className="space-y-6">
      {/* Workspace Header & Action Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Operations Overview
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Connected to ServiceSphere API
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time ticket throughput, agent workload balance, and enterprise SLA compliance tracking.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button variant="secondary" size="sm" onClick={() => (window.location.href = ROUTES.ANALYTICS)}>
            View Analytics
          </Button>
          <Button variant="primary" size="sm" onClick={() => (window.location.href = ROUTES.SLA)}>
            Manage SLA Policies
          </Button>
        </div>
      </div>

      {/* Integrated Operations Performance Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Ticket Queue</span>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{activeTickets}</span>
            <span className="inline-flex items-center text-xs font-medium text-slate-500">
              {summary?.tickets?.total_tickets || 0} total logged
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Open Backlog: <strong className="text-slate-800 font-semibold">{unassignedCount}</strong></span>
            <span className="text-slate-600 font-medium">{summary?.tickets?.status_breakdown?.in_progress || 0} in progress</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Resolved Throughput</span>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{resolvedTickets}</span>
            <span className="text-xs text-emerald-600 font-medium">
              {summary?.tickets?.completion_rate || 0}% clearance
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Mean MTTR:</span>
            <span className="font-semibold text-slate-800">{avgResolutionHours ? `${avgResolutionHours} hrs` : 'Nominal'}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Global SLA Compliance</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className={`text-2xl font-bold tracking-tight ${compliancePct >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {compliancePct}%
            </span>
            <span className="text-xs text-slate-500">target: 95.0%</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Overdue Breaches:</span>
            <span className={`font-semibold ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{overdueCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Support Staff</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{activeAgents}</span>
            <span className="text-xs text-slate-500">specialists deployed</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Assigned Load:</span>
            <span className="font-semibold text-slate-800">{summary?.workload?.total_active_workload || 0} active tickets</span>
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ticket Volume Trends */}
        <Card
          title="Ticket Intake vs. Resolution Velocity"
          subtitle="Operational throughput comparison from backend analytics"
          className="lg:col-span-2"
        >
          <div className="h-64 w-full">
            {trends.length === 0 ? (
              <EmptyState title="No timeline data" description="Ticket activity will be visualized as incidents are recorded." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    label={{
                      value: 'Tickets',
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: '#64748B', fontSize: '11px', fontWeight: 500 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    align="right"
                    verticalAlign="top"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '12px', color: '#475569' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    name="Incoming Intake"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#createdGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    name="Resolved Clearance"
                    stroke="#16A34A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#resolvedGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Priority Breakdown */}
        <Card
          title="Active Backlog by Urgency"
          subtitle="Triage urgency distribution across queue"
        >
          <div className="h-64 w-full">
            {priorityData.length === 0 ? (
              <EmptyState title="No priority data" description="Priority distribution will update as tickets are categorized." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Tickets" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Tickets Table */}
      <Card
        title="Active Incident & Request Stream"
        subtitle="Real-time ticket lifecycle status across enterprise tenant accounts"
        padding={false}
        headerAction={
          <Link
            to={ROUTES.TICKETS}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Open Ticket Queue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <Table columns={columns} data={recentTickets} />
      </Card>
    </div>
  );
}

export default AdminDashboard;
