import React, { useState, useEffect, useCallback } from 'react';
import { Download, TrendingUp, Clock, CheckCircle2, BarChart3, AlertCircle, RotateCw } from 'lucide-react';
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
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../hooks/useToast';
import { analyticsService } from '../../services/analyticsService';

const TIME_RANGES = [
  { label: 'Last 7 Days', value: '7d', days: 7 },
  { label: 'Last 30 Days', value: '30d', days: 30 },
  { label: 'Current Quarter', value: '90d', days: 90 },
  { label: 'All Time', value: 'all', days: null },
];

/**
 * Format date for trend chart display.
 * @param {string} dateStr - Date string.
 * @returns {string} Formatted label.
 */
function formatTrendDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Computes start_date string based on selected relative range.
 * @param {number|null} days - Number of days.
 * @returns {string|undefined} 'YYYY-MM-DD' or undefined.
 */
function getStartDateForRange(days) {
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

/**
 * Enterprise Analytics & Operational Intelligence Page
 * Consolidates executive throughput metrics, timeline distributions,
 * category breakdowns, and support agent scorecards directly from the DRF backend.
 */
export function AnalyticsDashboardPage() {
  const toast = useToast();
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Analytics data state
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categories, setCategories] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const rangeConfig = TIME_RANGES.find((r) => r.value === timeRange);
    const startDate = getStartDateForRange(rangeConfig?.days);
    const params = startDate ? { start_date: startDate } : {};

    try {
      const [summaryRes, trendsRes, catRes, leaderRes] = await Promise.all([
        analyticsService.getDashboardSummary(params),
        analyticsService.getTicketTrends(params),
        analyticsService.getTicketsByCategory(params),
        analyticsService.getAgentLeaderboard(params),
      ]);

      setSummary(summaryRes);

      // Format timeline
      const rawTimeline = trendsRes?.timeline || trendsRes || [];
      const formattedTimeline = rawTimeline.map((item) => ({
        date: formatTrendDate(item.date),
        created: item.created || 0,
        resolved: item.resolved || 0,
      }));
      setTrends(formattedTimeline);

      // Format category distribution
      const rawCats = Array.isArray(catRes) ? catRes : catRes?.by_category || [];
      const formattedCats = rawCats.map((c) => ({
        name: c.category || 'General',
        count: c.count || 0,
        percentage: c.percentage || 0,
      }));
      setCategories(formattedCats);

      // Format leaderboard
      const rawAgents = leaderRes?.leaderboard || leaderRes || [];
      const formattedLeaderboard = rawAgents.map((a) => ({
        id: a.agent_id,
        name: a.full_name || a.username,
        username: a.username,
        assigned_count: a.assigned_tickets ?? 0,
        resolved_count: a.resolved_tickets ?? 0,
        workload_pct: a.workload_percentage ?? 0,
        avg_response_hours: a.avg_response_time_hours ?? 0,
        avg_resolution_hours: a.avg_resolution_time_hours ?? 0,
        sla_compliance_pct: a.sla_compliance_percentage ?? 100,
      }));
      setLeaderboard(formattedLeaderboard);
    } catch (err) {
      setError(err.message || 'Failed to load enterprise analytics.');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const rangeConfig = TIME_RANGES.find((r) => r.value === timeRange);
      const startDate = getStartDateForRange(rangeConfig?.days);
      const params = startDate ? { start_date: startDate } : {};
      await analyticsService.exportTicketsCsv(params);
      toast.success('Report Exported', 'RFC 4180 CSV dataset downloaded to your device.');
    } catch (err) {
      toast.error('Export failed', err.message);
    } finally {
      setExporting(false);
    }
  };

  const agentColumns = [
    {
      key: 'name',
      header: 'Support Specialist',
      render: (val, row) => (
        <div className="flex items-center space-x-2.5">
          <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center uppercase">
            {val?.[0] || 'A'}
          </div>
          <div>
            <span className="font-semibold text-slate-900 text-xs block">{val}</span>
            <span className="text-[11px] text-slate-400">@{row.username}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'assigned_count',
      header: 'Assigned',
      align: 'right',
      render: (val) => <span className="font-mono text-xs font-semibold text-slate-900">{val}</span>,
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
          <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(val, 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs font-medium text-slate-600 w-9 text-right shrink-0">
            {val}%
          </span>
        </div>
      ),
    },
    {
      key: 'avg_response_hours',
      header: 'Avg. First Response',
      align: 'right',
      render: (val) => <span className="font-mono text-xs font-medium text-slate-900">{val} hrs</span>,
    },
    {
      key: 'avg_resolution_hours',
      header: 'Avg. Resolution (MTTR)',
      align: 'right',
      render: (val) => <span className="font-mono text-xs font-medium text-slate-900">{val} hrs</span>,
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-8 w-56 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
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
          <span>Analytics Intelligence Unavailable</span>
        </div>
        <p className="text-xs text-rose-700">{error}</p>
        <Button variant="secondary" size="sm" onClick={loadAnalytics} leftIcon={RotateCw}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const slaRate = summary?.sla?.compliance_percentage ?? 100;
  const avgResponse = summary?.sla?.avg_response_time_hours ?? 0;
  const avgResolution = summary?.sla?.avg_resolution_time_hours ?? 0;
  const clearanceRate = summary?.tickets?.completion_rate ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Range Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Analytics & Operations Intelligence
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

          {/* Export Action Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting}
            loading={exporting}
            leftIcon={Download}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Benchmark Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">SLA Compliance Rate</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl font-bold tracking-tight ${slaRate >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {slaRate}%
            </span>
            <span className="text-xs text-slate-500">target: 95%</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            {summary?.sla?.breached_tickets || 0} breaches logged in period
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Avg First Response</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {avgResponse ? `${avgResponse} hrs` : 'N/A'}
            </span>
            <span className="text-xs text-slate-500">&lt; 2.0h target</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Computed across all active policies
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Resolution Time (MTTR)</span>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {avgResolution ? `${avgResolution} hrs` : 'N/A'}
            </span>
            <span className="text-xs text-slate-500">mean duration</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            From creation to resolution stage
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Clearance Rate</span>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{clearanceRate}%</span>
            <span className="text-xs text-slate-500">{summary?.tickets?.completed_tickets || 0} closed</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            {summary?.tickets?.active_tickets || 0} active in current queue
          </p>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Daily Ticket Volume vs. Resolutions"
          subtitle="Real-time intake vs operational clearance from DRF analytics"
        >
          <div className="h-64 w-full">
            {trends.length === 0 ? (
              <EmptyState title="No timeline data" description="Volume records will appear here as incidents are submitted." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
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
            )}
          </div>
        </Card>

        <Card
          title="Volume Distribution by Issue Category"
          subtitle="Functional classification of filed inquiries"
        >
          <div className="h-64 w-full">
            {categories.length === 0 ? (
              <EmptyState title="No categories recorded" description="Classification data will update as tickets are categorized." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} layout="vertical" margin={{ top: 10, right: 25, left: 20, bottom: 20 }}>
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
            )}
          </div>
        </Card>
      </div>

      {/* Agent Performance Leaderboard Table */}
      <Card
        title="Agent Performance & Workload Distribution Leaderboard"
        subtitle="Individual team member productivity, average resolution turnaround, and SLA adherence"
        padding={false}
      >
        {leaderboard.length === 0 ? (
          <EmptyState
            title="No Agent Records"
            description="Agent scorecards will appear as support staff resolve assigned inquiries."
          />
        ) : (
          <Table columns={agentColumns} data={leaderboard} />
        )}
      </Card>
    </div>
  );
}

export default AnalyticsDashboardPage;
