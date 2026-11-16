/**
 * @file ApprovalListPage.jsx
 * @description Operational Authorization and Incident Approval Workflow page.
 * Manages multi-tier review cycles for sensitive ticket actions (e.g., policy exemptions, firewall changes, credit refunds).
 * Allows approvers to grant authorization, reject with cause, request supplemental information, and inspect the complete audit trail.
 */

// Import React library and hooks for component state, lifecycle, memoized callbacks, and computed values
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Import Lucide icons representing decision outcomes, history timeline, and action buttons
import { Check, X, HelpCircle, History, RotateCw, FileCheck, Clock, CheckCircle2, Plus } from 'lucide-react';
// Import standard Button component for triggers and dialog actions
import { Button } from '../../components/common/Button';
// Import Table component for rendering the tabular list of approval requests
import { Table } from '../../components/common/Table';
// Import Modal dialog component for decision submission and history review
import { Modal } from '../../components/common/Modal';
// Import Textarea component for justification input and feedback commentary
import { Textarea } from '../../components/common/Textarea';
// Import Select component for target ticket selection dropdown
import { Select } from '../../components/common/Select';
// Import StatusBadge component for standard color-coded status rendering
import { StatusBadge } from '../../components/feedback/StatusBadge';
// Import custom useAuth hook to inspect active user identity and role permissions
import { useAuth } from '../../hooks/useAuth';
// Import custom useToast hook to display interactive toast alerts
import { useToast } from '../../hooks/useToast';
// Import approvalService API client for managing approval records and executing decisions
import approvalService from '../../services/approvalService';
// Import ticketService API client for fetching tickets linked to new approval requests
import ticketService from '../../services/ticketService';
// Import system constants for approval statuses and route URL patterns
import { APPROVAL_STATUSES, ROUTES } from '../../constants';
// Import React Router Link component for client-side navigation to ticket details
import { Link } from 'react-router-dom';

// Define status filtering tabs configuration
const STATUS_TABS = [
  // Option to view all approval requests regardless of status
  { label: 'All Requests', value: 'ALL' },
  // Filter for requests awaiting reviewer action
  { label: 'Pending Review', value: APPROVAL_STATUSES.PENDING },
  // Filter for authorized requests
  { label: 'Approved', value: APPROVAL_STATUSES.APPROVED },
  // Filter for denied requests
  { label: 'Rejected', value: APPROVAL_STATUSES.REJECTED },
  // Filter for requests requiring supplementary requester clarification
  { label: 'Info Requested', value: APPROVAL_STATUSES.INFO_REQUESTED },
];

/**
 * ApprovalListPage Component
 * Renders the approval requests queue, status filter tabs, decision modals, and request initiation forms.
 */
export function ApprovalListPage() {
  // Extract user identity, admin check, and approver flag from authentication context
  const { user, isAdmin, isApprover } = useAuth();
  // Initialize toast dispatcher for operational feedback messages
  const toast = useToast();

  // State storing the list of fetched approval requests
  const [approvals, setApprovals] = useState([]);
  // State indicating whether requests are actively loading from the API
  const [loading, setLoading] = useState(true);
  // State tracking the currently active status filter tab (defaults to 'ALL')
  const [activeTab, setActiveTab] = useState('ALL');

  // Decision Modal State: Stores currently selected request record
  const [selectedReq, setSelectedReq] = useState(null);
  // Decision action mode: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'RESUBMIT' | 'VIEW_HISTORY'
  const [actionType, setActionType] = useState('');
  // Decision comment or explanation text entered by the approver/requester
  const [decisionComment, setDecisionComment] = useState('');
  // State tracking whether an asynchronous decision submission is in flight
  const [submitting, setSubmitting] = useState(false);

  // New Approval Request Modal State: Visibility flag
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // List of tickets available for linking to an approval request
  const [ticketsList, setTicketsList] = useState([]);
  // Selected ticket ID for the new approval request
  const [createTicketId, setCreateTicketId] = useState('');
  // Operational justification text for the new approval request
  const [createReason, setCreateReason] = useState('');

  // Memoized callback to fetch approval records matching the active status tab
  const fetchApprovals = useCallback(async () => {
    // Activate loading skeleton/spinner
    setLoading(true);
    try {
      // Query approval records from backend with status filter parameter
      const data = await approvalService.getApprovals({ status: activeTab });
      // Update state with returned requests array
      setApprovals(data);
    } finally {
      // Clear loading indicator
      setLoading(false);
    }
  }, [activeTab]); // Recompute when active filter tab changes

  // Fetch approvals on component mount and whenever active tab changes
  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Load ticket options when modal opens or for administrators who can request approvals
  useEffect(() => {
    // Asynchronous loader for tickets
    async function loadTickets() {
      try {
        // Fetch tickets list from backend
        const list = await ticketService.getTickets();
        // Update tickets list state
        setTicketsList(list);
        // Pre-select the first ticket in the list if none currently chosen
        if (list.length > 0 && !createTicketId) {
          setCreateTicketId(String(list[0].id));
        }
      } catch {
        // Fallback to empty list on error
        setTicketsList([]);
      }
    }
    // Only load tickets if the user has administrative privileges
    if (isAdmin) {
      loadTickets();
    }
  }, [isAdmin, createTicketId]);

  // Handles form submission for creating a new operational approval request
  const handleCreateRequest = async (e) => {
    // Prevent default browser form submission refresh
    e.preventDefault();
    // Validate that a ticket is chosen and a reason provided
    if (!createTicketId || !createReason.trim()) {
      toast.warning('Validation Error', 'Please select a ticket and provide a justification.');
      return;
    }
    // Set submitting flag to active
    setSubmitting(true);
    try {
      // Dispatch API request to create the approval record
      const created = await approvalService.createApproval({
        ticket: parseInt(createTicketId, 10), // Parse ticket ID integer
        approver: user.id, // Current user ID or default approver
        reason: createReason.trim(), // Trimmed justification text
      });
      // Prepend newly created approval to local state list
      setApprovals((prev) => [created, ...prev]);
      // Show success toast notification
      toast.success('Approval Requested', `Request submitted for Ticket #${createTicketId}.`);
      // Close creation modal
      setIsCreateOpen(false);
      // Reset reason text
      setCreateReason('');
    } catch (err) {
      // Display error notification on submission failure
      toast.error('Failed to submit approval request', err.message);
    } finally {
      // Clear submitting flag
      setSubmitting(false);
    }
  };

  // Compute summary metrics derived from the loaded approvals list
  const metrics = useMemo(() => {
    // Total count of approval records
    const total = approvals.length;
    // Count of requests currently awaiting review
    const pending = approvals.filter((a) => a.status === APPROVAL_STATUSES.PENDING).length;
    // Count of approved authorizations
    const approved = approvals.filter((a) => a.status === APPROVAL_STATUSES.APPROVED).length;
    return { total, pending, approved };
  }, [approvals]); // Recompute when approvals array changes

  // Opens the decision modal with a target request and action type
  const handleOpenAction = (req, action) => {
    // Set selected request object
    setSelectedReq(req);
    // Set action type (APPROVE, REJECT, REQUEST_INFO, RESUBMIT, VIEW_HISTORY)
    setActionType(action);
    // Clear comment field
    setDecisionComment('');
  };

  // Handles executing the selected approval decision action
  const handleExecuteDecision = async () => {
    // Guard against null request selection
    if (!selectedReq) return;
    // Set submitting flag to true
    setSubmitting(true);
    try {
      let updated;
      // Handle approval action
      if (actionType === 'APPROVE') {
        updated = await approvalService.approve(selectedReq.id, decisionComment, user);
        toast.success('Request Approved', `Authorization granted for Ticket ${selectedReq.ticket_number}.`);
      // Handle rejection action
      } else if (actionType === 'REJECT') {
        updated = await approvalService.reject(selectedReq.id, decisionComment, user);
        toast.error('Request Rejected', `Request #${selectedReq.id} was rejected.`);
      // Handle information request action
      } else if (actionType === 'REQUEST_INFO') {
        // Enforce comment explanation requirement for info requests
        if (!decisionComment.trim()) {
          toast.warning('Comment Required', 'Please explain what information is missing.');
          setSubmitting(false);
          return;
        }
        updated = await approvalService.requestInfo(selectedReq.id, decisionComment, user);
        toast.info('Information Requested', 'Requester has been notified to provide clarification.');
      // Handle resubmission action by requester
      } else if (actionType === 'RESUBMIT') {
        updated = await approvalService.resubmit(
          selectedReq.id,
          { comment: decisionComment },
          user
        );
        toast.success('Request Resubmitted', 'Updated information sent for executive review.');
      }

      // Update local state by replacing the modified approval request
      setApprovals((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      // Close decision modal
      setSelectedReq(null);
    } catch (err) {
      // Display error notification on action failure
      toast.error('Action failed', err.message);
    } finally {
      // Clear submitting state flag
      setSubmitting(false);
    }
  };

  // Table column configuration for approval requests
  const columns = [
    {
      // Column key for ticket number
      key: 'ticket_number',
      // Column header text
      header: 'Ticket ID',
      // Render ticket ID as clickable Link to ticket detail page
      render: (val, row) => (
        <Link
          to={ROUTES.TICKET_DETAIL(row.ticket_id)}
          className="font-mono text-xs font-semibold text-blue-600 hover:underline"
        >
          {val}
        </Link>
      ),
    },
    {
      // Column key for ticket subject and justification
      key: 'ticket_subject',
      // Column header text
      header: 'Subject & Justification',
      // Render subject in bold text with reason underneath
      render: (val, row) => (
        <div className="max-w-md py-0.5">
          <p className="font-semibold text-gray-900 text-xs truncate">{val}</p>
          <p className="text-xs text-gray-500 line-clamp-1 mt-1">{row.reason}</p>
        </div>
      ),
    },
    {
      // Column key for request initiator
      key: 'requested_by',
      // Column header text
      header: 'Requested By',
      // Format user full name or username
      render: (val) => (
        <span className="text-xs text-gray-900 font-medium">
          {val?.first_name ? `${val.first_name} ${val.last_name || ''}` : val?.username}
        </span>
      ),
    },
    {
      // Column key for designated approver
      key: 'approver',
      // Column header text
      header: 'Designated Approver',
      // Format approver full name or username
      render: (val) => (
        <span className="text-xs text-gray-900 font-medium">
          {val?.first_name ? `${val.first_name} ${val.last_name || ''}` : val?.username}
        </span>
      ),
    },
    {
      // Column key for approval status
      key: 'status',
      // Column header text
      header: 'Status',
      // Render color-coded status badge
      render: (val) => <StatusBadge status={val} />,
    },
    {
      // Actions column
      key: 'actions',
      // Column header text
      header: 'Action',
      // Align action buttons to right
      align: 'right',
      // Custom renderer for action buttons based on user permissions and status
      render: (_, row) => {
        // Determine if current user has rights to approve/reject
        const canDecide = isAdmin || (isApprover && row.approver?.id === user?.id);
        // Determine if current user can resubmit supplementary info
        const canResubmit = (isAdmin || row.requested_by?.id === user?.id) && row.status === APPROVAL_STATUSES.INFO_REQUESTED;

        return (
          // Action button group container
          <div className="flex items-center justify-end space-x-1.5">
            {/* View history audit trail button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenAction(row, 'VIEW_HISTORY')}
              title="View History"
            >
              <History className="h-3.5 w-3.5 text-gray-400" />
            </Button>

            {/* Render decision action buttons if authorized and request is awaiting review */}
            {canDecide && (row.status === APPROVAL_STATUSES.PENDING || row.status === APPROVAL_STATUSES.INFO_REQUESTED) && (
              <>
                {/* Approve button */}
                <Button
                  variant="subtle"
                  size="sm"
                  leftIcon={Check}
                  onClick={() => handleOpenAction(row, 'APPROVE')}
                >
                  Approve
                </Button>
                {/* Reject button */}
                <Button
                  variant="dangerOutline"
                  size="sm"
                  leftIcon={X}
                  onClick={() => handleOpenAction(row, 'REJECT')}
                >
                  Reject
                </Button>
                {/* Request info / inquire button for pending requests */}
                {row.status === APPROVAL_STATUSES.PENDING && (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={HelpCircle}
                    onClick={() => handleOpenAction(row, 'REQUEST_INFO')}
                  >
                    Inquire
                  </Button>
                )}
              </>
            )}

            {/* Render Resubmit button if info was requested and user is creator/admin */}
            {canResubmit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenAction(row, 'RESUBMIT')}
              >
                Resubmit
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Render the Approval Workflow page layout
  return (
    // Outer vertical container with standard spacing
    <div className="space-y-5">
      {/* Page Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Main page title */}
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Authorization & Approval Workflows
          </h1>
          {/* Subtitle describing approval functions */}
          <p className="text-xs text-slate-500 mt-0.5">
            Review sensitive operational requests, hardware allocations, and contract policy adjustments.
          </p>
        </div>

        {/* Action buttons: Request Approval (admin only) and Refresh Queue */}
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={Plus}
            >
              Request Approval
            </Button>
          )}
          {/* Refresh queue button */}
          <Button variant="secondary" size="sm" onClick={fetchApprovals} leftIcon={RotateCw}>
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Decision Summary Strip (3 metric cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Pending Review */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pending Review</p>
              <p className="text-base font-semibold text-slate-900 font-mono mt-0.5">{metrics.pending}</p>
            </div>
          </div>
          <span className="text-xs text-amber-600 font-medium">Awaiting Action</span>
        </div>

        {/* Metric 2: Authorized Clearances */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Authorized Clearances</p>
              <p className="text-base font-semibold text-slate-900 font-mono mt-0.5">{metrics.approved}</p>
            </div>
          </div>
          <span className="text-xs text-emerald-600 font-medium">Approved</span>
        </div>

        {/* Metric 3: Total Filings */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <FileCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Filings</p>
              <p className="text-base font-semibold text-slate-900 font-mono mt-0.5">{metrics.total}</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">All Time</span>
        </div>
      </div>

      {/* Segmented Status Filter Bar */}
      <div className="flex items-center justify-between bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1">
          {/* Map over filter tabs to render status pills */}
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.value
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals Data Table */}
      <Table columns={columns} data={approvals} loading={loading} />

      {/* Decision / History Modal: Conditionally rendered when an item is selected */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq} // Dialog open boolean
          onClose={() => setSelectedReq(null)} // Dialog close handler
          title={
            actionType === 'VIEW_HISTORY'
              ? `Approval History — Request #${selectedReq.id}`
              : `${actionType.replace('_', ' ')} Request #${selectedReq.id}`
          } // Dynamic title based on mode
          description={`Ticket: ${selectedReq.ticket_number} • ${selectedReq.ticket_subject}`} // Modal subtitle
          size="md" // Medium dialog size
          footer={
            // Dynamic footer buttons based on whether viewing history or submitting a decision
            actionType === 'VIEW_HISTORY' ? (
              <Button variant="secondary" size="sm" onClick={() => setSelectedReq(null)}>
                Close
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => setSelectedReq(null)} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  variant={actionType === 'REJECT' ? 'danger' : 'primary'}
                  size="sm"
                  loading={submitting}
                  onClick={handleExecuteDecision}
                >
                  Confirm {actionType.replace('_', ' ')}
                </Button>
              </>
            )
          }
        >
          {/* Modal body content: History timeline or Decision commentary form */}
          {actionType === 'VIEW_HISTORY' ? (
            <div className="space-y-4">
              {/* Business justification callout */}
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200/60">
                <strong>Justification:</strong> {selectedReq.reason}
              </div>

              {/* History timeline list */}
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-2">
                {selectedReq.records?.map((rec) => (
                  <div key={rec.id} className="relative pl-6">
                    {/* Timeline bullet dot */}
                    <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-900" />
                    <div className="flex items-center justify-between">
                      {/* Action name */}
                      <span className="text-xs font-semibold text-slate-900">{rec.action}</span>
                      {/* Timestamp formatted to time string */}
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {/* Action comment */}
                    <p className="text-xs text-slate-600 mt-1">{rec.comment}</p>
                    {/* Performer name */}
                    <p className="text-xs text-slate-400 mt-0.5">By {rec.performed_by}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Business justification reminder */}
              <div className="rounded-lg bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-200/60">
                <strong>Business Justification:</strong>
                <p className="mt-1 text-slate-600 leading-relaxed">{selectedReq.reason}</p>
              </div>

              {/* Commentary or explanation textarea */}
              <Textarea
                label={
                  actionType === 'REQUEST_INFO'
                    ? 'Information Required (Required)'
                    : actionType === 'RESUBMIT'
                    ? 'Clarification / Supplementary Notes'
                    : 'Decision Rationale (Optional)'
                }
                placeholder={
                  actionType === 'REQUEST_INFO'
                    ? 'Explain specifically what documentation or details are needed...'
                    : 'Add notes for the audit trail...'
                }
                rows={3}
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
              />
            </div>
          )}
        </Modal>
      )}

      {/* New Approval Request Modal Dialog */}
      <Modal
        isOpen={isCreateOpen} // Dialog visibility boolean
        onClose={() => setIsCreateOpen(false)} // Close handler
        title="Initiate Operational Approval Request" // Modal title
        description="Submit an action or policy exemption requiring executive or managerial authorization." // Subtitle
        size="md" // Medium size
        footer={
          // Footer action buttons
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={handleCreateRequest}
            >
              Submit for Approval
            </Button>
          </>
        }
      >
        {/* New Approval Request Form */}
        <form onSubmit={handleCreateRequest} className="space-y-4">
          {/* Target Ticket Selector */}
          <Select
            label="Target Support Incident / Ticket"
            options={ticketsList.map((t) => ({
              value: String(t.id),
              label: `${t.ticket_number} — ${t.subject}`,
            }))}
            value={createTicketId}
            onChange={(e) => setCreateTicketId(e.target.value)}
          />

          {/* Operational Justification Textarea */}
          <Textarea
            label="Operational Justification & Reason"
            placeholder="Describe why executive authorization is required (e.g., temporary rate limit raise, firewall rule modification, credit invoice)..."
            rows={4}
            required
            value={createReason}
            onChange={(e) => setCreateReason(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}

// Export ApprovalListPage as default export for lazy loading and routing
export default ApprovalListPage;
