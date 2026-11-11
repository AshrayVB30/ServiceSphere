import React, { useState } from 'react';
import { Settings, Shield, Save, Sliders, KeyRound } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Checkbox } from '../../components/common/Checkbox';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/authService';

export function SettingsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('general');

  // General Settings
  const [appName, setAppName] = useState('ServiceSphere Enterprise');
  const [supportEmail, setSupportEmail] = useState('support@servicesphere.io');
  const [timezone, setTimezone] = useState('UTC');
  const [sessionTimeout, setSessionTimeout] = useState('60');

  // Security Settings
  const [requireMfa, setRequireMfa] = useState(true);
  const [enforcePasswordPolicy, setEnforcePasswordPolicy] = useState(true);
  const [restrictDomainSignups, setRestrictDomainSignups] = useState(true);

  // Password Change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    toast.success('Configuration Saved', 'System settings updated successfully.');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Validation Error', 'New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await authService.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success('Password Updated', 'Your account credentials have been securely updated.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error('Password Update Failed', err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          System Administration Settings
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Configure global platform parameters, taxonomy categories, and security governance rules.
        </p>
      </div>

      {/* Settings Navigation Toolbar */}
      <div className="flex items-center justify-between bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1">
          {[
            { label: 'General Configuration', value: 'general', icon: Settings },
            { label: 'Security & Access Policies', value: 'security', icon: Shield },
            { label: 'Taxonomy & Routing', value: 'taxonomy', icon: Sliders },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === tab.value
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'general' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card title="Organization & Platform Identity">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Application Brand Name"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
                <Input
                  label="Global Help Desk Contact Email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Default Platform Timezone"
                  options={[
                    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
                    { value: 'EST', label: 'EST (Eastern Standard Time)' },
                    { value: 'PST', label: 'PST (Pacific Standard Time)' },
                    { value: 'IST', label: 'IST (India Standard Time)' },
                  ]}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />

                <Select
                  label="Session Inactivity Timeout"
                  options={[
                    { value: '15', label: '15 minutes' },
                    { value: '30', label: '30 minutes' },
                    { value: '60', label: '60 minutes (Recommended)' },
                    { value: '120', label: '120 minutes' },
                  ]}
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="md" leftIcon={Save}>
              Save General Preferences
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
          <Card title="Session & Authentication Controls">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/70">
                <div>
                  <p className="text-xs font-semibold text-gray-900">Django Session Cookie Security</p>
                  <p className="text-xs text-gray-500 mt-0.5">Enforces HttpOnly, Secure, and SameSite=Lax flags.</p>
                </div>
                <Badge variant="success">Enforced</Badge>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/70">
                <div>
                  <p className="text-xs font-semibold text-gray-900">Cross-Site Request Forgery (CSRF)</p>
                  <p className="text-xs text-gray-500 mt-0.5">Validates X-CSRFToken headers on all state-mutating requests.</p>
                </div>
                <Badge variant="success">Protected</Badge>
              </div>

              <div className="pt-2 space-y-3">
                <Checkbox
                  label="Enforce Two-Factor Authentication (2FA) for Administrators"
                  description="Requires TOTP authentication token on staff logins."
                  checked={requireMfa}
                  onChange={(e) => setRequireMfa(e.target.checked)}
                />

                <Checkbox
                  label="Enforce Complex Password Complexity Rules"
                  description="Minimum 8 characters with at least one uppercase, digit, and special character."
                  checked={enforcePasswordPolicy}
                  onChange={(e) => setEnforcePasswordPolicy(e.target.checked)}
                />

                <Checkbox
                  label="Restrict Self-Registration to Verified Corporate Client Domains"
                  description="Blocks non-whitelisted email domains from filing self-provisioned tickets."
                  checked={restrictDomainSignups}
                  onChange={(e) => setRestrictDomainSignups(e.target.checked)}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="md" leftIcon={Save}>
              Save Security Rules
            </Button>
          </div>
        </form>

        {/* Real Django Password Change Endpoint Integration */}
        <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-slate-200">
          <Card
            title="Account Password Management"
            subtitle="Securely change your account password through the Django authentication service"
          >
            <div className="space-y-4 max-w-md">
              <Input
                label="Current Password"
                type="password"
                placeholder="Enter your current password..."
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
              <Input
                label="New Password"
                type="password"
                placeholder="Minimum 8 characters..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-type new password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={changingPassword}
                  leftIcon={KeyRound}
                >
                  Update Password
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
      )}

      {activeTab === 'taxonomy' && (
        <Card title="Ticket Category Hierarchies & Auto-Assignment">
          <div className="space-y-3">
            {[
              { name: 'Technical Support', count: 52, team: 'Tier 1 Engineering Queue' },
              { name: 'Billing & Invoicing', count: 26, team: 'Finance Operations Queue' },
              { name: 'Software Defect / Bug', count: 34, team: 'DevOps & Product Queue' },
              { name: 'Feature Request', count: 18, team: 'Product Management Queue' },
              { name: 'Account Access & Permissions', count: 12, team: 'IT Security Queue' },
            ].map((cat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 bg-white"
              >
                <div>
                  <p className="text-xs font-semibold text-gray-900">{cat.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Routed to: {cat.team}</p>
                </div>
                <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {cat.count} tickets
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default SettingsPage;
