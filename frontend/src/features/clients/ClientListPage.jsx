import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, MoreVertical, Edit2, Building2, ShieldCheck, Layers } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Dropdown, DropdownItem } from '../../components/common/Dropdown';
import { useToast } from '../../hooks/useToast';
import clientService from '../../services/clientService';

const TIER_OPTIONS = [
  { value: 'ENTERPRISE', label: 'Enterprise Tier — 24/7 SLA' },
  { value: 'PREMIUM', label: 'Premium Tier — 4-hr SLA' },
  { value: 'STANDARD', label: 'Standard Tier — 8-hr SLA' },
];

export function ClientListPage() {
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTier, setFormTier] = useState('ENTERPRISE');
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientService.getClients({ search });
      setClients(data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (tierFilter !== 'ALL' && c.tier !== tierFilter) return false;
      return true;
    });
  }, [clients, tierFilter]);

  const metrics = useMemo(() => {
    const total = clients.length;
    const enterprise = clients.filter((c) => c.tier === 'ENTERPRISE').length;
    const active = clients.filter((c) => c.is_active).length;
    return { total, enterprise, active };
  }, [clients]);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormName('');
    setFormDomain('');
    setFormEmail('');
    setFormPhone('');
    setFormTier('ENTERPRISE');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormDomain(client.domain);
    setFormEmail(client.contact_email);
    setFormPhone(client.contact_phone || '');
    setFormTier(client.tier);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingClient) {
        const updated = await clientService.updateClient(editingClient.id, {
          name: formName,
          domain: formDomain,
          contact_email: formEmail,
          contact_phone: formPhone,
          tier: formTier,
        });
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success('Organization Updated', `${formName} configuration saved.`);
      } else {
        const created = await clientService.createClient({
          name: formName,
          domain: formDomain,
          contact_email: formEmail,
          contact_phone: formPhone,
          tier: formTier,
        });
        setClients((prev) => [created, ...prev]);
        toast.success('Client Registered', `${formName} onboarded successfully.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Action failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (client) => {
    try {
      const updated = await clientService.toggleActive(client.id);
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.info(
        updated.is_active ? 'Client Activated' : 'Client Deactivated',
        `${client.name} status is now ${updated.is_active ? 'active' : 'inactive'}.`
      );
    } catch (err) {
      toast.error('Failed to update status', err.message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Organization',
      render: (val, row) => (
        <div className="flex items-center space-x-3 py-0.5">
          <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0 uppercase tracking-tight">
            {val.slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-xs">{val}</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{row.domain}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Support Tier',
      render: (val) => {
        const variant = val === 'ENTERPRISE' ? 'purple' : val === 'PREMIUM' ? 'blue' : 'neutral';
        return <Badge variant={variant}>{val}</Badge>;
      },
    },
    {
      key: 'contact_email',
      header: 'Support Contact',
      render: (val, row) => (
        <div>
          <p className="text-xs text-slate-900 font-medium">{val}</p>
          <p className="text-xs text-slate-500 mt-0.5">{row.contact_phone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'active_tickets_count',
      header: 'Active Tickets',
      align: 'right',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
          {val || 0}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (val) => (
        <Badge variant={val ? 'success' : 'danger'} dot>
          {val ? 'Active' : 'Suspended'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (_, row) => (
        <Dropdown
          align="right"
          trigger={
            <button type="button" className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem icon={Edit2} onClick={() => handleOpenEdit(row)}>
            Edit Details
          </DropdownItem>
          <DropdownItem
            danger={row.is_active}
            onClick={() => handleToggleStatus(row)}
          >
            {row.is_active ? 'Suspend Account' : 'Reactivate Account'}
          </DropdownItem>
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header with Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Client Organizations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage multi-tenant accounts, corporate domains, and SLA contractual tiers.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={Plus}>
          Register Client
        </Button>
      </div>

      {/* Metric Highlights Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Accounts</p>
              <p className="text-base font-semibold text-slate-900 font-mono mt-0.5">{metrics.total}</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">Tenants</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Enterprise SLA</p>
              <p className="text-base font-semibold text-slate-900 font-mono mt-0.5">{metrics.enterprise}</p>
            </div>
          </div>
          <span className="text-xs text-purple-600 font-medium">24/7 Coverage</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Contracts</p>
              <p className="text-base font-semibold text-slate-900 font-mono mt-0.5">{metrics.active}</p>
            </div>
          </div>
          <span className="text-xs text-emerald-600 font-medium">In Good Standing</span>
        </div>
      </div>

      {/* Precision Operations Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company, domain, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:outline-none transition-colors"
          />
        </div>

        <div className="w-full sm:w-52">
          <Select
            options={[
              { value: 'ALL', label: 'All Service Tiers' },
              { value: 'ENTERPRISE', label: 'Enterprise (24/7)' },
              { value: 'PREMIUM', label: 'Premium (4h)' },
              { value: 'STANDARD', label: 'Standard (8h)' },
            ]}
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Table columns={columns} data={filteredClients} loading={loading} />

      {/* Register/Edit Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Edit Organization' : 'Register New Client Organization'}
        description="Configure tenant profile and assigned service level agreement tier."
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={submitting} onClick={handleSubmit}>
              {editingClient ? 'Save Changes' : 'Register Organization'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Company Name"
            placeholder="Company or Organization Name"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <Input
            label="Corporate Email Domain"
            placeholder="company.com"
            required
            helperText="Users with this email domain will be linked automatically."
            value={formDomain}
            onChange={(e) => setFormDomain(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Support Contact Email"
              type="email"
              placeholder="contact@company.com"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />

            <Input
              label="Contact Phone"
              placeholder="+1 (555) 000-0000"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
          </div>

          <Select
            label="SLA Service Tier"
            options={TIER_OPTIONS}
            value={formTier}
            onChange={(e) => setFormTier(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}

export default ClientListPage;

