import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, X, HelpCircle, History, RotateCw, FileCheck, Clock, CheckCircle2, Plus } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Modal } from '../../components/common/Modal';
import { Textarea } from '../../components/common/Textarea';
import { Select } from '../../components/common/Select';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import approvalService from '../../services/approvalService';
import ticketService from '../../services/ticketService';
import { APPROVAL_STATUSES, ROUTES } from '../../constants';
import { Link } from 'react-router-dom';

const STATUS_TABS = [
  { label: 'All Requests', value: 'ALL' },
  { label: 'Pending Review', value: APPROVAL_STATUSES.PENDING },
  { label: 'Approved', value: APPROVAL_STATUSES.APPROVED },
  { label: 'Rejected', value: APPROVAL_STATUSES.REJECTED },
  { label: 'Info Requested', value: APPROVAL_STATUSES.INFO_REQUESTED },
];

export function ApprovalListPage() {
  const { user, isAdmin, isApprover } = useAuth();
  const toast = useToast();

  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  // Decision Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState(''); // 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'RESUBMIT' | 'VIEW_HISTORY'
  const [decisionComment, setDecisionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New Approval Request State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [ticketsList, setTicketsList] = useState([]);
  const [createTicketId, setCreateTicketId] = useState('');
  const [createReason, setCreateReason] = useState('');

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await approvalService.getApprovals({ status: activeTab });
      setApprovals(data);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Load tickets for the "Request Approval" modal
  useEffect(() => {
    async function loadTickets() {
      try {
        const list = await ticketService.getTickets();
        setTicketsList(list);
        if (list.length > 0 && !createTicketId) {
          setCreateTicketId(String(list[0].id));
        }
      } catch {
        setTicketsList([]);
      }
    }
    if (isAdmin) {
      loadTickets();
    }
  }, [isAdmin, createTicketId]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!createTicketId || !createReason.trim()) {
      toast.warning('Validation Error', 'Please select a ticket and provide a justification.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await approvalService.createApproval({
        ticket: parseInt(createTicketId, 10),
        approver: user.id,
        reason: createReason.trim(),
      });
      setApprovals((prev) => [created, ...prev]);
      toast.success('Approval Requested', `Request submitted for Ticket #${createTicketId}.`);
      setIsCreateOpen(false);
      setCreateReason('');
    } catch (err) {
      toast.error('Failed to submit approval request', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const metrics = useMemo(() => {
    const total = approvals.length;
    const pending = approvals.filter((a) => a.status === APPROVAL_STATUSES.PENDING).length;
    const approved = approvals.filter((a) => a.status === APPROVAL_STATUSES.APPROVED).length;
    return { total, pending, approved };
  }, [approvals]);

  const handleOpenAction = (req, action) => {
    setSelectedReq(req);
    setActionType(action);
    setDecisionComment('');
  };

  const handleExecuteDecision = async () => {
    if (!selectedReq) return;
    setSubmitting(true);
    try {
      let updated;
      if (actionType === 'APPROVE') {
        updated = await approvalService.approve(selectedReq.id, decisionComment, user);
        toast.success('Request Approved', `Authorization granted for Ticket ${selectedReq.ticket_number}.`);
      } else if (actionType === 'REJECT') {
        updated = await approvalService.reject(selectedReq.id, decisionComment, user);
        toast.error('Request Rejected', `Request #${selectedReq.id} was rejected.`);
      } else if (actionType === 'REQUEST_INFO') {
        if (!decisionComment.trim()) {
          toast.warning('Comment Required', 'Please explain what information is missing.');
          setSubmitting(false);
          return;
        }
        updated = await approvalService.requestInfo(selectedReq.id, decisionComment, user);
        toast.info('Information Requested', 'Requester has been notified to provide clarification.');
      } else if (actionType === 'RESUBMIT') {
        updated = await approvalService.resubmit(
          selectedReq.id,
          { comment: decisionComment },
          user
        );
        toast.success('Request Resubmitted', 'Updated information sent for executive review.');
      }

      setApprovals((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setSelectedReq(null);
    } catch (err) {
      toast.error('Action failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'ticket_number',
      header: 'Ticket ID',
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
      key: 'ticket_subject',
      header: 'Subject & Justification',
      render: (val, row) => (
        <div className="max-w-md py-0.5">
          <p className="font-semibold text-gray-900 text-xs truncate">{val}</p>
          <p className="text-xs text-gray-500 line-clamp-1 mt-1">{row.reason}</p>
        </div>
      ),
    },
    {
      key: 'requested_by',
      header: 'Requested By',
      render: (val) => (
        <span className="text-xs text-gray-900 font-medium">
          {val?.first_name ? `${val.first_name} ${val.last_name || ''}` : val?.username}
        </span>
      ),
    },
    {
      key: 'approver',
      header: 'Designated Approver',
      render: (val) => (
        <span className="text-xs text-gray-900 font-medium">
          {val?.first_name ? `${val.first_name} ${val.last_name || ''}` : val?.username}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (_, row) => {
        const canDecide = isAdmin || (isApprover && row.approver?.id === user?.id);
        const canResubmit = (isAdmin || row.requested_by?.id === user?.id) && row.status === APPROVAL_STATUSES.INFO_REQUESTED;

        return (
          <div className="flex items-center justify-end space-x-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenAction(row, 'VIEW_HISTORY')}
              title="View History"
            >
              <History className="h-3.5 w-3.5 text-gray-400" />
            </Button>

            {canDecide && (row.status === APPROVAL_STATUSES.PENDING || row.status === APPROVAL_STATUSES.INFO_REQUESTED) && (
              <>
                <Button
                  variant="subtle"
                  size="sm"
                  leftIcon={Check}
                  onClick={() => handleOpenAction(row, 'APPROVE')}
                >
                  Approve
                </Button>
                <Button
                  variant="dangerOutline"
                  size="sm"
                  leftIcon={X}
                  onClick={() => handleOpenAction(row, 'REJECT')}
                >
                  Reject
                </Button>
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

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Authorization & Approval Workflows
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review sensitive operational requests, hardware allocations, and contract policy adjustments.
          </p>
        </div>

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
          <Button variant="secondary" size="sm" onClick={fetchApprovals} leftIcon={RotateCw}>
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Decision Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Table */}
      <Table columns={columns} data={approvals} loading={loading} />

      {/* Decision / History Modal */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={
            actionType === 'VIEW_HISTORY'
              ? `Approval History — Request #${selectedReq.id}`
              : `${actionType.replace('_', ' ')} Request #${selectedReq.id}`
          }
          description={`Ticket: ${selectedReq.ticket_number} • ${selectedReq.ticket_subject}`}
          size="md"
          footer={
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
          {actionType === 'VIEW_HISTORY' ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200/60">
                <strong>Justification:</strong> {selectedReq.reason}
              </div>

              <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-2">
                {selectedReq.records?.map((rec) => (
                  <div key={rec.id} className="relative pl-6">
                    <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-900" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">{rec.action}</span>
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{rec.comment}</p>
                    <p className="text-xs text-slate-400 mt-0.5">By {rec.performed_by}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-200/60">
                <strong>Business Justification:</strong>
                <p className="mt-1 text-slate-600 leading-relaxed">{selectedReq.reason}</p>
              </div>

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

      {/* New Approval Request Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Initiate Operational Approval Request"
        description="Submit an action or policy exemption requiring executive or managerial authorization."
        size="md"
        footer={
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
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <Select
            label="Target Support Incident / Ticket"
            options={ticketsList.map((t) => ({
              value: String(t.id),
              label: `${t.ticket_number} — ${t.subject}`,
            }))}
            value={createTicketId}
            onChange={(e) => setCreateTicketId(e.target.value)}
          />

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

export default ApprovalListPage;
