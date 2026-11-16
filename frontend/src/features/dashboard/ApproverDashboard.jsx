// Import React and hooks for state, effect lifecycle, and memoized callbacks
import React, { useState, useEffect, useCallback } from 'react';
// Import icons from Lucide for decision actions, warnings, and refresh
import { Check, X, HelpCircle, AlertCircle, RotateCw } from 'lucide-react';
// Import common Card surface component
import { Card } from '../../components/common/Card';
// Import common Table component
import { Table } from '../../components/common/Table';
// Import common Button component
import { Button } from '../../components/common/Button';
// Import common Modal dialog component
import { Modal } from '../../components/common/Modal';
// Import common Textarea component
import { Textarea } from '../../components/common/Textarea';
// Import common Skeleton loading placeholder
import { Skeleton } from '../../components/common/Skeleton';
// Import common EmptyState graphic component
import { EmptyState } from '../../components/common/EmptyState';
// Import feedback StatusBadge component
import { StatusBadge } from '../../components/feedback/StatusBadge';
// Import useAuth hook
import { useAuth } from '../../hooks/useAuth';
// Import useToast hook
import { useToast } from '../../hooks/useToast';
// Import approvalService for API operations
import { approvalService } from '../../services/approvalService';
// Import approval status constants
import { APPROVAL_STATUSES } from '../../constants';

/**
 * Executive Approver Dashboard Component
 * Displays authorization queues for policy exceptions, hardware upgrades,
 * and contractual SLA credits retrieved from the Django Approvals REST API.
 */
export function ApproverDashboard() {
  // Extract user identity from authentication context
  const { user } = useAuth();
  // Toast notifications dispatcher
  const toast = useToast();
  // State storing approvals array
  const [approvals, setApprovals] = useState([]);
  // Loading state flag
  const [loading, setLoading] = useState(true);
  // Error state flag
  const [error, setError] = useState(null);

  // Decision Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(''); // 'Approve' | 'Reject' | 'Request Info'
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Memoized fetch function retrieving approval requests
  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await approvalService.getApprovals();
      const list = Array.isArray(data) ? data : data?.results || [];
      setApprovals(list);
    } catch (err) {
      setError(err.message || 'Failed to retrieve pending approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch approvals on initial mount
  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Derived real metrics
  const pendingApprovals = approvals.filter(
    (a) => a.status === APPROVAL_STATUSES.PENDING
  );
  const pendingCount = pendingApprovals.length;
  const approvedCount = approvals.filter(
    (a) => a.status === APPROVAL_STATUSES.APPROVED
  ).length;
  const infoRequestedCount = approvals.filter(
    (a) => a.status === APPROVAL_STATUSES.INFO_REQUESTED
  ).length;

  // Decision modal opener handler
  const handleDecision = (req, action) => {
    setSelectedRequest(req);
    setActionType(action);
    setComment('');
  };

  // Decision submission handler executing approve/reject/requestInfo
  const submitDecision = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      let updated;
      if (actionType === 'Approve') {
        updated = await approvalService.approve(selectedRequest.id, comment, user);
        toast.success(
          'Approval Action Recorded',
          `Request #${selectedRequest.id} has been marked as APPROVED.`
        );
      } else if (actionType === 'Reject') {
        updated = await approvalService.reject(selectedRequest.id, comment, user);
        toast.error(
          'Request Rejected',
          `Request #${selectedRequest.id} has been marked as REJECTED.`
        );
      } else if (actionType === 'Request Info') {
        if (!comment.trim()) {
          toast.warning('Note Required', 'Please explain what clarification is needed.');
          setSubmitting(false);
          return;
        }
        updated = await approvalService.requestInfo(selectedRequest.id, comment, user);
        toast.info(
          'Information Requested',
          `Requester notified to provide clarification on Request #${selectedRequest.id}.`
        );
      }

      setApprovals((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      setSelectedRequest(null);
    } catch (err) {
      toast.error('Action Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading skeleton placeholder layout
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  // Error boundary layout
  if (error) {
    return (
      <div className="p-6 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 space-y-3">
        <div className="flex items-center space-x-2 font-semibold text-sm">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>Approver Portal Unavailable</span>
        </div>
        <p className="text-xs text-rose-700">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchApprovals} leftIcon={RotateCw}>
          Retry Connection
        </Button>
      </div>
    );
  }

  // Render approver dashboard layout
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Manager Authorization Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Executive authorization deck: review sensitive hardware allocations, SLA contract credits, and policy overrides.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          {pendingCount} Decisions Pending Review
        </span>
      </div>

      {/* Decision Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Awaiting decision */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Awaiting Decision</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600">{pendingCount}</span>
            <span className="text-xs text-slate-500">urgent requests</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Pending executive authorization.
          </p>
        </div>

        {/* Card 2: Authorized records */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Authorized Records</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">{approvedCount}</span>
            <span className="text-xs text-slate-500">operations approved</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Audit history preserved in compliance archive.
          </p>
        </div>

        {/* Card 3: Clarification requested */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Clarification Requested</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-blue-600">{infoRequestedCount}</span>
            <span className="text-xs text-slate-500">pending response</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Awaiting additional diagnostic context from agent.
          </p>
        </div>
      </div>

      {/* Pending authorization table */}
      <Card
        title="Pending Authorization Queue"
        subtitle="Policy exceptions and resource requests requiring executive sign-off"
        padding={false}
      >
        {pendingApprovals.length === 0 ? (
          <EmptyState
            title="Authorization Queue Clear"
            description="No pending approval requests require your review at this time."
          />
        ) : (
          <Table
            columns={[
              {
                key: 'ticket_number',
                header: 'Ticket ID',
                render: (val, row) => (
                  <span className="font-mono text-xs font-semibold text-blue-600">
                    {val || `TCK-${row.ticket || row.ticket_id}`}
                  </span>
                ),
              },
              {
                key: 'requested_by_username',
                header: 'Submitted By',
                render: (val, row) => (
                  <span className="text-xs font-medium text-slate-900">
                    {val || row.requested_by?.username || 'Staff Agent'}
                  </span>
                ),
              },
              {
                key: 'reason',
                header: 'Business Rationale',
                render: (val) => <span className="text-xs text-slate-600 line-clamp-1 max-w-sm">{val}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (val) => <StatusBadge status={val} />,
              },
              {
                key: 'actions',
                header: 'Executive Decision',
                align: 'right',
                render: (_, row) => (
                  <div className="flex items-center justify-end space-x-1.5">
                    <Button
                      variant="subtle"
                      size="sm"
                      leftIcon={Check}
                      onClick={() => handleDecision(row, 'Approve')}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="dangerOutline"
                      size="sm"
                      leftIcon={X}
                      onClick={() => handleDecision(row, 'Reject')}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={HelpCircle}
                      onClick={() => handleDecision(row, 'Request Info')}
                    >
                      Inquire
                    </Button>
                  </div>
                ),
              },
            ]}
            data={pendingApprovals}
          />
        )}
      </Card>

      {/* Decision Comment Modal Dialog */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title={`${actionType} Request #${selectedRequest?.id}`}
        description={`Ticket: ${selectedRequest?.ticket_number || selectedRequest?.ticket} • Submitted by: ${selectedRequest?.requested_by_username || 'Staff'}`}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={submitting}
              onClick={() => setSelectedRequest(null)}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'Reject' ? 'danger' : 'primary'}
              size="sm"
              loading={submitting}
              onClick={submitDecision}
            >
              Confirm {actionType}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-gray-50 p-3.5 text-xs text-gray-700 border border-gray-100">
            <strong>Rationale:</strong> {selectedRequest?.reason}
          </div>

          <Textarea
            label="Decision Note / Justification"
            placeholder="Add comments or instructions for the requesting agent..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}

// Export ApproverDashboard as default export
export default ApproverDashboard;
