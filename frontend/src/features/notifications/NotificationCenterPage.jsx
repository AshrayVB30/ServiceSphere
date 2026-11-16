/**
 * @file NotificationCenterPage.jsx
 * @description Notification Center and Activity Feed page.
 * Manages real-time operational notifications, SLA escalation alerts, and pending approval decisions.
 * Supports filtering by status (All, Unread, SLA, Approvals), mark-as-read transitions, link redirection, and delivery preferences.
 */

// Import React library and component hooks for state and lifecycle effects
import React, { useState, useEffect } from 'react';
// Import useNavigate hook from react-router-dom for route transitions when clicking notifications
import { useNavigate } from 'react-router-dom';
// Import Lucide icons for notification alerts, checkmarks, shield badges, ticket icons, and settings
import { Bell, CheckCheck, ShieldAlert, CheckSquare, MessageSquare, Ticket, Settings, ArrowRight } from 'lucide-react';
// Import Card container component for structured empty state panels
import { Card } from '../../components/common/Card';
// Import Button component for standard interactive triggers and modal controls
import { Button } from '../../components/common/Button';
// Import Modal component for delivery preferences configuration dialog
import { Modal } from '../../components/common/Modal';
// Import Checkbox component for toggling email delivery notification preferences
import { Checkbox } from '../../components/common/Checkbox';
// Import custom useToast hook to display interactive toast alerts
import { useToast } from '../../hooks/useToast';
// Import notificationService API client for fetching, reading, and clearing notifications
import notificationService from '../../services/notificationService';

/**
 * NotificationCenterPage Component
 * Renders the notifications feed, filter tabs, bulk mark-as-read action, and delivery preferences dialog.
 */
export function NotificationCenterPage() {
  // Initialize programmatic router navigation function
  const navigate = useNavigate();
  // Initialize toast notification dispatcher
  const toast = useToast();

  // State storing the list of notification items fetched from the backend
  const [notifications, setNotifications] = useState([]);
  // State storing the active filter tab ('ALL' | 'UNREAD' | 'SLA' | 'APPROVAL')
  const [filter, setFilter] = useState('ALL');
  // State controlling visibility of the notification preferences modal
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);

  // Delivery preference toggle: Email on new ticket assignment
  const [emailOnAssign, setEmailOnAssign] = useState(true);
  // Delivery preference toggle: Email on approaching SLA breach warning
  const [emailOnSLAWarning, setEmailOnSLAWarning] = useState(true);
  // Delivery preference toggle: Email on approval decision updates
  const [emailOnApproval, setEmailOnApproval] = useState(true);

  // Fetch user notifications on initial component mount
  useEffect(() => {
    // Asynchronous loader function querying backend notification records
    async function load() {
      // Query notifications from API service
      const data = await notificationService.getNotifications();
      // Update state with fetched notifications array
      setNotifications(data);
    }
    // Invoke loader routine
    load();
  }, []); // Empty dependency array ensures execution on mount only

  // Marks a specific notification as read and navigates to its target URL if provided
  const handleMarkRead = async (id, targetUrl) => {
    // Send API request to mark notification as read in database
    await notificationService.markAsRead(id);
    // Update local notifications state to set is_read = true for matching item
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    // Navigate to target URL if specified on notification
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  // Marks all unread notifications as read across the user account
  const handleMarkAllRead = async () => {
    // Send API request to mark all records read
    await notificationService.markAllRead();
    // Update local state by setting is_read = true on all items
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    // Display confirmation toast
    toast.success('All Notifications Read', 'Your inbox is completely up to date.');
  };

  // Compute filtered notifications list matching the selected category filter
  const filtered = notifications.filter((n) => {
    // Filter unread notifications
    if (filter === 'UNREAD') return !n.is_read;
    // Filter SLA escalation alerts
    if (filter === 'SLA') return n.type === 'SLA_ALERT';
    // Filter approval decision requests
    if (filter === 'APPROVAL') return n.type === 'APPROVAL';
    // Default: Return all notifications
    return true;
  });

  // Returns semantic Lucide icon based on notification type string
  const getIcon = (type) => {
    switch (type) {
      // Red shield icon for SLA escalation alerts
      case 'SLA_ALERT':
        return <ShieldAlert className="h-4 w-4 text-red-600" />;
      // Purple check square for approval workflows
      case 'APPROVAL':
        return <CheckSquare className="h-4 w-4 text-purple-600" />;
      // Blue ticket icon for ticket assignment notifications
      case 'TICKET_ASSIGNED':
        return <Ticket className="h-4 w-4 text-blue-600" />;
      // Default gray message bubble icon
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  // Render the Notification Center page layout
  return (
    // Outer vertical container with standard spacing
    <div className="space-y-6">
      {/* Page Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Main title */}
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Notification Center
          </h1>
          {/* Subtitle describing alert coverage */}
          <p className="text-xs text-gray-500 mt-1">
            Stay informed on ticket escalations, SLA deadlines, and pending approval decisions.
          </p>
        </div>

        {/* Action button toolbar: Delivery Preferences and Mark All Read */}
        <div className="flex items-center space-x-2.5">
          {/* Preferences button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPrefModalOpen(true)}
            leftIcon={Settings}
          >
            Preferences
          </Button>
          {/* Mark All Read button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            leftIcon={CheckCheck}
          >
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="flex items-center justify-between bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1">
          {/* Map over available notification category tabs */}
          {[
            { label: 'All Notifications', value: 'ALL', count: notifications.length },
            { label: 'Unread Only', value: 'UNREAD', count: notifications.filter((n) => !n.is_read).length },
            { label: 'SLA Escalations', value: 'SLA', count: notifications.filter((n) => n.type === 'SLA_ALERT').length },
            { label: 'Approval Requests', value: 'APPROVAL', count: notifications.filter((n) => n.type === 'APPROVAL').length },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                filter === tab.value
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {/* Notification count pill badge */}
              <span
                className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                  filter === tab.value
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List Section */}
      <div className="space-y-2.5">
        {/* Render empty state card if no notifications match the current filter */}
        {filtered.length === 0 ? (
          <Card className="text-center py-12">
            <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No notifications in this filter view.</p>
          </Card>
        ) : (
          // Map over filtered notification items to render notification cards
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkRead(n.id, n.target_url)}
              className={`rounded-xl border p-4 transition-all flex items-start justify-between gap-4 cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                n.is_read
                  ? 'bg-white border-slate-200/80 hover:border-slate-300'
                  : 'bg-blue-50/30 border-blue-200/90 hover:border-blue-300'
              }`}
            >
              {/* Notification content: Icon, Title, Unread Dot, Message, and Timestamp */}
              <div className="flex items-start space-x-3.5">
                {/* Category Icon Container */}
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    n.is_read ? 'bg-slate-100 text-slate-600' : 'bg-white shadow-2xs border border-blue-100 text-blue-600'
                  }`}
                >
                  {getIcon(n.type)}
                </div>
                <div>
                  {/* Notification Title and Unread indicator */}
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xs font-semibold text-slate-900">{n.title}</h2>
                    {/* Blue unread status dot */}
                    {!n.is_read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                    )}
                  </div>
                  {/* Notification detailed message */}
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  {/* Localized timestamp */}
                  <p className="text-xs text-slate-400 mt-1.5 font-mono">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* View Action Button */}
              <Button variant="ghost" size="sm" rightIcon={ArrowRight}>
                View
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Preferences Modal Dialog */}
      <Modal
        isOpen={isPrefModalOpen} // Controls modal visibility
        onClose={() => setIsPrefModalOpen(false)} // Close dismissal handler
        title="Notification Delivery Preferences" // Modal title
        description="Choose how you receive urgent operational updates from ServiceSphere." // Modal subtitle
        size="md" // Medium dialog size
        footer={
          // Footer save button
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              toast.success('Preferences Saved', 'Notification delivery rules updated.');
              setIsPrefModalOpen(false);
            }}
          >
            Save Preferences
          </Button>
        }
      >
        {/* Preference Checkboxes */}
        <div className="space-y-4">
          {/* Checkbox: Email on new ticket assignment */}
          <Checkbox
            label="Email alerts for new ticket assignments"
            description="Send email notification immediately when a ticket is assigned to you."
            checked={emailOnAssign}
            onChange={(e) => setEmailOnAssign(e.target.checked)}
          />

          {/* Checkbox: Email on SLA warning */}
          <Checkbox
            label="Urgent SLA breach countdown alerts"
            description="Notify via email when a ticket reaches 75% of allowed SLA resolution time."
            checked={emailOnSLAWarning}
            onChange={(e) => setEmailOnSLAWarning(e.target.checked)}
          />

          {/* Checkbox: Email on approval decision updates */}
          <Checkbox
            label="Approval decision status notifications"
            description="Receive immediate alerts when approval requests are authorized, rejected, or questioned."
            checked={emailOnApproval}
            onChange={(e) => setEmailOnApproval(e.target.checked)}
          />
        </div>
      </Modal>
    </div>
  );
}

// Export NotificationCenterPage as default export for lazy loading and routing
export default NotificationCenterPage;
