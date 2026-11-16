/**
 * @file AnalyticsDashboardPage.jsx
 * @description Enterprise Analytics & Operational Intelligence Page.
 * Consolidates executive throughput metrics, daily ticket creation vs. resolution trend charts,
 * category distribution bar charts, and agent performance leaderboards with RFC 4180 CSV export.
 */

// Import React library and essential state, lifecycle, and memoized callback hooks
import React, { useState, useEffect, useCallback } from 'react';
// Import Lucide icons for metrics, status markers, download actions, and retry controls
import { Download, TrendingUp, Clock, CheckCircle2, BarChart3, AlertCircle, RotateCw } from 'lucide-react';
// Import Recharts charting primitives for responsive area and bar chart data visualizations
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
// Import Card container component for structured panel layout sections
import { Card } from '../../components/common/Card';
// Import Table component for rendering the support agent leaderboard
import { Table } from '../../components/common/Table';
// Import Badge component for rendering color-coded compliance percentages
import { Badge } from '../../components/common/Badge';
// Import Button component for standard interactive triggers and export action
import { Button } from '../../components/common/Button';
// Import Skeleton loader component for animated loading states
import { Skeleton } from '../../components/common/Skeleton';
// Import EmptyState component for gracefully handling empty dataset states
import { EmptyState } from '../../components/common/EmptyState';
// Import useToast hook to display interactive notifications
import { useToast } from '../../hooks/useToast';
// Import analyticsService API client for fetching dashboard metrics, trends, and CSV exports
import { analyticsService } from '../../services/analyticsService';

// Define predefined relative time range filters with label, query value, and duration in days
const TIME_RANGES = [
  // 7-day trailing window
  { label: 'Last 7 Days', value: '7d', days: 7 },
  // 30-day trailing window
  { label: 'Last 30 Days', value: '30d', days: 30 },
  // 90-day quarterly window
  { label: 'Current Quarter', value: '90d', days: 90 },
  // Unbounded all-time query
  { label: 'All Time', value: 'all', days: null },
];

/**
 * Format date for trend chart display.
 * @param {string} dateStr - Date string.
 * @returns {string} Formatted label (e.g., 'Nov 12').
 */
function formatTrendDate(dateStr) {
  // Return empty string if date is missing
  if (!dateStr) return '';
  // Parse date string into Date instance
  const d = new Date(dateStr);
  // Return raw string if date parsing produced an invalid date
  if (isNaN(d.getTime())) return dateStr;
  // Format into localized short month and day string
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Computes start_date string based on selected relative range.
 * @param {number|null} days - Number of days to subtract from today.
 * @returns {string|undefined} 'YYYY-MM-DD' or undefined for all time.
 */
function getStartDateForRange(days) {
  // Return undefined for all-time ranges
  if (!days) return undefined;
  // Initialize date object with current timestamp
  const d = new Date();
  // Subtract specified number of days
  d.setDate(d.getDate() - days);
  // Extract and return ISO 8601 date string 'YYYY-MM-DD'
  return d.toISOString().split('T')[0];
}

/**
 * Enterprise Analytics & Operational Intelligence Page
 * Consolidates executive throughput metrics, timeline distributions,
 * category breakdowns, and support agent scorecards directly from the DRF backend.
 */
export function AnalyticsDashboardPage() {
  // Initialize toast dispatcher for user feedback notifications
  const toast = useToast();
  // State storing the currently selected time range value ('7d', '30d', '90d', 'all')
  const [timeRange, setTimeRange] = useState('7d');
  // State tracking whether analytics data is actively loading
  const [loading, setLoading] = useState(true);
  // State storing any network error message encountered during fetch
  const [error, setError] = useState(null);
  // State tracking whether CSV export is currently running
  const [exporting, setExporting] = useState(false);

  // Analytics data state: high-level summary KPIs (SLA compliance, MTTR, clearance rate)
  const [summary, setSummary] = useState(null);
  // State storing timeline trend data for the area chart
  const [trends, setTrends] = useState([]);
  // State storing category volume breakdown for the bar chart
  const [categories, setCategories] = useState([]);
  // State storing agent performance scorecard records
  const [leaderboard, setLeaderboard] = useState([]);

  // Memoized callback function to fetch all analytics datasets in parallel based on active time range
  const loadAnalytics = useCallback(async () => {
    // Set loading indicator
    setLoading(true);
    // Clear previous errors
    setError(null);

    // Look up selected time range configuration object
    const rangeConfig = TIME_RANGES.find((r) => r.value === timeRange);
    // Calculate start date string for query params
    const startDate = getStartDateForRange(rangeConfig?.days);
    // Construct request params object with optional start_date
    const params = startDate ? { start_date: startDate } : {};

    try {
      // Execute 4 parallel analytics requests for summary, trends, categories, and leaderboard
      const [summaryRes, trendsRes, catRes, leaderRes] = await Promise.all([
        analyticsService.getDashboardSummary(params),
        analyticsService.getTicketTrends(params),
        analyticsService.getTicketsByCategory(params),
        analyticsService.getAgentLeaderboard(params),
      ]);

      // Set high-level summary KPI state
      setSummary(summaryRes);

      // Extract and format timeline trend series
      const rawTimeline = trendsRes?.timeline || trendsRes || [];
      const formattedTimeline = rawTimeline.map((item) => ({
        date: formatTrendDate(item.date),
        created: item.created || 0,
        resolved: item.resolved || 0,
      }));
      setTrends(formattedTimeline);

      // Extract and format category breakdown series
      const rawCats = Array.isArray(catRes) ? catRes : catRes?.by_category || [];
      const formattedCats = rawCats.map((c) => ({
        name: c.category || 'General',
        count: c.count || 0,
        percentage: c.percentage || 0,
      }));
      setCategories(formattedCats);

      // Extract and format agent leaderboard records
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
      // Record error message on failure
      setError(err.message || 'Failed to load enterprise analytics.');
    } finally {
      // Clear loading indicator
      setLoading(false);
    }
  }, [timeRange]); // Re-create callback when time range filter changes

  // Fetch analytics data on mount and whenever timeRange changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Handles requesting and downloading RFC 4180 CSV export of tickets
  const handleExportCsv = async () => {
    // Set exporting state to true
    setExporting(true);
    try {
      // Find range configuration
      const rangeConfig = TIME_RANGES.find((r) => r.value === timeRange);
      // Determine start date
      const startDate = getStartDateForRange(rangeConfig?.days);
      // Construct params object
      const params = startDate ? { start_date: startDate } : {};
      // Trigger CSV download via analytics service
      await analyticsService.exportTicketsCsv(params);
      // Display success toast notification
      toast.success('Report Exported', 'RFC 4180 CSV dataset downloaded to your device.');
    } catch (err) {
      // Display error notification on export failure
      toast.error('Export failed', err.message);
    } finally {
      // Reset exporting state
      setExporting(false);
    }
  };

  // Define table column configurations for the agent leaderboard
  const agentColumns = [
    {
      // Column key for specialist name
      key: 'name',
      // Column header title
      header: 'Support Specialist',
      // Custom renderer showing circular avatar badge, full name, and handle
      render: (val, row) => (
        <div className="flex items-center space-x-2.5">
          {/* Avatar initial badge */}
          <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center uppercase">
            {val?.[0] || 'A'}
          </div>
          <div>
            {/* Specialist name */}
            <span className="font-semibold text-slate-900 text-xs block">{val}</span>
            {/* Username handle */}
            <span className="text-[11px] text-slate-400">@{row.username}</span>
          </div>
        </div>
      ),
    },
    {
      // Column key for assigned tickets count
      key: 'assigned_count',
      // Column header title
      header: 'Assigned',
      // Align numeric column to the right
      align: 'right',
      // Render monospace count
      render: (val) => <span className="font-mono text-xs font-semibold text-slate-900">{val}</span>,
    },
    {
      // Column key for resolved tickets count
      key: 'resolved_count',
      // Column header title
      header: 'Resolved',
      // Align numeric column to the right
      align: 'right',
      // Render monospace count in emerald green
      render: (val) => <span className="font-mono text-xs font-semibold text-emerald-600">{val}</span>,
    },
    {
      // Column key for workload percentage
      key: 'workload_pct',
      // Column header title
      header: 'Workload Share',
      // Render progress bar reflecting agent's share of total workload
      render: (val) => (
        <div className="flex items-center gap-2.5 min-w-[140px]">
          {/* Progress bar track */}
          <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
            {/* Progress bar fill */}
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(val, 100)}%` }}
            />
          </div>
          {/* Numeric percentage text */}
          <span className="font-mono text-xs font-medium text-slate-600 w-9 text-right shrink-0">
            {val}%
          </span>
        </div>
      ),
    },
    {
      // Column key for average first response time in hours
      key: 'avg_response_hours',
      // Column header title
      header: 'Avg. First Response',
      // Align numeric column to the right
      align: 'right',
      // Render hours text
      render: (val) => <span className="font-mono text-xs font-medium text-slate-900">{val} hrs</span>,
    },
    {
      // Column key for average resolution time (MTTR) in hours
      key: 'avg_resolution_hours',
      // Column header title
      header: 'Avg. Resolution (MTTR)',
      // Align numeric column to the right
      align: 'right',
      // Render hours text
      render: (val) => <span className="font-mono text-xs font-medium text-slate-900">{val} hrs</span>,
    },
    {
      // Column key for SLA compliance percentage
      key: 'sla_compliance_pct',
      // Column header title
      header: 'SLA Compliance',
      // Align badge to the right
      align: 'right',
      // Render semantic status badge (success >= 95, warning >= 90, danger < 90)
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

  // Render animated loading skeleton while initial data is being fetched
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-8 w-56 rounded-lg" />
        </div>
        {/* KPI Strip skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        {/* Charts skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        {/* Leaderboard table skeleton */}
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Render error card if the analytics query failed
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

  // Extract summary KPI values with safe fallback defaults
  const slaRate = summary?.sla?.compliance_percentage ?? 100;
  const avgResponse = summary?.sla?.avg_response_time_hours ?? 0;
  const avgResolution = summary?.sla?.avg_resolution_time_hours ?? 0;
  const clearanceRate = summary?.tickets?.completion_rate ?? 0;

  // Render the full Analytics dashboard view
  return (
    // Outer vertical container with standard spacing
    <div className="space-y-6">
      {/* Top Header & Range Selection Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          {/* Main title */}
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Analytics & Operations Intelligence
          </h1>
          {/* Subtitle describing analytics coverage */}
          <p className="text-xs text-slate-500 mt-1">
            Enterprise throughput benchmarks, agent efficiency metrics, and SLA compliance monitoring.
          </p>
        </div>

        {/* Action toolbar containing range controller and CSV export button */}
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

          {/* Export CSV Action Button */}
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

      {/* KPI Benchmark Strip (4 metric cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: SLA Compliance Rate Card */}
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

        {/* Metric 2: Avg First Response Card */}
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

        {/* Metric 3: Resolution Time (MTTR) Card */}
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

        {/* Metric 4: Clearance Rate Card */}
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

      {/* Visualizations Grid (Area Trend and Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visualization 1: Daily Intake vs Resolutions Area Chart */}
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
                  {/* SVG gradients for smooth area fill */}
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
                  {/* Horizontal gridlines */}
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  {/* X Axis mapping date strings */}
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                  {/* Y Axis mapping volume counts */}
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
                  {/* Interactive tooltip */}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      fontSize: '12px',
                    }}
                  />
                  {/* Chart legend */}
                  <Legend
                    align="right"
                    verticalAlign="top"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '12px', color: '#4B5563' }}
                  />
                  {/* Area series for created volume */}
                  <Area type="monotone" dataKey="created" name="Volume (Created)" stroke="#2563EB" strokeWidth={2} fill="url(#anCreated)" />
                  {/* Area series for resolved volume */}
                  <Area type="monotone" dataKey="resolved" name="Resolutions" stroke="#16A34A" strokeWidth={2} fill="url(#anResolved)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Visualization 2: Issue Category Distribution Bar Chart */}
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
                  {/* Vertical gridlines */}
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  {/* X Axis representing numeric count */}
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
                  {/* Y Axis representing category names */}
                  <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} />
                  {/* Tooltip */}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      fontSize: '12px',
                    }}
                  />
                  {/* Bar fill */}
                  <Bar dataKey="count" name="Tickets" fill="#2563EB" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Agent Performance Leaderboard Table Container */}
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

// Export AnalyticsDashboardPage as default export for lazy loading and routing
export default AnalyticsDashboardPage;
