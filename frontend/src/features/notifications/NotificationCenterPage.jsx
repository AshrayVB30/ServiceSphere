import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ShieldAlert, CheckSquare, MessageSquare, Ticket, Settings, ArrowRight } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Checkbox } from '../../components/common/Checkbox';
import { useToast } from '../../hooks/useToast';
import notificationService from '../../services/notificationService';

export function NotificationCenterPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'SLA' | 'APPROVAL'
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);

  // Preference switches
  const [emailOnAssign, setEmailOnAssign] = useState(true);
  const [emailOnSLAWarning, setEmailOnSLAWarning] = useState(true);
  const [emailOnApproval, setEmailOnApproval] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    }
    load();
  }, []);

  const handleMarkRead = async (id, targetUrl) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success('All Notifications Read', 'Your inbox is completely up to date.');
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    if (filter === 'SLA') return n.type === 'SLA_ALERT';
    if (filter === 'APPROVAL') return n.type === 'APPROVAL';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'SLA_ALERT':
        return <ShieldAlert className="h-4 w-4 text-red-600" />;
      case 'APPROVAL':
        return <CheckSquare className="h-4 w-4 text-purple-600" />;
      case 'TICKET_ASSIGNED':
        return <Ticket className="h-4 w-4 text-blue-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Notification Center
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Stay informed on ticket escalations, SLA deadlines, and pending approval decisions.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPrefModalOpen(true)}
            leftIcon={Settings}
          >
            Preferences
          </Button>
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

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <Card className="text-center py-12">
            <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No notifications in this filter view.</p>
          </Card>
        ) : (
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
              <div className="flex items-start space-x-3.5">
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    n.is_read ? 'bg-slate-100 text-slate-600' : 'bg-white shadow-2xs border border-blue-100 text-blue-600'
                  }`}
                >
                  {getIcon(n.type)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xs font-semibold text-slate-900">{n.title}</h2>
                    {!n.is_read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1.5 font-mono">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="sm" rightIcon={ArrowRight}>
                View
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Preferences Modal */}
      <Modal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
        title="Notification Delivery Preferences"
        description="Choose how you receive urgent operational updates from ServiceSphere."
        size="md"
        footer={
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
        <div className="space-y-4">
          <Checkbox
            label="Email alerts for new ticket assignments"
            description="Send email notification immediately when a ticket is assigned to you."
            checked={emailOnAssign}
            onChange={(e) => setEmailOnAssign(e.target.checked)}
          />

          <Checkbox
            label="Urgent SLA breach countdown alerts"
            description="Notify via email when a ticket reaches 75% of allowed SLA resolution time."
            checked={emailOnSLAWarning}
            onChange={(e) => setEmailOnSLAWarning(e.target.checked)}
          />

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

export default NotificationCenterPage;
