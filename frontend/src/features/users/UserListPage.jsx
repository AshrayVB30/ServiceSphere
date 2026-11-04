import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, MoreVertical, Edit2, Users, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Dropdown, DropdownItem } from '../../components/common/Dropdown';
import { useToast } from '../../hooks/useToast';
import userService from '../../services/userService';
import { USER_ROLES, ROLE_LABELS } from '../../constants';

const ROLE_OPTIONS = [
  { value: USER_ROLES.ADMIN, label: 'Administrator — Full System Access' },
  { value: USER_ROLES.SUPPORT_AGENT, label: 'Support Agent — Triage & Resolution' },
  { value: USER_ROLES.CLIENT, label: 'Client User — Organization Portal' },
  { value: USER_ROLES.APPROVER, label: 'Approver — Operational Authorization' },
];

export function UserListPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formRole, setFormRole] = useState(USER_ROLES.CLIENT);
  const [formPhone, setFormPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers({
        search,
        role: roleFilter,
      });
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    setFormRole(USER_ROLES.CLIENT);
    setFormPhone('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormEmail(u.email);
    setFormFirstName(u.first_name);
    setFormLastName(u.last_name);
    setFormRole(u.role);
    setFormPhone(u.phone_number || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const updated = await userService.updateUser(editingUser.id, {
          first_name: formFirstName,
          last_name: formLastName,
          role: formRole,
          phone_number: formPhone,
        });
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        toast.success('User Updated', `Account permissions for ${formUsername} saved.`);
      } else {
        const created = await userService.createUser({
          username: formUsername,
          email: formEmail,
          first_name: formFirstName,
          last_name: formLastName,
          role: formRole,
          phone_number: formPhone,
        });
        setUsers((prev) => [created, ...prev]);
        toast.success('User Provisioned', `Account created for ${formUsername}.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Action failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userObj) => {
    try {
      const updated = await userService.toggleActive(userObj.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.info(
        updated.is_active ? 'Account Reactivated' : 'Account Suspended',
        `${userObj.username} access is now ${updated.is_active ? 'active' : 'suspended'}.`
      );
    } catch (err) {
      toast.error('Failed to change status', err.message);
    }
  };

  const metrics = useMemo(() => {
    const total = users.length;
    const staff = users.filter((u) => u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.SUPPORT_AGENT).length;
    const active = users.filter((u) => u.is_active).length;
    return { total, staff, active };
  }, [users]);

  const columns = [
    {
      key: 'username',
      header: 'User Identity',
      render: (val, row) => (
        <div className="flex items-center space-x-3 py-0.5">
          <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center uppercase shrink-0 ring-2 ring-slate-100">
            {row.first_name?.[0] || val?.[0] || 'U'}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-xs">
              {row.first_name ? `${row.first_name} ${row.last_name || ''}` : val}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'System Role',
      render: (val) => {
        const variant =
          val === USER_ROLES.ADMIN
            ? 'danger'
            : val === USER_ROLES.SUPPORT_AGENT
            ? 'blue'
            : val === USER_ROLES.APPROVER
            ? 'purple'
            : 'neutral';
        return <Badge variant={variant}>{ROLE_LABELS[val] || val}</Badge>;
      },
    },
    {
      key: 'client',
      header: 'Tenant Organization',
      render: (val) => (
        <span className="text-xs text-slate-700 font-medium">
          {val?.name || <em className="text-slate-400 font-normal">Internal Staff</em>}
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
      key: 'last_login',
      header: 'Last Active',
      render: (val) => (
        <span className="text-xs text-slate-500 font-mono">
          {val ? new Date(val).toLocaleDateString() : 'Never'}
        </span>
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
            Edit Permissions
          </DropdownItem>
          <DropdownItem
            danger={row.is_active}
            onClick={() => handleToggleStatus(row)}
          >
            {row.is_active ? 'Suspend User Access' : 'Reactivate User Access'}
          </DropdownItem>
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            User Directory & Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Provision user accounts, assign RBAC security roles, and enforce session policies.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={Plus}>
          Add User
        </Button>
      </div>

      {/* Directory Highlights Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Precision Operations Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
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

      {/* Table */}
      <Table columns={columns} data={users} loading={loading} />

      {/* Create/Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User Permissions' : 'Provision New User'}
        description="Assign role and company affiliation for platform access."
        size="md"
        footer={
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
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username"
              placeholder="jane_doe"
              required
              disabled={!!editingUser}
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
            />
            <Input
              label="Work Email"
              type="email"
              placeholder="jane@company.com"
              required
              disabled={!!editingUser}
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
          </div>

          <Select
            label="Security Role (RBAC)"
            options={ROLE_OPTIONS}
            value={formRole}
            onChange={(e) => setFormRole(e.target.value)}
          />

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

export default UserListPage;

