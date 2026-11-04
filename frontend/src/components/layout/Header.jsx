import React from 'react';
import { Menu, Search, Bell, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Dropdown, DropdownItem, DropdownDivider } from '../common/Dropdown';
import { ROLE_LABELS, ROUTES } from '../../constants';
import { useNavigate } from 'react-router-dom';

/**
 * Enterprise Application Top Header Bar
 */
export function Header({ onOpenMobileSidebar }) {
  const { user, role, isMockSession, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Global quick search */}
      <div className="flex items-center space-x-4 flex-1 max-w-lg">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Linear style search input */}
        <div className="relative w-full hidden sm:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search tickets, knowledge base, clients (Ctrl+K)..."
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-12 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Status badge, Notification & User dropdown */}
      <div className="flex items-center space-x-3.5">
        {/* Mock session indicator */}
        {isMockSession && (
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
            <Sparkles className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Prototype Mode</span>
          </div>
        )}

        {/* Notifications Icon Button */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.NOTIFICATIONS)}
          className="relative text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        <div className="h-5 w-px bg-slate-200" />

        {/* User profile dropdown */}
        <Dropdown
          align="right"
          width="w-60"
          trigger={
            <div className="flex items-center space-x-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center uppercase shadow-2xs ring-1 ring-slate-800">
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </div>
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
          <div className="px-3.5 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-900">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          <DropdownItem onClick={() => navigate(ROUTES.SETTINGS)}>
            Account Settings
          </DropdownItem>
          <DropdownItem onClick={() => navigate(ROUTES.NOTIFICATIONS)}>
            Notification Preferences
          </DropdownItem>

          <DropdownDivider />

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

export default Header;

