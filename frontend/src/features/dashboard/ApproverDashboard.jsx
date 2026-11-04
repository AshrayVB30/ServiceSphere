import React, { useState } from 'react';
import { Check, X, HelpCircle } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Textarea } from '../../components/common/Textarea';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { useToast } from '../../hooks/useToast';

const sampleApprovals = [
  {
    id: 1,
    ticket_id: 'TCK-8812',
    requested_by: 'Sarah Connor (Support Agent)',
    reason: 'Hardware server tier upgrade request for database clustering in production environment.',
    status: 'PENDING',
    created_at: '2 hours ago',
  },
  {
    id: 2,
    ticket_id: 'TCK-8809',
    requested_by: 'Alex Vance (Administrator)',
    reason: 'Service level agreement penalty credit adjustment authorization for billing cycle.',
    status: 'INFO_REQUESTED',
    created_at: '1 day ago',
  },
];

export function ApproverDashboard() {
  const toast = useToast();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState('');
  const [comment, setComment] = useState('');

  const handleDecision = (req, action) => {
    setSelectedRequest(req);
    setActionType(action);
    setComment('');
  };

  const submitDecision = () => {
    toast.success(
      'Approval Action Recorded',
      `Request #${selectedRequest.id} has been marked as ${actionType.toUpperCase()}.`
    );
    setSelectedRequest(null);
  };

  return (
    <div className="space-y-6">
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
          2 Decisions Pending Review
        </span>
      </div>

      {/* Decision Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Awaiting Decision</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600">2</span>
            <span className="text-xs text-slate-500">urgent requests</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Average decision turnaround: <strong className="text-slate-800">45 minutes</strong>.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Authorized This Month</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">14</span>
            <span className="text-xs text-slate-500">operations approved</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Compliance adherence rate: <strong className="text-slate-800">100%</strong>.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-slate-500">Clarification Requested</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-blue-600">1</span>
            <span className="text-xs text-slate-500">pending response</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Additional diagnostic context requested from agent.
          </p>
        </div>
      </div>

      <Card
        title="Pending Authorization Queue"
        subtitle="Policy exceptions and resource requests requiring executive sign-off"
        padding={false}
      >
        <Table
          columns={[
            {
              key: 'ticket_id',
              header: 'Ticket ID',
              render: (val) => (
                <span className="font-mono text-xs font-semibold text-blue-600">
                  {val}
                </span>
              ),
            },
            {
              key: 'requested_by',
              header: 'Submitted By',
              render: (val) => <span className="text-xs font-medium text-slate-900">{val}</span>,
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
          data={sampleApprovals}
        />
      </Card>

      {/* Decision Comment Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title={`${actionType} Request #${selectedRequest?.id}`}
        description={`Ticket: ${selectedRequest?.ticket_id} • Requested by: ${selectedRequest?.requested_by}`}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedRequest(null)}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'Reject' ? 'danger' : 'primary'}
              size="sm"
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

export default ApproverDashboard;

