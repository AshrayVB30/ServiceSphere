import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ArrowUpRight,
  Users,
  ShieldCheck,
  Activity,
  ArrowRight,
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
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { PriorityBadge } from '../../components/feedback/PriorityBadge';
import { TICKET_STATUSES, TICKET_PRIORITIES, ROUTES } from '../../constants';

// Realistic sample trend data
const ticketTrendsData = [
  { day: 'Mon', created: 24, resolved: 18 },
  { day: 'Tue', created: 35, resolved: 28 },
  { day: 'Wed', created: 42, resolved: 39 },
  { day: 'Thu', created: 38, resolved: 36 },
  { day: 'Fri', created: 48, resolved: 44 },
  { day: 'Sat', created: 18, resolved: 20 },
  { day: 'Sun', created: 12, resolved: 15 },
];

const priorityDistribution = [
  { name: 'Low', count: 18, fill: '#64748B' },
  { name: 'Medium', count: 42, fill: '#2563EB' },
  { name: 'High', count: 24, fill: '#D97706' },
  { name: 'Urgent', count: 8, fill: '#DC2626' },
];

const recentTickets = [
  {
    id: 1,
    ticket_number: 'TCK-8821',
    subject: 'SSO Authentication latency during morning peak hours',
    client_name: 'Acme Global Corp',
    priority: TICKET_PRIORITIES.URGENT,
    status: TICKET_STATUSES.IN_PROGRESS,
    assigned_to: 'Sarah Connor',
    created_at: '10 mins ago',
  },
  {
    id: 2,
    ticket_number: 'TCK-8820',
    subject: 'Request for secondary API webhook endpoint provisioning',
    client_name: 'Stark Industries',
    priority: TICKET_PRIORITIES.MEDIUM,
    status: TICKET_STATUSES.OPEN,
    assigned_to: 'Unassigned',
    created_at: '25 mins ago',
  },
  {
    id: 3,
    ticket_number: 'TCK-8819',
    subject: 'Database read replica synchronization delay',
    client_name: 'Wayne Enterprises',
    priority: TICKET_PRIORITIES.HIGH,
    status: TICKET_STATUSES.AWAITING_CUSTOMER,
    assigned_to: 'Alex Vance',
    created_at: '1 hour ago',
  },
  {
    id: 4,
    ticket_number: 'TCK-8818',
    subject: 'Invoice PDF generation formatting glitch in billing portal',
    client_name: 'Cyberdyne Systems',
    priority: TICKET_PRIORITIES.LOW,
    status: TICKET_STATUSES.RESOLVED,
    assigned_to: 'Sarah Connor',
    created_at: '3 hours ago',
  },
];

export function AdminDashboard() {
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
      header: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'assigned_to',
      header: 'Assigned Specialist',
      render: (val) => (
        <div className="flex items-center space-x-2">
          <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px] flex items-center justify-center uppercase">
            {val[0]}
          </div>
          <span className="text-xs text-slate-700 font-medium">{val}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Logged',
      align: 'right',
      render: (val) => <span className="text-xs text-slate-500">{val}</span>,
    },
  ];

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
              All Systems Operational
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

      {/* Integrated Operations Performance Strip (Replaces Generic AI 4-Card Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Ticket Queue</span>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">92</span>
            <span className="inline-flex items-center text-xs font-medium text-emerald-600">
              <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
              +12% vs lw
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Unassigned: <strong className="text-slate-800 font-semibold">14</strong></span>
            <span className="text-amber-600 font-medium">3 urgent</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Clearance Velocity</span>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">38</span>
            <span className="text-xs text-slate-500 font-medium">resolved today</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Mean MTTR:</span>
            <span className="font-semibold text-slate-800">3.2 hours</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Global SLA Compliance</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">97.4%</span>
            <span className="text-xs text-slate-500">target: 95.0%</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Active Breaches:</span>
            <span className="font-semibold text-slate-900">0</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Agent Staffing & Load</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">8</span>
            <span className="text-xs text-slate-500">specialists on-duty</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Team Utilization:</span>
            <span className="font-semibold text-slate-800">82% (Nominal)</span>
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ticket Volume Trends */}
        <Card
          title="Ticket Intake vs. Resolution Velocity"
          subtitle="7-day operational throughput comparison"
          className="lg:col-span-2"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ticketTrendsData} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
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
          </div>
        </Card>

        {/* Priority Breakdown */}
        <Card
          title="Active Backlog by Urgency"
          subtitle="Triage urgency distribution across queue"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityDistribution} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
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

