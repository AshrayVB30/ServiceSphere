// Import React core library — required to use JSX syntax and component lifecycle hooks
import React, { useState } from 'react';
// Import Outlet from react-router-dom — renders whichever nested child route is currently active
import { Outlet } from 'react-router-dom';
// Import Sidebar component — provides the fixed 250px left-side navigation panel
import { Sidebar } from './Sidebar';
// Import Header component — provides the sticky 64px top bar with search, notifications, and user menu
import { Header } from './Header';

/**
 * Enterprise Application Main Shell Layout
 * Responsive 250px sidebar, 64px header, 32px main content padding.
 */
// AppLayout is the persistent chrome (shell) wrapping all authenticated pages; exported for use in AppRoutes
export function AppLayout() {
  // isMobileSidebarOpen: tracks whether the sidebar drawer is open on small screens (< lg breakpoint)
  // Initial value false — sidebar starts closed on mobile to save space
  // Updated by Header's hamburger button (open) and Sidebar's backdrop click (close)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    // Root container: min-h-screen ensures the layout always fills the viewport; bg-[#F5F6F8] is the app canvas gray; flex enables the side-by-side sidebar + content arrangement
    <div className="min-h-screen bg-[#F5F6F8] flex">
      {/* Sidebar */}
      {/* Sidebar receives two props: isMobileOpen controls slide-in visibility; onCloseMobile collapses it when the backdrop is tapped */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Area */}
      {/* flex-1 takes all remaining horizontal space after sidebar; flex-col stacks Header above main; min-w-0 prevents flex overflow; lg:pl-[250px] offsets content to clear the fixed sidebar on large screens; transition-all smooths the offset change */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[250px] transition-all duration-200">
        {/* Sticky Header */}
        {/* Header receives onOpenMobileSidebar so the hamburger button can lift state up and open the sidebar */}
        <Header onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />

        {/* Dynamic Nested Content */}
        {/* main: flex-1 fills remaining vertical space below header; p-6/p-8 provides breathing room; max-w-7xl + mx-auto centers wide content on large monitors */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {/* Outlet renders the matched nested route's page component (e.g. TicketListPage, AdminDashboard) */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Default export allows importing AppLayout without curly braces if preferred
export default AppLayout;
