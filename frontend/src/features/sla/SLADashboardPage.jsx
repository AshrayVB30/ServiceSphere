import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, AlertTriangle, TrendingUp, Edit2 } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';
import { PriorityBadge } from '../../components/feedback/PriorityBadge';
import { useToast } from '../../hooks/useToast';
import slaService from '../../services/slaService';

export function SLADashboardPage() {
  const toast = useToast();
  const [policies, setPolicies] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Policy Modal
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formResponseHours, setFormResponseHours] = useState('');
  const [formResolutionHours, setFormResolutionHours] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [polList, escList] = await Promise.all([
          slaService.getPolicies(),
          slaService.getEscalations(),
        ]);
        setPolicies(polList);
        setEscalations(escList);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleOpenEdit = (policy) => {
    setEditingPolicy(policy);
    setFormResponseHours(policy.response_time_hours);
    setFormResolutionHours(policy.resolution_time_hours);
    setFormDescription(policy.description || '');
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updated = await slaService.updatePolicy(editingPolicy.id, {
        response_time_hours: formResponseHours,
        resolution_time_hours: formResolutionHours,
        description: formDescription,
      });

      setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success('SLA Policy Updated', `${editingPolicy.name} targets saved.`);
      setEditingPolicy(null);
    } catch (err) {
      toast.error('Update failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const policyColumns = [
    {
      key: 'priority',
      header: 'Priority Tier',
      render: (val) => <PriorityBadge priority={val} />,
    },
    {
      key: 'name',
      header: 'Policy Rule Name',
      render: (val, row) => (
        <div className="py-0.5">
          <p className="font-semibold text-gray-900 text-xs">{val}</p>
          <p className="text-xs text-gray-500 mt-1">{row.description}</p>
        </div>
      ),
    },
    {
      key: 'response_time_hours',
      header: 'First Response Target',
      align: 'right',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
          {val} hours
        </span>
      ),
    },
    {
      key: 'resolution_time_hours',
      header: 'Resolution Target',
      align: 'right',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
          {val} hours
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Enforcement',
      render: (val) => (
        <Badge variant={val ? 'success' : 'neutral'} dot>
          {val ? 'Active Enforcement' : 'Paused'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={Edit2}
          onClick={() => handleOpenEdit(row)}
        >
          Adjust Targets
        </Button>
      ),
    },
  ];

  const escalationColumns = [
    {
      key: 'ticket_number',
      header: 'Ticket ID',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-blue-600">
          {val}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Ticket Subject & Client',
      render: (val, row) => (
        <div className="py-0.5">
          <p className="font-semibold text-gray-900 text-xs">{val}</p>
          <p className="text-xs text-gray-500 mt-1">{row.client_name}</p>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Escalation Level',
      render: (val) => (
        <Badge variant={val === 1 ? 'warning' : 'danger'}>
          Tier {val} Alert
        </Badge>
      ),
    },
    {
      key: 'reason',
      header: 'Trigger Condition',
      render: (val) => <span className="text-xs text-gray-600">{val}</span>,
    },
    {
      key: 'escalated_to',
      header: 'Escalated Target',
      render: (val) => <span className="text-xs font-medium text-gray-900">{val}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => (
        <Badge variant={val === 'TRIGGERED' ? 'warning' : 'blue'}>
          {val}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              SLA Governance & Automated Escalation
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Celery Worker Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time compliance monitoring, multi-tier escalation triggers, and policy target adjustments.
          </p>
        </div>
      </div>

      {/* SLA Health Strip (Replaces Generic AI 4-Card Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Compliance Rate</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">97.4%</span>
            <span className="text-xs text-slate-500">goal: &gt;95.0%</span>
          </div>
          <p className="mt-2 text-xs text-emerald-600 font-medium border-t border-slate-100 pt-2">
            +2.4% above contractual requirement
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Governed Tickets</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">92</span>
            <span className="text-xs text-slate-500">tickets monitored</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            100% assigned with live breach timers
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Tier 1 Warnings</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600">2</span>
            <span className="text-xs text-slate-500">near threshold</span>
          </div>
          <p className="mt-2 text-xs text-amber-600 font-medium border-t border-slate-100 pt-2">
            First response target nearing expiration
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Breaches</span>
            <ShieldAlert className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">0</span>
            <span className="text-xs text-slate-500">zero failures</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            Clean record in current 30-day billing cycle
          </p>
        </div>
      </div>

      {/* SLA Policy Matrix */}
      <Card
        title="Priority SLA Policy Thresholds"
        subtitle="Defines maximum allowable response and resolution windows by ticket urgency"
        padding={false}
      >
        <Table columns={policyColumns} data={policies} loading={loading} />
      </Card>

      {/* Automated Escalations Log */}
      <Card
        title="Automated Celery Escalation Queue"
        subtitle="Recent multi-tier breach prevention alerts triggered by background task workers"
        padding={false}
      >
        <Table columns={escalationColumns} data={escalations} />
      </Card>

      {/* Adjust Policy Modal */}
      {editingPolicy && (
        <Modal
          isOpen={!!editingPolicy}
          onClose={() => setEditingPolicy(null)}
          title={`Adjust SLA Policy: ${editingPolicy.name}`}
          description={`Urgency Tier: ${editingPolicy.priority}`}
          size="md"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditingPolicy(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={submitting} onClick={handleSavePolicy}>
                Save Policy Targets
              </Button>
            </>
          }
        >
          <form onSubmit={handleSavePolicy} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Max First Response Hours"
                type="number"
                step="0.5"
                min="0.5"
                required
                value={formResponseHours}
                onChange={(e) => setFormResponseHours(e.target.value)}
              />

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

export default SLADashboardPage;
