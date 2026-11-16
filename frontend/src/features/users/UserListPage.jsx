/**
 * @file UserListPage.jsx
 * @description User Directory and Access Control administration page.
 * Manages user provisioning, role-based access control (RBAC), account activation/suspension,
 * and live synchronization with backend workload analytics.
 */

// Import React core library and essential hooks for state, side effects, callbacks, and memoization
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Import Lucide icons for UI triggers, search decoration, action menus, and visual status cards
import { Plus, Search, MoreVertical, Edit2, Users, ShieldCheck, UserCheck } from 'lucide-react';
// Import Button component for standard interactive action triggers
import { Button } from '../../components/common/Button';
// Import Table component for rendering tabular user directory records
import { Table } from '../../components/common/Table';
// Import Badge component for rendering color-coded role tags and active/suspended indicators
import { Badge } from '../../components/common/Badge';
// Import Modal component for create and edit user permission dialogs
import { Modal } from '../../components/common/Modal';
// Import Input component for text and email form controls
import { Input } from '../../components/common/Input';
// Import Select component for role dropdown selectors and table filtering
import { Select } from '../../components/common/Select';
// Import Dropdown and DropdownItem components for row-level action context menus
import { Dropdown, DropdownItem } from '../../components/common/Dropdown';
// Import useToast hook for interactive success and error notification banners
import { useToast } from '../../hooks/useToast';
// Import userService API client for querying, provisioning, and updating user accounts
import userService from '../../services/userService';
// Import system-wide user role constants and display label mappings
import { USER_ROLES, ROLE_LABELS } from '../../constants';

// Define predefined role options list used in the user provisioning/editing dropdown
const ROLE_OPTIONS = [
  // Administrator option granting unrestricted system privileges
  { value: USER_ROLES.ADMIN, label: 'Administrator — Full System Access' },
  // Support agent option granting ticket triage, updates, and resolution capabilities
  { value: USER_ROLES.SUPPORT_AGENT, label: 'Support Agent — Triage & Resolution' },
  // Client user option granting organization-scoped ticket submission and view access
  { value: USER_ROLES.CLIENT, label: 'Client User — Organization Portal' },
  // Approver option granting authorization and rejection rights for critical ticket steps
  { value: USER_ROLES.APPROVER, label: 'Approver — Operational Authorization' },
];

/**
 * UserListPage Component
 * Renders the administrative user directory, metrics overview, search/filter tools,
 * and dialogs for adding and editing user profiles.
 */
export function UserListPage() {
  // Initialize toast notifications dispatcher for operational feedback
  const toast = useToast();
  // State storing the list of user records returned by the API
  const [users, setUsers] = useState([]);
  // State tracking network query loading status
  const [loading, setLoading] = useState(true);
  // State storing the user search keyword filter input
  const [search, setSearch] = useState('');
  // State storing the currently selected role filter ('ALL' or specific role)
  const [roleFilter, setRoleFilter] = useState('ALL');

  // State controlling visibility of the user creation / editing modal dialog
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State storing the user currently being edited (null for new user creation)
  const [editingUser, setEditingUser] = useState(null);

  // Form field state for the unique login username
  const [formUsername, setFormUsername] = useState('');
  // Form field state for user contact email address
  const [formEmail, setFormEmail] = useState('');
  // Form field state for user given first name
  const [formFirstName, setFormFirstName] = useState('');
  // Form field state for user family surname
  const [formLastName, setFormLastName] = useState('');
  // Form field state for assigned RBAC role (defaults to CLIENT)
  const [formRole, setFormRole] = useState(USER_ROLES.CLIENT);
  // Form field state for user telephone contact number
  const [formPhone, setFormPhone] = useState('');
  // State indicating whether a modal form submission is in progress
  const [submitting, setSubmitting] = useState(false);

  // Memoized callback function to fetch users matching the current search keyword and role filter
  const fetchUsers = useCallback(async () => {
    // Turn on loading skeleton/spinner
    setLoading(true);
    try {
      // Query users endpoint with search and role parameters
      const data = await userService.getUsers({
        search,
        role: roleFilter,
      });
      // Update state with fetched user array
      setUsers(data);
    } finally {
      // Turn off loading indicator once request completes or fails
      setLoading(false);
    }
  }, [search, roleFilter]); // Re-create callback when search keyword or role filter changes

  // Fetch users on component mount and whenever the memoized fetchUsers function dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handler to open the modal dialog in creation mode with cleared form inputs
  const handleOpenCreate = () => {
    // Clear any active edit target
    setEditingUser(null);
    // Reset form inputs to blank defaults
    setFormUsername('');
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    // Default new user to CLIENT role
    setFormRole(USER_ROLES.CLIENT);
    setFormPhone('');
    // Open the modal dialog
    setIsModalOpen(true);
  };

  // Handler to open the modal dialog in edit mode populated with selected user attributes
  const handleOpenEdit = (u) => {
    // Set active user reference for updating
    setEditingUser(u);
    // Populate form inputs with existing user values
    setFormUsername(u.username);
    setFormEmail(u.email);
    setFormFirstName(u.first_name);
    setFormLastName(u.last_name);
    setFormRole(u.role);
    setFormPhone(u.phone_number || '');
    // Open modal dialog
    setIsModalOpen(true);
  };

  // Handler for submitting the user provisioning or update form
  const handleSubmit = async (e) => {
    // Prevent default browser form post submission
    e.preventDefault();
    // Enable submitting spinner and disable buttons
    setSubmitting(true);
    try {
      // Check if updating an existing user or creating a new one
      if (editingUser) {
        // Dispatch update request to backend with modified fields
        const updated = await userService.updateUser(editingUser.id, {
          first_name: formFirstName,
          last_name: formLastName,
          role: formRole,
          phone_number: formPhone,
        });
        // Replace updated record in local state
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        // Display success toast notification
        toast.success('User Updated', `Account permissions for ${formUsername} saved.`);
      } else {
        // Dispatch create request to backend for new account
        const created = await userService.createUser({
          username: formUsername,
          email: formEmail,
          first_name: formFirstName,
          last_name: formLastName,
          role: formRole,
          phone_number: formPhone,
        });
        // Prepend new user record to local users state
        setUsers((prev) => [created, ...prev]);
        // Display provisioning success toast notification
        toast.success('User Provisioned', `Account created for ${formUsername}.`);
      }
      // Close modal on successful operation
      setIsModalOpen(false);
    } catch (err) {
      // Display error notification on failure
      toast.error('Action failed', err.message);
    } finally {
      // Reset submitting status flag
      setSubmitting(false);
    }
  };

  // Handler to toggle active/suspended status of a user account
  const handleToggleStatus = async (userObj) => {
    try {
      // Call service to flip user's is_active status
      const updated = await userService.toggleActive(userObj.id);
      // Update local state with the returned status
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      // Display informational toast describing the status transition
      toast.info(
        updated.is_active ? 'Account Reactivated' : 'Account Suspended',
        `${userObj.username} access is now ${updated.is_active ? 'active' : 'suspended'}.`
      );
    } catch (err) {
      // Display error toast if action fails
      toast.error('Failed to change status', err.message);
    }
  };

  // Compute summary directory metrics derived from current user state
  const metrics = useMemo(() => {
    // Total count of users returned
    const total = users.length;
    // Count of internal operational staff (admins + support agents)
    const staff = users.filter((u) => u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.SUPPORT_AGENT).length;
    // Count of currently active (non-suspended) user accounts
    const active = users.filter((u) => u.is_active).length;
    return { total, staff, active };
  }, [users]); // Recompute when users collection updates

  // Define table column configurations
  const columns = [
    {
      // Column key for user identity
      key: 'username',
      // Column title header
      header: 'User Identity',
      // Custom renderer showing avatar initial, full name, and email address
      render: (val, row) => (
        <div className="flex items-center space-x-3 py-0.5">
          {/* Circular avatar badge with initial letter */}
          <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center uppercase shrink-0 ring-2 ring-slate-100">
            {row.first_name?.[0] || val?.[0] || 'U'}
          </div>
          <div>
            {/* Display full name or username */}
            <p className="font-semibold text-slate-900 text-xs">
              {row.first_name ? `${row.first_name} ${row.last_name || ''}` : val}
            </p>
            {/* Display email in subtle gray subtext */}
            <p className="text-xs text-slate-500 mt-0.5">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      // Column key for system role
      key: 'role',
      // Column title header
      header: 'System Role',
      // Custom renderer displaying role badge with semantic color variant
      render: (val) => {
        const variant =
          val === USER_ROLES.ADMIN
            ? 'danger' // Red badge for administrators
            : val === USER_ROLES.SUPPORT_AGENT
            ? 'blue' // Blue badge for support agents
            : val === USER_ROLES.APPROVER
            ? 'purple' // Purple badge for approvers
            : 'neutral'; // Neutral gray badge for clients
        return <Badge variant={variant}>{ROLE_LABELS[val] || val}</Badge>;
      },
    },
    {
      // Column key for tenant organization affiliation
      key: 'client',
      // Column title header
      header: 'Tenant Organization',
      // Custom renderer displaying company name or 'Internal Staff' placeholder
      render: (val) => (
        <span className="text-xs text-slate-700 font-medium">
          {val?.name || <em className="text-slate-400 font-normal">Internal Staff</em>}
        </span>
      ),
    },
    {
      // Column key for account status (active vs suspended)
      key: 'is_active',
      // Column title header
      header: 'Status',
      // Custom renderer showing green or red dot status badge
      render: (val) => (
        <Badge variant={val ? 'success' : 'danger'} dot>
          {val ? 'Active' : 'Suspended'}
        </Badge>
      ),
    },
    {
      // Column key for last login timestamp
      key: 'last_login',
      // Column title header
      header: 'Last Active',
      // Custom renderer formatting timestamp into localized date string
      render: (val) => (
        <span className="text-xs text-slate-500 font-mono">
          {val ? new Date(val).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      // Column key for action dropdown menu
      key: 'actions',
      // Empty header for action column
      header: '',
      // Align action button to the right edge
      align: 'right',
      // Custom renderer displaying three-dots context menu with edit and toggle actions
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
          {/* Dropdown action to edit user permissions */}
          <DropdownItem icon={Edit2} onClick={() => handleOpenEdit(row)}>
            Edit Permissions
          </DropdownItem>
          {/* Dropdown action to suspend or reactivate user access */}
          <DropdownItem
            danger={row.is_active} // Red text if suspending active user
            onClick={() => handleToggleStatus(row)}
          >
            {row.is_active ? 'Suspend User Access' : 'Reactivate User Access'}
          </DropdownItem>
        </Dropdown>
      ),
    },
  ];

  // Render the User Directory page layout
  return (
    // Outer container with vertical spacing
    <div className="space-y-5">
      {/* Page Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Main directory title */}
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            User Directory & Access Control
          </h1>
          {/* Subtitle describing directory capabilities */}
          <p className="text-xs text-slate-500 mt-0.5">
            Provision user accounts, assign RBAC security roles, and enforce session policies.
          </p>
        </div>

        {/* Action button to open provisioning modal */}
        <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={Plus}>
          Add User
        </Button>
      </div>

      {/* Informative Operational Notice Banner */}
      <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-3.5 flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <span className="font-semibold text-blue-950">Live Operational Staff Directory:</span>
          <p className="text-blue-800/90 leading-relaxed">
            Support specialists are dynamically synchronized with backend workload analytics. Administrative onboarding and role grants are governed through Django Admin.
          </p>
        </div>
      </div>

      {/* Directory Highlights Strip (3 metric cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Total Provisioned Accounts */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Provisioned</p>
              <p className="text-base font-semibold text-slate-900 font-mono mt-0.5">{metrics.total}</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">Accounts</span>
        </div>

        {/* Metric 2: Internal Operations Staff */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Internal Operations</p>
              <p className="text-base font-semibold text-slate-900 font-mono mt-0.5">{metrics.staff}</p>
            </div>
          </div>
          <span className="text-xs text-blue-600 font-medium">Staff & Admins</span>
        </div>

        {/* Metric 3: Active Authorized Accounts */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Status</p>
              <p className="text-base font-semibold text-slate-900 font-mono mt-0.5">{metrics.active}</p>
            </div>
          </div>
          <span className="text-xs text-emerald-600 font-medium">Authorized</span>
        </div>
      </div>

      {/* Operations Filter Toolbar (Search and Role dropdown) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Search Input Container */}
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Role Filter Select */}
        <div className="w-full sm:w-56">
          <Select
            options={[
              { value: 'ALL', label: 'All Roles' },
              { value: USER_ROLES.ADMIN, label: 'Administrators' },
              { value: USER_ROLES.SUPPORT_AGENT, label: 'Support Agents' },
              { value: USER_ROLES.CLIENT, label: 'Client Users' },
              { value: USER_ROLES.APPROVER, label: 'Approvers' },
            ]}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Users Data Table */}
      <Table columns={columns} data={users} loading={loading} />

      {/* Create / Edit User Modal Dialog */}
      <Modal
        isOpen={isModalOpen} // Controls dialog open status
        onClose={() => setIsModalOpen(false)} // Dismiss handler
        title={editingUser ? 'Edit User Permissions' : 'Provision New User'} // Context-aware title
        description="Assign role and company affiliation for platform access." // Modal subtitle
        size="md" // Medium sizing
        footer={
          // Action button footer
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={submitting} onClick={handleSubmit}>
              {editingUser ? 'Update Account' : 'Provision User'}
            </Button>
          </>
        }
      >
        {/* User Provisioning Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First and Last Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="Jane"
              required
              value={formFirstName}
              onChange={(e) => setFormFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              value={formLastName}
              onChange={(e) => setFormLastName(e.target.value)}
            />
          </div>

          {/* Username and Email row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username"
              placeholder="jane_doe"
              required
              disabled={!!editingUser} // Disallow editing username after creation
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
            />
            <Input
              label="Work Email"
              type="email"
              placeholder="jane@company.com"
              required
              disabled={!!editingUser} // Disallow editing email after creation
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
          </div>

          {/* Security Role Selector */}
          <Select
            label="Security Role (RBAC)"
            options={ROLE_OPTIONS}
            value={formRole}
            onChange={(e) => setFormRole(e.target.value)}
          />

          {/* Optional Phone Number Input */}
          <Input
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}

// Export UserListPage as default export for lazy loading and routing
export default UserListPage;
