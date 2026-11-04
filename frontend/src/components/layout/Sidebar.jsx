import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Building2,
  CheckSquare,
  Clock,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS, ROUTES } from '../../constants';
import { cn } from '../../utils/cn';

/**
 * Enterprise Sidebar Navigation Component (Linear / Apple Aesthetic)
 * Strict 250px width, clean typography, role-aware item filtering.
 */
export function Sidebar({ isMobileOpen, onCloseMobile }) {
  const { user, role, isAdmin, isAgent, isClient, isApprover, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  // Determine role-specific dashboard link
  const dashboardLink = isAdmin
    ? ROUTES.ADMIN_DASHBOARD
    : isAgent
    ? ROUTES.AGENT_DASHBOARD
    : isClient
    ? ROUTES.CLIENT_DASHBOARD
    : ROUTES.APPROVER_DASHBOARD;

  // Build navigation items based on current role permissions
  const navSections = [
    {
      title: 'Core Platform',
      items: [
        {
          label: 'Dashboard',
          to: dashboardLink,
          icon: LayoutDashboard,
          visible: true,
        },
        {
          label: 'Tickets',
          to: ROUTES.TICKETS,
          icon: Ticket,
          visible: true, // Everyone accesses tickets within their permitted scope
          badge: isAgent ? '5' : undefined,
        },
        {
          label: 'Approvals',
          to: ROUTES.APPROVALS,
          icon: CheckSquare,
          visible: isAdmin || isApprover || isAgent,
          badge: isApprover ? '2' : undefined,
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          label: 'Clients',
          to: ROUTES.CLIENTS,
          icon: Building2,
          visible: isAdmin,
        },
        {
          label: 'User Directory',
          to: ROUTES.USERS,
          icon: Users,
          visible: isAdmin,
        },
        {
          label: 'SLA Tracking',
          to: ROUTES.SLA,
          icon: Clock,
          visible: isAdmin || isAgent,
        },
        {
          label: 'Knowledge Base',
          to: ROUTES.KNOWLEDGE_BASE,
          icon: BookOpen,
          visible: true,
        },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        {
          label: 'Analytics & KPIs',
          to: ROUTES.ANALYTICS,
          icon: BarChart3,
          visible: isAdmin || isAgent,
        },
        {
          label: 'System Settings',
          to: ROUTES.SETTINGS,
          icon: Settings,
          visible: isAdmin,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[250px] bg-white border-r border-gray-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header - px-3.5 with px-2.5 inner container aligns logo icon with nav icons */}
        <div className="h-16 flex items-center px-3.5 border-b border-gray-100">
          <div className="flex items-center space-x-2.5 px-2.5">
            <img
              src="/logo.png"
              alt="ServiceSphere Logo"
              className="h-8 w-8 rounded-xl object-contain shadow-2xs"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/logo.svg';
              }}
            />
            <div>
              <span className="font-bold text-gray-900 text-sm tracking-tight block">
                ServiceSphere
              </span>
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block -mt-0.5">
                Enterprise Desk
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 pb-6">
          {navSections.map((sec, secIdx) => {
            const visibleItems = sec.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={secIdx} className={cn('space-y-1', secIdx > 0 ? 'mt-5' : '')}>
                <p className="px-2.5 text-xs font-bold tracking-wider text-gray-500 uppercase mb-1.5">
                  {sec.title}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        cn(
                          'relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all group select-none',
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-100/80 shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span
                              className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full"
                              aria-hidden="true"
                            />
                          )}
                          <div className="flex items-center space-x-2.5">
                            <item.icon
                              className={cn(
                                'h-4 w-4 shrink-0 transition-colors',
                                isActive
                                  ? 'text-blue-600'
                                  : 'text-slate-400 group-hover:text-slate-600'
                              )}
                            />
                            <span>{item.label}</span>
                          </div>

                          {item.badge && (
                            <span className="h-4.5 px-1.5 min-w-[18px] rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* User profile snapshot & quick logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0 uppercase">
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {ROLE_LABELS[role] || role}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

