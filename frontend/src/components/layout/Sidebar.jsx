// Import React core — required for JSX and component rendering
import React from 'react';
// Import NavLink for active-aware navigation links and useNavigate for programmatic redirection after logout
import { NavLink, useNavigate } from 'react-router-dom';
// Import icon components from lucide-react — each icon visually represents its corresponding nav item, improving scanability
import {
  LayoutDashboard, // Dashboard nav icon — a grid/squares motif representing an overview
  Ticket,          // Tickets nav icon — a ticket stub motif for the helpdesk ticket module
  Users,           // User Directory nav icon — a group-of-people motif for the user management page
  Building2,       // Clients nav icon — a building motif for the client/organization management page
  CheckSquare,     // Approvals nav icon — a checkmark-in-box motif for the approval workflows page
  Clock,           // SLA Tracking nav icon — a clock motif for time-based service level monitoring
  BookOpen,        // Knowledge Base nav icon — an open-book motif for the KB/documentation module
  BarChart3,       // Analytics nav icon — a bar-chart motif for KPI and reporting dashboards
  Settings,        // System Settings nav icon — a gear motif for the admin configuration page
  LogOut,          // Logout icon — an arrow-out-of-box motif for the sign-out button
} from 'lucide-react';
// Import useAuth hook — exposes the current user object, role flags, and logout function from AuthContext
import { useAuth } from '../../hooks/useAuth';
// Import ROLE_LABELS for human-readable role display names and ROUTES for type-safe path constants
import { ROLE_LABELS, ROUTES } from '../../constants';
// Import cn utility — conditionally joins Tailwind class strings, avoiding string concatenation bugs
import { cn } from '../../utils/cn';

/**
 * Enterprise Sidebar Navigation Component (Linear / Apple Aesthetic)
 * Strict 250px width, clean typography, role-aware item filtering.
 */
// Sidebar receives isMobileOpen (boolean drawer state) and onCloseMobile (callback to collapse on mobile)
export function Sidebar({ isMobileOpen, onCloseMobile }) {
  // Destructure auth state: user (profile object), role (string), role-boolean flags, and logout function
  const { user, role, isAdmin, isAgent, isClient, isApprover, logout } = useAuth();
  // useNavigate provides imperative navigation — used after logout to redirect to the login page
  const navigate = useNavigate();

  // handleLogout: awaits server-side session destruction then navigates away; async so logout's Promise resolves before redirect
  const handleLogout = async () => {
    await logout(); // Calls authService.logout() to invalidate the Django session cookie
    navigate(ROUTES.LOGIN); // Redirect to login page after session is cleared
  };

  // Determine role-specific dashboard link — each role has a dedicated home view to show relevant KPIs
  // isAdmin takes priority (superusers may also hold a role string), so it's checked first
  const dashboardLink = isAdmin
    ? ROUTES.ADMIN_DASHBOARD   // Admins see the full platform overview
    : isAgent
    ? ROUTES.AGENT_DASHBOARD   // Agents see their ticket queue and SLA metrics
    : isClient
    ? ROUTES.CLIENT_DASHBOARD  // Clients see their own tickets and account info
    : ROUTES.APPROVER_DASHBOARD; // Approvers see pending approval requests

  // navSections: a hierarchical data structure representing grouped navigation sections.
  // Each section has a title (rendered as a small-caps label) and an array of nav items.
  // Each item has a label, route path, icon component, visibility predicate, and optional badge.
  // Using an array of section objects keeps the sidebar declarative and easy to extend with new roles or modules.
  const navSections = [
    {
      title: 'Core Platform', // Section label for primary day-to-day features
      items: [
        {
          label: 'Dashboard',       // Link text shown in the nav
          to: dashboardLink,        // Dynamic path resolves to the role-appropriate dashboard route
          icon: LayoutDashboard,    // Visual icon component rendered beside the label
          visible: true,            // Always visible — every role has a dashboard home
        },
        {
          label: 'Tickets',
          to: ROUTES.TICKETS,       // /tickets — the shared ticket list view, scoped by role in the backend
          icon: Ticket,
          visible: true,            // Everyone accesses tickets within their permitted scope
          badge: isAgent ? '5' : undefined, // Agents see a badge showing unread/pending ticket count; other roles don't need this nudge
        },
        {
          label: 'Approvals',
          to: ROUTES.APPROVALS,     // /approvals — the approval queue page
          icon: CheckSquare,
          visible: isAdmin || isApprover || isAgent, // Clients never manage approvals, so they don't see this link
          badge: isApprover ? '2' : undefined, // Approvers see a badge for pending items requiring their sign-off
        },
      ],
    },
    {
      title: 'Operations', // Section label for administrative and operational tools
      items: [
        {
          label: 'Clients',
          to: ROUTES.CLIENTS,   // /clients — the client/organisation management page
          icon: Building2,
          visible: isAdmin,     // Only admins manage client organizations; agents and clients should not see this
        },
        {
          label: 'User Directory',
          to: ROUTES.USERS,     // /users — the full user list and account management page
          icon: Users,
          visible: isAdmin,     // Only admins can manage user accounts and roles
        },
        {
          label: 'SLA Tracking',
          to: ROUTES.SLA,       // /sla — the SLA compliance dashboard
          icon: Clock,
          visible: isAdmin || isAgent, // Both admins and agents need to track SLA; clients and approvers do not manage SLAs
        },
        {
          label: 'Knowledge Base',
          to: ROUTES.KNOWLEDGE_BASE, // /knowledge-base — article library for self-service support
          icon: BookOpen,
          visible: true,             // Open to all roles — self-service knowledge reduces ticket volume
        },
      ],
    },
    {
      title: 'Intelligence', // Section label for data insights and system configuration
      items: [
        {
          label: 'Analytics & KPIs',
          to: ROUTES.ANALYTICS,  // /analytics — reporting dashboard with KPI charts
          icon: BarChart3,
          visible: isAdmin || isAgent, // Only admins and agents make data-driven decisions; clients and approvers are not shown operational metrics
        },
        {
          label: 'System Settings',
          to: ROUTES.SETTINGS,  // /settings — platform-wide configuration (SLA policies, categories, etc.)
          icon: Settings,
          visible: isAdmin,      // Only admins can mutate system settings to prevent accidental misconfiguration
        },
      ],
    },
  ];

  return (
    // React Fragment — wraps the backdrop overlay and sidebar <aside> without adding a DOM node
    <>
      {/* Mobile backdrop — renders a semi-transparent overlay behind the sidebar on small screens */}
      {/* Only shown when isMobileOpen is true; hidden on lg+ screens because sidebar is always visible there */}
      {isMobileOpen && (
        <div
          // fixed inset-0: covers the entire viewport; z-40: stacks above page content but below sidebar (z-40 matches aside z-index); bg-gray-900/40 + backdrop-blur-xs: darkens and blurs the page, focusing attention on the sidebar; lg:hidden: hides on large screens where sidebar is permanently visible
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-xs lg:hidden"
          // Clicking the backdrop closes the sidebar — allows users to dismiss without navigating
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      {/* <aside> provides semantic landmark role for screen readers */}
      <aside
        className={cn(
          // fixed inset-y-0 left-0: pins sidebar to the full left edge of the viewport; z-40: above page content; w-[250px]: exact design spec width; bg-white: clean white background; border-r: subtle right border separates sidebar from content; flex flex-col: stacks logo, nav, and user panel vertically; transition-transform: animates slide-in/out on mobile; lg:translate-x-0: always visible on large screens regardless of mobile state
          'fixed inset-y-0 left-0 z-40 w-[250px] bg-white border-r border-gray-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0',
          // On mobile: translate-x-0 slides sidebar into view; -translate-x-full hides it off the left edge
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header - px-3.5 with px-2.5 inner container aligns logo icon with nav icons */}
        {/* h-16: matches the Header bar height so top elements visually align across the layout */}
        <div className="h-16 flex items-center px-3.5 border-b border-gray-100">
          {/* Inner container: flex row with gap; px-2.5 indents logo to match nav icon horizontal position */}
          <div className="flex items-center space-x-2.5 px-2.5">
            {/* Brand logo image — h-8 w-8 keeps it small and icon-sized; rounded-xl matches the design language; shadow-2xs adds subtle depth */}
            <img
              src="/logo.png"               // Primary logo path — served from the public directory
              alt="ServiceSphere Logo"       // Alt text for screen readers and broken-image fallback
              className="h-8 w-8 rounded-xl object-contain shadow-2xs"
              onError={(e) => {
                // If PNG fails to load (missing file), clear the handler to prevent infinite loops then try SVG fallback
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/logo.svg'; // SVG fallback — vector format is resolution-independent
              }}
            />
            <div>
              {/* Primary brand name — font-bold text-sm tracking-tight gives a compact, premium feel */}
              <span className="font-bold text-gray-900 text-sm tracking-tight block">
                ServiceSphere
              </span>
              {/* Sub-label "Enterprise Desk" — text-[10px] uppercase tracking-wider creates a small-caps aesthetic beneath the brand name */}
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block -mt-0.5">
                Enterprise Desk
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        {/* flex-1: takes all vertical space between header and user panel; overflow-y-auto: scrolls if nav exceeds viewport; px-3.5 py-4 pb-6: horizontal padding matches brand header, vertical padding creates breathing room */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 pb-6">
          {/* Iterate over each section to render its group label and nav items */}
          {navSections.map((sec, secIdx) => {
            // Filter items to only those the current user's role is permitted to see
            const visibleItems = sec.items.filter((item) => item.visible);
            // If no items are visible in this section for the current role, skip rendering the section entirely
            if (visibleItems.length === 0) return null;

            return (
              // space-y-1: small gap between section label and items; mt-5 on sections after the first adds vertical separation between groups
              <div key={secIdx} className={cn('space-y-1', secIdx > 0 ? 'mt-5' : '')}>
                {/* Section label — px-2.5 indents to align with item text; text-xs font-bold uppercase tracking-wider: small-caps typographic style that clearly labels the group without competing with item labels */}
                <p className="px-2.5 text-xs font-bold tracking-wider text-gray-500 uppercase mb-1.5">
                  {sec.title} {/* Renders section name, e.g. "Core Platform" */}
                </p>
                {/* space-y-0.5: minimal gap between individual nav items for a compact list feel */}
                <div className="space-y-0.5">
                  {/* Render each visible nav item as a NavLink */}
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}      // Unique key using the route path — prevents React reconciliation issues
                      to={item.to}       // Destination route for this nav item
                      onClick={onCloseMobile} // On mobile, close the sidebar drawer when a link is tapped, so the content is revealed
                      // NavLink's className prop can accept a function receiving { isActive } — used here to apply different styles for active vs. inactive states
                      className={({ isActive }) =>
                        cn(
                          // Base styles: relative for the active indicator pseudo-element; flex layout; px/py for touch target size; rounded-lg; text-xs font-medium; transition-all for smooth hover effects; group enables group-hover on children; select-none prevents text selection on click
                          'relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all group select-none',
                          isActive
                            // Active state: blue-50 background tint; blue-700 text; font-semibold for emphasis; ring-1 ring-blue-100/80 adds a subtle border; shadow-2xs lifts the item slightly
                            ? 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-100/80 shadow-2xs'
                            // Inactive state: neutral text; hover reveals a soft gray background and darker text
                            : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                        )
                      }
                    >
                      {/* NavLink's children can also be a render function — receives { isActive } to conditionally render the active indicator */}
                      {({ isActive }) => (
                        // React Fragment wraps the left content and optional badge without adding DOM nodes
                        <>
                          {/* Active indicator bar — a vertical blue pill on the left edge, visible only for the active route; aria-hidden hides it from screen readers as it's purely decorative */}
                          {isActive && (
                            <span
                              // absolute left-0: pinned to the left edge of the NavLink; top-1.5 bottom-1.5: inset from top and bottom for padding; w-1: 4px wide; bg-blue-600: brand blue; rounded-r-full: pill shape on the right side
                              className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full"
                              aria-hidden="true" // Decorative only — screen readers should not announce this span
                            />
                          )}
                          {/* Left content group: icon + label — flex with space-x-2.5 keeps them aligned and spaced */}
                          <div className="flex items-center space-x-2.5">
                            {/* Dynamic icon component — rendered as a JSX element using the item.icon constructor; h-4 w-4 is the standard icon size; shrink-0 prevents icon from shrinking in flex; transition-colors animates color change on hover/active; color switches between blue-600 (active) and slate-400→slate-600 (inactive hover) */}
                            <item.icon
                              className={cn(
                                'h-4 w-4 shrink-0 transition-colors',
                                isActive
                                  ? 'text-blue-600'                           // Active: icon matches the blue text color
                                  : 'text-slate-400 group-hover:text-slate-600' // Inactive: muted until hovered
                              )}
                            />
                            {/* Nav item label text — inherits parent font-medium / font-semibold from the NavLink className */}
                            <span>{item.label}</span>
                          </div>

                          {/* Badge — only rendered when the item has a badge value (e.g. pending count) */}
                          {item.badge && (
                            // h-4.5 px-1.5 min-w-[18px]: ensures the badge is at least 18px wide for single-digit numbers; rounded-full: pill shape; bg-blue-100 text-blue-700: blue-tinted chip matching active state palette; flex + items-center justify-center: centers the number inside the pill
                            <span className="h-4.5 px-1.5 min-w-[18px] rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                              {item.badge} {/* Numeric count string, e.g. "5" for agent tickets, "2" for approver pending */}
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
        {/* Pinned to the bottom of the sidebar above the viewport edge; p-3 provides padding around the card; border-t: visually separates from the nav list; bg-slate-50/50: very subtle gray tint to distinguish from the white nav area */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          {/* Row: avatar + name/role on the left, logout button on the right */}
          {/* hover:bg-white gives a hover affordance on the card; transition-colors animates the state change */}
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors">
            {/* Left: avatar + name + role text — min-w-0 allows the flex child to shrink and truncate long names */}
            <div className="flex items-center space-x-2.5 min-w-0">
              {/* Avatar circle — h-8 w-8 matches brand header logo size; rounded-full; bg-slate-200: neutral placeholder; text-slate-700 font-semibold text-xs: styled initial letter; shrink-0 prevents compression; uppercase normalizes the initial casing */}
              <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0 uppercase">
                {/* Show the first character of first_name, or fall back to username initial, or 'U' if neither exists */}
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </div>
              {/* Text block — min-w-0 flex-1 allows truncation to work correctly inside flex */}
              <div className="min-w-0 flex-1">
                {/* Full name or username — text-xs font-semibold; truncate prevents overflow in narrow sidebar */}
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {/* Display "First Last" if first_name exists, otherwise fall back to username */}
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                </p>
                {/* Role label — ROLE_LABELS maps the role string (e.g. "support_agent") to a readable label (e.g. "Support Agent") */}
                <p className="text-xs text-slate-500 truncate">
                  {ROLE_LABELS[role] || role} {/* Falls back to raw role string if no label mapping exists */}
                </p>
              </div>
            </div>

            {/* Logout button — icon-only to save space; type="button" prevents accidental form submission */}
            <button
              type="button"          // Prevents the button from submitting a parent form
              onClick={handleLogout} // Calls the async logout handler which clears session and redirects
              // text-slate-400: muted gray default; hover:text-red-600 + hover:bg-red-50: red danger affordance on hover; p-1.5 rounded-lg: comfortable touch target; cursor-pointer: ensures pointer cursor on all browsers
              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              title="Sign out" // Tooltip for keyboard/screen reader users since the button has no visible label
            >
              {/* LogOut icon — h-4 w-4 is the standard small icon size for button icons */}
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// Default export allows importing Sidebar without curly braces if preferred
export default Sidebar;
