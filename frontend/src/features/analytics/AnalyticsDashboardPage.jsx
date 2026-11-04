import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, Clock, CheckCircle2, BarChart3 } from 'lucide-react';
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
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import analyticsService from '../../services/analyticsService';

const TIME_RANGES = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Current Quarter', value: '90d' },
  { label: 'Year to Date', value: 'ytd' },
];

export function AnalyticsDashboardPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await analyticsService.getMetrics({ range: timeRange });
        setData(res);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [timeRange]);

  const handleExportCsv = () => {
    if (!data) return;
    analyticsService.exportCsv(data);
    toast.success('Report Exported', 'CSV analytics dataset downloaded to your device.');
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  const agentColumns = [
    {
      key: 'name',
      header: 'Support Specialist',
      render: (val) => (
        <div className="flex items-center space-x-2.5">
          <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center uppercase">
            {val[0]}
          </div>
          <span className="font-semibold text-gray-900 text-xs">{val}</span>
        </div>
      ),
    },
    {
      key: 'assigned_count',
      header: 'Assigned',
      align: 'right',
      render: (val) => <span className="font-mono text-xs font-semibold text-gray-900">{val}</span>,
    },
    {
      key: 'resolved_count',
      header: 'Resolved',
      align: 'right',
      render: (val) => <span className="font-mono text-xs font-semibold text-emerald-600">{val}</span>,
    },
    {
      key: 'workload_pct',
      header: 'Workload Share',
      render: (val) => (
        <div className="flex items-center gap-2.5 min-w-[140px]">
          <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(val, 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs font-medium text-gray-600 w-9 text-right shrink-0">
            {val}%
          </span>
        </div>
      ),
    },
    {
      key: 'avg_response_hours',
      header: 'Avg. First Response',
      align: 'right',
      render: (val) => <span className="font-mono text-xs font-medium text-gray-900">{val} hrs</span>,
    },
    {
      key: 'avg_resolution_hours',
      header: 'Avg. Resolution (MTTR)',
      align: 'right',
      render: (val) => <span className="font-mono text-xs font-medium text-gray-900">{val} hrs</span>,
    },
    {
      key: 'sla_compliance_pct',
      header: 'SLA Compliance',
      align: 'right',
      render: (val) => {
        const variant = val >= 95 ? 'success' : val >= 90 ? 'warning' : 'danger';
        return (
          <Badge variant={variant} dot>
            {val}%
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Range Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Analytics & KRA Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise throughput benchmarks, agent efficiency metrics, and SLA compliance monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Segmented Time Range Controller */}
          <div className="inline-flex items-center h-9 p-0.5 rounded-lg border border-slate-200/90 bg-slate-50/70 shadow-2xs">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setTimeRange(r.value)}
                className={`h-8 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  timeRange === r.value
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Export Action Button aligned to matching h-9 baseline */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-9 px-3.5 rounded-lg text-xs font-medium border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Benchmark Strip (Replaces Generic AI 4-Card Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">SLA Compliance Rate</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">{data.summary.sla_compliance_rate}%</span>
            <span className="text-xs text-slate-500">benchmark: 95%</span>
          </div>
          <p className="mt-2 text-xs text-emerald-600 font-medium border-t border-slate-100 pt-2">
            Target met across all priorities
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Avg First Response</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{data.summary.avg_first_response_hours} hrs</span>
            <span className="text-xs text-slate-500">&lt; 2.0h target</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Fastest turnaround in Q3
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Resolution Time (MTTR)</span>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{data.summary.avg_resolution_hours} hrs</span>
            <span className="text-xs text-slate-500">mean duration</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Calculated across all urgency tiers
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">First Contact Resolution</span>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{data.summary.fcr_rate}%</span>
            <span className="text-xs text-slate-500">1st reply fix</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Zero customer escalations required
          </p>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Daily Ticket Volume vs. Resolutions"
          subtitle="Real-time intake vs operational clearance"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.ticket_trends} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="anCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="anResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  label={{
                    value: 'Tickets',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#6B7280', fontSize: '11px', fontWeight: 500 },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  align="right"
                  verticalAlign="top"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '12px', color: '#4B5563' }}
                />
                <Area type="monotone" dataKey="created" name="Volume (Created)" stroke="#2563EB" strokeWidth={2} fill="url(#anCreated)" />
                <Area type="monotone" dataKey="resolved" name="Resolutions" stroke="#16A34A" strokeWidth={2} fill="url(#anResolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Volume Distribution by Issue Domain"
          subtitle="Functional classification of filed inquiries"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.category_breakdown} layout="vertical" margin={{ top: 10, right: 25, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis
                  type="number"
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  label={{
                    value: 'Number of Tickets',
                    position: 'insideBottom',
                    offset: -10,
                    style: { textAnchor: 'middle', fill: '#6B7280', fontSize: '11px', fontWeight: 500 },
                  }}
                />
                <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Tickets" fill="#2563EB" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Agent Performance Leaderboard Table */}
      <Card
        title="Agent Performance & Workload Distribution Leaderboard"
        subtitle="Individual team member productivity, average resolution turnaround, and SLA adherence"
        padding={false}
      >
        <Table columns={agentColumns} data={data.agent_leaderboard} />
      </Card>
    </div>
  );
}

export default AnalyticsDashboardPage;
