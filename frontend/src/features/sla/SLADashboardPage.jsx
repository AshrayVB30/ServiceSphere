/**
 * @file SLADashboardPage.jsx
 * @description Comprehensive SLA (Service Level Agreement) Governance Dashboard.
 * Visualizes dynamic SLA compliance metrics, automated background Celery escalation alerts,
 * and allows administrators to inspect and adjust priority-based response and resolution targets.
 */

// Import React library and component hooks for state management and lifecycle side effects
import React, { useState, useEffect } from 'react';
// Import Lucide icons for visual status indicators, trend arrows, clock timers, and edit buttons
import { Clock, ShieldAlert, AlertTriangle, TrendingUp, Edit2 } from 'lucide-react';
// Import reusable Card container component for structured visual layout sections
import { Card } from '../../components/common/Card';
// Import Table component to display tabular SLA policies and escalation logs
import { Table } from '../../components/common/Table';
// Import Badge component for status markers and active enforcement tags
import { Badge } from '../../components/common/Badge';
// Import Button component for standard action triggers and modal controls
import { Button } from '../../components/common/Button';
// Import Modal dialog component for inline SLA policy editing workflows
import { Modal } from '../../components/common/Modal';
// Import Input component for editing numeric response and resolution thresholds
import { Input } from '../../components/common/Input';
// Import Textarea component for descriptive policy contract notes
import { Textarea } from '../../components/common/Textarea';
// Import PriorityBadge component for standard color-coded ticket priority tags
import { PriorityBadge } from '../../components/feedback/PriorityBadge';
// Import custom useToast hook for triggering interactive feedback alerts
import { useToast } from '../../hooks/useToast';
// Import API service layer for fetching and modifying SLA policies and escalations
import slaService from '../../services/slaService';

/**
 * SLADashboardPage Component
 * Renders compliance overview metrics, active SLA policy tiers, escalation queues, and edit modals.
 */
export function SLADashboardPage() {
  // Initialize toast notifications dispatcher for success and error messages
  const toast = useToast();
  // State storing the list of defined SLA policies fetched from the backend
  const [policies, setPolicies] = useState([]);
  // State storing triggered automated escalation log records
  const [escalations, setEscalations] = useState([]);
  // State storing the real-time SLA health and monitoring summary statistics
  const [monitoring, setMonitoring] = useState(null);
  // State tracking the initial data loading lifecycle status
  const [loading, setLoading] = useState(true);

  // Edit Policy Modal state: stores the policy currently being edited or null if modal is closed
  const [editingPolicy, setEditingPolicy] = useState(null);
  // Form input state for first response target in hours
  const [formResponseHours, setFormResponseHours] = useState('');
  // Form input state for final resolution target in hours
  const [formResolutionHours, setFormResolutionHours] = useState('');
  // Form input state for descriptive policy documentation
  const [formDescription, setFormDescription] = useState('');
  // State tracking whether an update submission is currently in flight
  const [submitting, setSubmitting] = useState(false);

  // Lifecycle effect hook: runs once on component mount to query policies, escalations, and health metrics
  useEffect(() => {
    // Asynchronous loader function querying backend SLA endpoints in parallel
    async function loadData() {
      // Set loading indicator to active while fetching remote datasets
      setLoading(true);
      try {
        // Execute parallel requests for policies, escalations, and monitoring summary
        const [polList, escList, monSummary] = await Promise.all([
          // Fetch all configured SLA policies; fallback to empty array on failure
          slaService.getPolicies().catch(() => []),
          // Fetch recent automated escalation triggers; fallback to empty array on failure
          slaService.getEscalations().catch(() => []),
          // Fetch aggregated real-time compliance monitoring summary; fallback to null
          slaService.getMonitoringSummary().catch(() => null),
        ]);
        // Update policies state with retrieved collection
        setPolicies(polList);
        // Update escalations state with retrieved log
        setEscalations(escList);
        // Update monitoring health summary state
        setMonitoring(monSummary);
      } finally {
        // Deactivate loading state once network operations settle
        setLoading(false);
      }
    }
    // Invoke the async data loading routine
    loadData();
  }, []); // Empty dependency array ensures execution only on mount

  // Opens the edit modal and populates form fields with the selected policy's existing values
  const handleOpenEdit = (policy) => {
    // Set the currently active policy object
    setEditingPolicy(policy);
    // Populate form response hours with existing policy value
    setFormResponseHours(policy.response_time_hours);
    // Populate form resolution hours with existing policy value
    setFormResolutionHours(policy.resolution_time_hours);
    // Populate description with existing string or fallback to empty string
    setFormDescription(policy.description || '');
  };

  // Handles form submission for updating an existing SLA policy
  const handleSavePolicy = async (e) => {
    // Prevent default browser form submission refresh
    e.preventDefault();
    // Enable submitting state to disable buttons and show spinners
    setSubmitting(true);
    try {
      // Dispatch API request to update target thresholds and description
      const updated = await slaService.updatePolicy(editingPolicy.id, {
        // Pass updated response hours target
        response_time_hours: formResponseHours,
        // Pass updated resolution hours target
        resolution_time_hours: formResolutionHours,
        // Pass updated documentation notes
        description: formDescription,
      });

      // Update local policies state by mapping over items and replacing the updated policy
      setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      // Display success toast notification confirming policy modification
      toast.success('SLA Policy Updated', `${editingPolicy.name} targets saved.`);
      // Close the editing modal
      setEditingPolicy(null);
    } catch (err) {
      // Display error notification if API update rejected
      toast.error('Update failed', err.message);
    } finally {
      // Re-enable interactive controls by clearing submitting state
      setSubmitting(false);
    }
  };

  // Table column configuration for SLA policies
  const policyColumns = [
    {
      // Column key mapped to ticket priority identifier
      key: 'priority',
      // User-facing column header text
      header: 'Priority Tier',
      // Render function rendering styled priority badge component
      render: (val) => <PriorityBadge priority={val} />,
    },
    {
      // Column key mapped to policy rule name
      key: 'name',
      // User-facing column header text
      header: 'Policy Rule Name',
      // Custom renderer showing policy title and subtext description
      render: (val, row) => (
        <div className="py-0.5">
          {/* Policy rule title in bold text */}
          <p className="font-semibold text-gray-900 text-xs">{val}</p>
          {/* Detailed rule description in secondary gray font */}
          <p className="text-xs text-gray-500 mt-1">{row.description}</p>
        </div>
      ),
    },
    {
      // Column key mapped to first response target hours
      key: 'response_time_hours',
      // User-facing column header text
      header: 'First Response Target',
      // Align numeric column content to the right
      align: 'right',
      // Format response hours inside an emphasized colored pill
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
          {val} hours
        </span>
      ),
    },
    {
      // Column key mapped to resolution target hours
      key: 'resolution_time_hours',
      // User-facing column header text
      header: 'Resolution Target',
      // Align numeric column content to the right
      align: 'right',
      // Format resolution hours inside a neutral badge
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
          {val} hours
        </span>
      ),
    },
    {
      // Column key mapped to active policy enforcement boolean
      key: 'is_active',
      // User-facing column header text
      header: 'Enforcement',
      // Render active or paused status badge with status indicator dot
      render: (val) => (
        <Badge variant={val ? 'success' : 'neutral'} dot>
          {val ? 'Active Enforcement' : 'Paused'}
        </Badge>
      ),
    },
    {
      // Actions column key
      key: 'actions',
      // Empty header for action buttons
      header: '',
      // Align action button to the right side of the row
      align: 'right',
      // Render button allowing administrator to open edit modal for this policy
      render: (_, row) => (
        <Button
          variant="ghost" // Subtle ghost button styling
          size="sm" // Compact small sizing
          leftIcon={Edit2} // Visual edit icon
          onClick={() => handleOpenEdit(row)} // Click handler opening edit dialog
        >
          Adjust Targets
        </Button>
      ),
    },
  ];

  // Table column configuration for automated Celery escalations
  const escalationColumns = [
    {
      // Column key mapped to ticket reference number
      key: 'ticket_number',
      // Column header text
      header: 'Ticket ID',
      // Render ticket code in blue monospace text
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-blue-600">
          {val}
        </span>
      ),
    },
    {
      // Column key mapped to ticket subject line
      key: 'subject',
      // Column header text
      header: 'Ticket Subject & Client',
      // Render primary ticket subject and associated client company
      render: (val, row) => (
        <div className="py-0.5">
          {/* Ticket subject in bold text */}
          <p className="font-semibold text-gray-900 text-xs">{val}</p>
          {/* Client account name in subtext */}
          <p className="text-xs text-gray-500 mt-1">{row.client_name}</p>
        </div>
      ),
    },
    {
      // Column key mapped to escalation tier level
      key: 'tier',
      // Column header text
      header: 'Escalation Level',
      // Render escalation badge with warning or danger color based on tier level
      render: (val) => (
        <Badge variant={val === 1 ? 'warning' : 'danger'}>
          Tier {val} Alert
        </Badge>
      ),
    },
    {
      // Column key mapped to escalation trigger reason
      key: 'reason',
      // Column header text
      header: 'Trigger Condition',
      // Render the rule or condition that triggered this escalation
      render: (val) => <span className="text-xs text-gray-600">{val}</span>,
    },
    {
      // Column key mapped to assigned target recipient or escalation manager
      key: 'escalated_to',
      // Column header text
      header: 'Escalated Target',
      // Render the target user or role to whom the incident was escalated
      render: (val) => <span className="text-xs font-medium text-gray-900">{val}</span>,
    },
    {
      // Column key mapped to current escalation status
      key: 'status',
      // Column header text
      header: 'Status',
      // Render status badge reflecting current state (e.g., TRIGGERED or ACKNOWLEDGED)
      render: (val) => (
        <Badge variant={val === 'TRIGGERED' ? 'warning' : 'blue'}>
          {val}
        </Badge>
      ),
    },
  ];

  // Render the primary SLA governance page interface
  return (
    // Outer vertical flex container with standard spacing
    <div className="space-y-6">
      {/* Page Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          {/* Header title and active Celery worker indicator badge */}
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              SLA Governance & Automated Escalation
            </h1>
            {/* Live Celery background task worker status badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              {/* Pulsing green status dot indicator */}
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Celery Worker Active
            </span>
          </div>
          {/* Subtitle explaining SLA page functionality */}
          <p className="text-xs text-slate-500 mt-1">
            Real-time compliance monitoring, multi-tier escalation triggers, and policy target adjustments.
          </p>
        </div>
      </div>

      {/* Dynamic SLA Health Metrics Strip (IIFE for local variable calculation) */}
      {(() => {
        // Extract total active tickets count with fallback to zero
        const totalActive = monitoring?.total_active_tickets ?? 0;
        // Extract tickets currently within compliance limits
        const withinSla = monitoring?.tickets_within_sla ?? 0;
        // Compute total tickets approaching response or resolution breach
        const warnings = (monitoring?.tickets_approaching_response ?? 0) + (monitoring?.tickets_approaching_resolution ?? 0);
        // Compute total tickets that have already breached response or resolution thresholds
        const breaches = (monitoring?.tickets_breached_response ?? 0) + (monitoring?.tickets_breached_resolution ?? 0);
        // Calculate compliance percentage formatted to 1 decimal place; defaults to 100% if no tickets exist
        const compliancePct = totalActive > 0 ? Math.round((withinSla / totalActive) * 1000) / 10 : 100.0;

        return (
          // Grid container displaying 4 key metrics cards
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Metric 1: SLA Compliance Rate Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">Compliance Rate</span>
                {/* Trend icon */}
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                {/* Dynamic colored percentage text based on meeting 95% threshold */}
                <span className={`text-2xl font-bold tracking-tight ${compliancePct >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {compliancePct}%
                </span>
                <span className="text-xs text-slate-500">goal: &gt;95.0%</span>
              </div>
              {/* Context subtext comparing current compliance to 95% target threshold */}
              <p className="mt-2 text-xs text-slate-500 font-medium border-t border-slate-100 pt-2">
                {totalActive === 0 ? 'No active tickets in queue' : `${compliancePct >= 95 ? '+' : ''}${(compliancePct - 95).toFixed(1)}% vs. target threshold`}
              </p>
            </div>

            {/* Metric 2: Active Governed Tickets Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">Active Governed Tickets</span>
                {/* Clock icon */}
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">{totalActive}</span>
                <span className="text-xs text-slate-500">tickets monitored</span>
              </div>
              {/* Context subtext stating tickets within compliance */}
              <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                {totalActive === 0 ? 'Zero active incidents requiring SLA tracking' : `${withinSla} within response & resolution targets`}
              </p>
            </div>

            {/* Metric 3: Near Threshold Warnings Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">Near Threshold Warnings</span>
                {/* Warning alert icon with color reflecting alert level */}
                <AlertTriangle className={`h-4 w-4 ${warnings > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                {/* Warning count number with amber highlight if greater than zero */}
                <span className={`text-2xl font-bold tracking-tight ${warnings > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{warnings}</span>
                <span className="text-xs text-slate-500">near threshold</span>
              </div>
              {/* Context subtext indicating proximity to breach */}
              <p className="mt-2 text-xs text-slate-500 font-medium border-t border-slate-100 pt-2">
                {warnings === 0 ? 'No tickets approaching breach' : `${warnings} ticket(s) nearing target deadline`}
              </p>
            </div>

            {/* Metric 4: Active Breaches Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">Active Breaches</span>
                {/* Shield alert icon */}
                <ShieldAlert className={`h-4 w-4 ${breaches > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                {/* Breached count with rose/red alert styling */}
                <span className={`text-2xl font-bold tracking-tight ${breaches > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{breaches}</span>
                <span className="text-xs text-slate-500">{breaches === 0 ? 'zero failures' : 'breached'}</span>
              </div>
              {/* Context subtext describing breach status */}
              <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                {breaches === 0 ? 'Clean record in current monitoring cycle' : `${breaches} ticket(s) exceeded target SLA`}
              </p>
            </div>
          </div>
        );
      })()}

      {/* SLA Policy Matrix Table Container */}
      <Card
        title="Priority SLA Policy Thresholds"
        subtitle="Defines maximum allowable response and resolution windows by ticket urgency"
        padding={false}
      >
        {/* Render interactive table displaying policies and targets */}
        <Table columns={policyColumns} data={policies} loading={loading} />
      </Card>

      {/* Automated Escalations Log Table Container */}
      <Card
        title="Automated Celery Escalation Queue"
        subtitle="Recent multi-tier breach prevention alerts triggered by background task workers"
        padding={false}
      >
        {/* Render escalation logs table */}
        <Table columns={escalationColumns} data={escalations} />
      </Card>

      {/* Adjust Policy Modal Dialog: conditionally rendered when a policy is selected for editing */}
      {editingPolicy && (
        <Modal
          isOpen={!!editingPolicy} // Boolean flag controlling visibility
          onClose={() => setEditingPolicy(null)} // Dismiss handler
          title={`Adjust SLA Policy: ${editingPolicy.name}`} // Dialog title including policy name
          description={`Urgency Tier: ${editingPolicy.priority}`} // Priority tier indicator
          size="md" // Medium modal width
          footer={
            // Modal action footer buttons
            <>
              {/* Cancel dismissal button */}
              <Button variant="secondary" size="sm" onClick={() => setEditingPolicy(null)} disabled={submitting}>
                Cancel
              </Button>
              {/* Form submit confirmation button */}
              <Button variant="primary" size="sm" loading={submitting} onClick={handleSavePolicy}>
                Save Policy Targets
              </Button>
            </>
          }
        >
          {/* Edit Policy Form */}
          <form onSubmit={handleSavePolicy} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Input for first response hours */}
              <Input
                label="Max First Response Hours"
                type="number"
                step="0.5"
                min="0.5"
                required
                value={formResponseHours}
                onChange={(e) => setFormResponseHours(e.target.value)}
              />

              {/* Input for resolution hours */}
              <Input
                label="Max Resolution Hours"
                type="number"
                step="1"
                min="1"
                required
                value={formResolutionHours}
                onChange={(e) => setFormResolutionHours(e.target.value)}
              />
            </div>

            {/* Textarea for policy notes and description */}
            <Textarea
              label="Policy Scope & Contract Notes"
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

// Export SLADashboardPage as default export for lazy loading and routing
export default SLADashboardPage;
