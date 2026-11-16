// Import React and lifecycle hooks
import React, { useState, useEffect } from 'react';
// Import Menu, Search, and Bell icons from Lucide
import { Menu, Search, Bell } from 'lucide-react';
// Import useAuth hook to inspect active user and invoke logout
import { useAuth } from '../../hooks/useAuth';
// Import Dropdown components for user profile menu
import { Dropdown, DropdownItem, DropdownDivider } from '../common/Dropdown';
// Import role labels and route definitions
import { ROLE_LABELS, ROUTES } from '../../constants';
// Import useNavigate for programatic routing
import { useNavigate } from 'react-router-dom';
// Import notification service to fetch unread badge count
import { notificationService } from '../../services/notificationService';

/**
 * Enterprise Application Top Header Bar
 * Contains mobile menu trigger, global quick search, notification bell indicator, and profile menu.
 */
export function Header({ onOpenMobileSidebar }) {
  // Extract user profile, role, and logout function from authentication context
  const { user, role, logout } = useAuth();
  // Navigation hook
  const navigate = useNavigate();
  // Local state tracking count of unread notifications
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll or check unread notification count on mount and when user session changes
  useEffect(() => {
    // Async function querying notification service
    async function checkNotifications() {
      try {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(typeof count === 'number' ? count : count?.unread_count || 0);
      } catch {
        setUnreadCount(0);
      }
    }
    // Only query if user is authenticated
    if (user) {
      checkNotifications();
    }
  }, [user]);

  // Render header bar
  return (
    // Sticky top header bar with backdrop blur
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between">
      {/* Left section: Mobile hamburger trigger & Global quick search */}
      <div className="flex items-center space-x-4 flex-1 max-w-lg">
        {/* Mobile menu hamburger button (visible on lg screens and below) */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global quick search input with keyboard shortcut hint */}
        <div className="relative w-full hidden sm:block">
          {/* Search icon */}
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          {/* Search input field */}
          <input
            type="text"
            placeholder="Search tickets, knowledge base, clients (Ctrl+K)..."
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-12 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
          />
          {/* Keyboard shortcut badge */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right section: Notification icon button & User profile dropdown */}
      <div className="flex items-center space-x-3.5">
        {/* Notification bell button */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.NOTIFICATIONS)}
          className="relative text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          {/* Unread notification counter badge */}
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-1 rounded-full bg-blue-600 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Vertical divider */}
        <div className="h-5 w-px bg-slate-200" />

        {/* User profile dropdown menu */}
        <Dropdown
          align="right"
          width="w-60"
          trigger={
            <div className="flex items-center space-x-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
              {/* User avatar circle */}
              <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center uppercase shadow-2xs ring-1 ring-slate-800">
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </div>
              {/* User name and role display (hidden on small mobile screens) */}
              <div className="hidden sm:block text-left">
                <span className="text-xs font-semibold text-slate-900 block leading-tight">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                </span>
                <span className="text-xs text-slate-500 font-medium block">
                  {ROLE_LABELS[role] || role}
                </span>
              </div>
            </div>
          }
        >
          {/* Profile header summary */}
          <div className="px-3.5 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-900">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          {/* Account settings link */}
          <DropdownItem onClick={() => navigate(ROUTES.SETTINGS)}>
            Account Settings
          </DropdownItem>
          {/* Notification preferences link */}
          <DropdownItem onClick={() => navigate(ROUTES.NOTIFICATIONS)}>
            Notification Preferences
          </DropdownItem>

          {/* Menu item divider */}
          <DropdownDivider />

          {/* Sign out action */}
          <DropdownItem
            danger
            onClick={async () => {
              await logout();
              navigate(ROUTES.LOGIN);
            }}
          >
            Sign Out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}

// Export Header as default export
export default Header;
