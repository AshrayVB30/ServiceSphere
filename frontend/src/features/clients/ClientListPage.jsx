/**
 * @file ClientListPage.jsx
 * @description Multi-tenant Client Organizations management page.
 * Manages onboarding, corporate domain associations for automatic tenant binding,
 * SLA contractual tiers (Enterprise, Premium, Standard), active ticket tallies, and account suspension.
 */

// Import React library along with state, lifecycle, callback, and memoization hooks
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Import Lucide icons for UI actions, search adornment, menu buttons, and metric highlights
import { Plus, Search, MoreVertical, Edit2, Building2, ShieldCheck, Layers } from 'lucide-react';
// Import Button component for standard interactive action triggers
import { Button } from '../../components/common/Button';
// Import Table component for rendering organization directory records
import { Table } from '../../components/common/Table';
// Import Badge component for rendering color-coded tier and status chips
import { Badge } from '../../components/common/Badge';
// Import Modal component for client registration and edit dialogs
import { Modal } from '../../components/common/Modal';
// Import Input component for text, domain, and phone number controls
import { Input } from '../../components/common/Input';
// Import Select component for dropdown selectors and tier filtering
import { Select } from '../../components/common/Select';
// Import Dropdown and DropdownItem components for row-level action context menus
import { Dropdown, DropdownItem } from '../../components/common/Dropdown';
// Import useToast hook for interactive toast alert feedback
import { useToast } from '../../hooks/useToast';
// Import clientService API client for managing tenant organization records
import clientService from '../../services/clientService';

// Define SLA tier selection options with contract coverage details
const TIER_OPTIONS = [
  // Enterprise option offering round-the-clock 24/7 SLA coverage
  { value: 'ENTERPRISE', label: 'Enterprise Tier — 24/7 SLA' },
  // Premium option offering expedited 4-hour SLA targets
  { value: 'PREMIUM', label: 'Premium Tier — 4-hr SLA' },
  // Standard option offering standard business day 8-hour targets
  { value: 'STANDARD', label: 'Standard Tier — 8-hr SLA' },
];

/**
 * ClientListPage Component
 * Renders the tenant directory, metric strip, tier filter controls, and client onboarding/edit modals.
 */
export function ClientListPage() {
  // Initialize toast notifications dispatcher
  const toast = useToast();
  // State storing the list of client organization records
  const [clients, setClients] = useState([]);
  // State tracking data loading lifecycle status
  const [loading, setLoading] = useState(true);
  // State storing keyword search input for filtering organizations
  const [search, setSearch] = useState('');
  // State storing the active SLA tier filter ('ALL', 'ENTERPRISE', 'PREMIUM', 'STANDARD')
  const [tierFilter, setTierFilter] = useState('ALL');
  // State controlling visibility of the client create/edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State storing the client object currently being edited (null for creation mode)
  const [editingClient, setEditingClient] = useState(null);

  // Form field state for organization legal name
  const [formName, setFormName] = useState('');
  // Form field state for corporate email domain (e.g., acme.com)
  const [formDomain, setFormDomain] = useState('');
  // Form field state for primary support contact email
  const [formEmail, setFormEmail] = useState('');
  // Form field state for primary contact phone number
  const [formPhone, setFormPhone] = useState('');
  // Form field state for contract SLA tier (defaults to ENTERPRISE)
  const [formTier, setFormTier] = useState('ENTERPRISE');
  // State tracking whether modal submission is currently being processed
  const [submitting, setSubmitting] = useState(false);

  // Memoized callback function to fetch clients from backend matching search criteria
  const fetchClients = useCallback(async () => {
    // Show table skeleton/spinner
    setLoading(true);
    try {
      // Query backend client service with search query
      const data = await clientService.getClients({ search });
      // Update clients state with response data
      setClients(data);
    } finally {
      // Clear loading state
      setLoading(false);
    }
  }, [search]); // Recreate when search term changes

  // Fetch client organizations on mount and whenever search term changes
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Compute filtered clients list matching selected SLA tier filter
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Filter out records not matching tierFilter unless 'ALL' is selected
      if (tierFilter !== 'ALL' && c.tier !== tierFilter) return false;
      return true;
    });
  }, [clients, tierFilter]); // Recompute when clients list or tier filter updates

  // Compute aggregate statistics for the metrics strip
  const metrics = useMemo(() => {
    // Total count of registered client tenants
    const total = clients.length;
    // Count of enterprise-tier clients with 24/7 SLA coverage
    const enterprise = clients.filter((c) => c.tier === 'ENTERPRISE').length;
    // Count of active clients in good standing
    const active = clients.filter((c) => c.is_active).length;
    return { total, enterprise, active };
  }, [clients]); // Recompute when clients array changes

  // Opens the client onboarding modal with blank form defaults
  const handleOpenCreate = () => {
    // Reset editing target to null
    setEditingClient(null);
    // Clear all form input states
    setFormName('');
    setFormDomain('');
    setFormEmail('');
    setFormPhone('');
    // Default tier to ENTERPRISE
    setFormTier('ENTERPRISE');
    // Open the modal dialog
    setIsModalOpen(true);
  };

  // Opens the edit modal populated with attributes of the selected client
  const handleOpenEdit = (client) => {
    // Set active client being edited
    setEditingClient(client);
    // Populate form fields with existing client attributes
    setFormName(client.name);
    setFormDomain(client.domain);
    setFormEmail(client.contact_email);
    setFormPhone(client.contact_phone || '');
    setFormTier(client.tier);
    // Open the modal dialog
    setIsModalOpen(true);
  };

  // Handles form submission for creating or updating a client organization
  const handleSubmit = async (e) => {
    // Prevent default browser form submit reload
    e.preventDefault();
    // Set submitting flag to show loading spinner on button
    setSubmitting(true);
    try {
      if (editingClient) {
        // Dispatch update request for existing client organization
        const updated = await clientService.updateClient(editingClient.id, {
          name: formName,
          domain: formDomain,
          contact_email: formEmail,
          contact_phone: formPhone,
          tier: formTier,
        });
        // Update local state by replacing the edited client
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        // Show success toast notification
        toast.success('Organization Updated', `${formName} configuration saved.`);
      } else {
        // Dispatch create request to register new client organization
        const created = await clientService.createClient({
          name: formName,
          domain: formDomain,
          contact_email: formEmail,
          contact_phone: formPhone,
          tier: formTier,
        });
        // Prepend new client to existing list
        setClients((prev) => [created, ...prev]);
        // Show registration success toast notification
        toast.success('Client Registered', `${formName} onboarded successfully.`);
      }
      // Close the modal dialog
      setIsModalOpen(false);
    } catch (err) {
      // Display error notification on failure
      toast.error('Action failed', err.message);
    } finally {
      // Reset submitting status flag
      setSubmitting(false);
    }
  };

  // Handles toggling an organization between active and suspended status
  const handleToggleStatus = async (client) => {
    try {
      // Call service method to invert active status
      const updated = await clientService.toggleActive(client.id);
      // Update local state with the returned client status
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      // Display status transition informational toast
      toast.info(
        updated.is_active ? 'Client Activated' : 'Client Deactivated',
        `${client.name} status is now ${updated.is_active ? 'active' : 'inactive'}.`
      );
    } catch (err) {
      // Display error toast if action fails
      toast.error('Failed to update status', err.message);
    }
  };

  // Define client organization table column configurations
  const columns = [
    {
      // Column key for organization name
      key: 'name',
      // Column header title
      header: 'Organization',
      // Custom renderer showing logo avatar badge, company title, and domain name
      render: (val, row) => (
        <div className="flex items-center space-x-3 py-0.5">
          {/* Avatar square showing first two letters of company name */}
          <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0 uppercase tracking-tight">
            {val.slice(0, 2)}
          </div>
          <div>
            {/* Organization legal name in bold font */}
            <p className="font-semibold text-slate-900 text-xs">{val}</p>
            {/* Associated email domain in monospace font */}
            <p className="text-xs text-slate-500 font-mono mt-0.5">{row.domain}</p>
          </div>
        </div>
      ),
    },
    {
      // Column key for SLA support tier
      key: 'tier',
      // Column header title
      header: 'Support Tier',
      // Render color-coded badge based on tier level (purple, blue, or neutral)
      render: (val) => {
        const variant = val === 'ENTERPRISE' ? 'purple' : val === 'PREMIUM' ? 'blue' : 'neutral';
        return <Badge variant={variant}>{val}</Badge>;
      },
    },
    {
      // Column key for primary support contact email
      key: 'contact_email',
      // Column header title
      header: 'Support Contact',
      // Custom renderer showing contact email and phone number
      render: (val, row) => (
        <div>
          <p className="text-xs text-slate-900 font-medium">{val}</p>
          <p className="text-xs text-slate-500 mt-0.5">{row.contact_phone || '—'}</p>
        </div>
      ),
    },
    {
      // Column key for active tickets count
      key: 'active_tickets_count',
      // Column header title
      header: 'Active Tickets',
      // Align numeric column to the right
      align: 'right',
      // Render count inside a clean badge pill
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
          {val || 0}
        </span>
      ),
    },
    {
      // Column key for account active status
      key: 'is_active',
      // Column header title
      header: 'Status',
      // Render green or red dot badge
      render: (val) => (
        <Badge variant={val ? 'success' : 'danger'} dot>
          {val ? 'Active' : 'Suspended'}
        </Badge>
      ),
    },
    {
      // Action menu column
      key: 'actions',
      // Empty header for actions column
      header: '',
      // Align action button to the right edge
      align: 'right',
      // Render context menu dropdown for editing or toggling status
      render: (_, row) => (
        <Dropdown
          align="right"
          trigger={
            // Vertical dots trigger button
            <button type="button" className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        >
          {/* Action item to open edit modal */}
          <DropdownItem icon={Edit2} onClick={() => handleOpenEdit(row)}>
            Edit Details
          </DropdownItem>
          {/* Action item to suspend or reactivate client organization */}
          <DropdownItem
            danger={row.is_active} // Highlight in red when suspending
            onClick={() => handleToggleStatus(row)}
          >
            {row.is_active ? 'Suspend Account' : 'Reactivate Account'}
          </DropdownItem>
        </Dropdown>
      ),
    },
  ];

  // Render the Client Organizations management page layout
  return (
    // Outer vertical container with standard spacing
    <div className="space-y-5">
      {/* Page Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Main title */}
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Client Organizations
          </h1>
          {/* Page subtitle */}
          <p className="text-xs text-slate-500 mt-0.5">
            Manage multi-tenant accounts, corporate domains, and SLA contractual tiers.
          </p>
        </div>

        {/* Primary button to trigger client registration modal */}
        <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={Plus}>
          Register Client
        </Button>
      </div>

      {/* Metric Highlights Strip (3 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Total Client Accounts */}
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

        {/* Metric 2: Enterprise SLA Accounts */}
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

        {/* Metric 3: Active Client Contracts */}
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

      {/* Precision Operations Filter Toolbar (Search and Tier Select) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Search input container */}
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

        {/* Service Tier Dropdown Filter */}
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

      {/* Client Organizations Data Table */}
      <Table columns={columns} data={filteredClients} loading={loading} />

      {/* Register / Edit Client Modal Dialog */}
      <Modal
        isOpen={isModalOpen} // Controls visibility
        onClose={() => setIsModalOpen(false)} // Dismiss handler
        title={editingClient ? 'Edit Organization' : 'Register New Client Organization'} // Context-aware title
        description="Configure tenant profile and assigned service level agreement tier." // Modal subtitle
        size="md" // Medium modal width
        footer={
          // Action button footer
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
        {/* Client Configuration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Name Input */}
          <Input
            label="Company Name"
            placeholder="Company or Organization Name"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          {/* Corporate Domain Input */}
          <Input
            label="Corporate Email Domain"
            placeholder="company.com"
            required
            helperText="Users with this email domain will be linked automatically."
            value={formDomain}
            onChange={(e) => setFormDomain(e.target.value)}
          />

          {/* Contact Details Row */}
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

          {/* SLA Service Tier Select Dropdown */}
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

// Export ClientListPage as default export for lazy loading and routing
export default ClientListPage;
