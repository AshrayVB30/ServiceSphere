/**
 * @file SettingsPage.jsx
 * @description System Administration and User Security Settings Page.
 * Provides controls for general platform preferences (brand name, contact email, timezone, session timeouts),
 * security governance policies (MFA, password rules, domain whitelisting), account password updates via Django auth,
 * and ticket category taxonomy inspection.
 */

// Import React library and component state hook
import React, { useState } from 'react';
// Import Lucide icons for settings tabs, security badges, action triggers, and key indicators
import { Settings, Shield, Save, Sliders, KeyRound } from 'lucide-react';
// Import Card container component for structured settings panels
import { Card } from '../../components/common/Card';
// Import Button component for standard interactive triggers and submit actions
import { Button } from '../../components/common/Button';
// Import Input component for text, email, and password form fields
import { Input } from '../../components/common/Input';
// Import Select component for timezone and session timeout dropdowns
import { Select } from '../../components/common/Select';
// Import Checkbox component for toggling security governance policies
import { Checkbox } from '../../components/common/Checkbox';
// Import Badge component for rendering status indicator chips
import { Badge } from '../../components/common/Badge';
// Import custom useToast hook for interactive feedback alerts
import { useToast } from '../../hooks/useToast';
// Import authService API client for executing authenticated password changes
import { authService } from '../../services/authService';

/**
 * SettingsPage Component
 * Renders tabbed administrative preferences: General, Security & Access, and Taxonomy.
 */
export function SettingsPage() {
  // Initialize toast dispatcher for user feedback notifications
  const toast = useToast();
  // State tracking the currently active settings tab ('general' | 'security' | 'taxonomy')
  const [activeTab, setActiveTab] = useState('general');

  // General Settings: Application brand name
  const [appName, setAppName] = useState('ServiceSphere Enterprise');
  // General Settings: Global support contact email
  const [supportEmail, setSupportEmail] = useState('support@servicesphere.io');
  // General Settings: Default platform timezone identifier
  const [timezone, setTimezone] = useState('UTC');
  // General Settings: Session inactivity timeout in minutes
  const [sessionTimeout, setSessionTimeout] = useState('60');

  // Security Settings: Require multi-factor authentication for admins
  const [requireMfa, setRequireMfa] = useState(true);
  // Security Settings: Enforce complex password rules
  const [enforcePasswordPolicy, setEnforcePasswordPolicy] = useState(true);
  // Security Settings: Restrict self-registration to corporate domain whitelists
  const [restrictDomainSignups, setRestrictDomainSignups] = useState(true);

  // Password Change Form State: Current user password
  const [oldPassword, setOldPassword] = useState('');
  // Password Change Form State: New desired password
  const [newPassword, setNewPassword] = useState('');
  // Password Change Form State: Password confirmation match
  const [confirmPassword, setConfirmPassword] = useState('');
  // State tracking whether password change request is currently processing
  const [changingPassword, setChangingPassword] = useState(false);

  // Handles simulated submission of general or security settings
  const handleSave = (e) => {
    // Prevent default form submission reload
    e.preventDefault();
    // Display confirmation toast
    toast.success('Configuration Saved', 'System settings updated successfully.');
  };

  // Handles submitting the account password change form to the Django auth service
  const handleChangePassword = async (e) => {
    // Prevent default browser form submission refresh
    e.preventDefault();
    // Validate that new password matches confirmation
    if (newPassword !== confirmPassword) {
      toast.error('Validation Error', 'New passwords do not match.');
      return;
    }
    // Set changing password loading flag
    setChangingPassword(true);
    try {
      // Dispatch password update request to backend authentication service
      await authService.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      // Show success toast on confirmation
      toast.success('Password Updated', 'Your account credentials have been securely updated.');
      // Clear password form fields
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      // Display error notification on failure
      toast.error('Password Update Failed', err.message);
    } finally {
      // Reset changing password loading flag
      setChangingPassword(false);
    }
  };

  // Render settings page layout
  return (
    // Outer vertical container with max-width restriction
    <div className="space-y-6 max-w-4xl">
      <div>
        {/* Page title */}
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          System Administration Settings
        </h1>
        {/* Subtitle describing administration scope */}
        <p className="text-xs text-gray-500 mt-1">
          Configure global platform parameters, taxonomy categories, and security governance rules.
        </p>
      </div>

      {/* Settings Navigation Toolbar */}
      <div className="flex items-center justify-between bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1">
          {/* Map over available settings tabs to render tab buttons */}
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
              {/* Tab icon */}
              <tab.icon className="h-3.5 w-3.5" />
              {/* Tab label */}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: General Configuration Form */}
      {activeTab === 'general' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card title="Organization & Platform Identity">
            <div className="space-y-4">
              {/* Brand name and support email row */}
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

              {/* Timezone and session timeout row */}
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

          {/* Form save button */}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="md" leftIcon={Save}>
              Save General Preferences
            </Button>
          </div>
        </form>
      )}

      {/* Tab 2: Security & Access Policies */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
          <Card title="Session & Authentication Controls">
            <div className="space-y-4">
              {/* Django Session Cookie status strip */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/70">
                <div>
                  <p className="text-xs font-semibold text-gray-900">Django Session Cookie Security</p>
                  <p className="text-xs text-gray-500 mt-0.5">Enforces HttpOnly, Secure, and SameSite=Lax flags.</p>
                </div>
                <Badge variant="success">Enforced</Badge>
              </div>

              {/* CSRF Protection status strip */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/70">
                <div>
                  <p className="text-xs font-semibold text-gray-900">Cross-Site Request Forgery (CSRF)</p>
                  <p className="text-xs text-gray-500 mt-0.5">Validates X-CSRFToken headers on all state-mutating requests.</p>
                </div>
                <Badge variant="success">Protected</Badge>
              </div>

              {/* Security policy checkbox toggles */}
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

          {/* Save security rules button */}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="md" leftIcon={Save}>
              Save Security Rules
            </Button>
          </div>
        </form>

        {/* Real Django Password Change Endpoint Integration Form */}
        <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-slate-200">
          <Card
            title="Account Password Management"
            subtitle="Securely change your account password through the Django authentication service"
          >
            <div className="space-y-4 max-w-md">
              {/* Current password input */}
              <Input
                label="Current Password"
                type="password"
                placeholder="Enter your current password..."
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
              {/* New password input */}
              <Input
                label="New Password"
                type="password"
                placeholder="Minimum 8 characters..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              {/* Confirm password input */}
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-type new password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {/* Submit password button */}
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

      {/* Tab 3: Taxonomy & Routing */}
      {activeTab === 'taxonomy' && (
        <Card title="Ticket Category Hierarchies & Auto-Assignment">
          <div className="space-y-3">
            {/* Map over sample categories and assigned queue teams */}
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
                  {/* Category name */}
                  <p className="text-xs font-semibold text-gray-900">{cat.name}</p>
                  {/* Assigned routing team queue */}
                  <p className="text-xs text-gray-500 mt-0.5">Routed to: {cat.team}</p>
                </div>
                {/* Tickets count badge */}
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

// Export SettingsPage as default export for lazy loading and routing
export default SettingsPage;
