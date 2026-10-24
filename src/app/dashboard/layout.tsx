'use client';

import React from 'react';
import { DashboardProvider, useDashboard } from './DashboardContext';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import { MobileNav } from './components/MobileNav';
import { ProjectDrawer } from './components/ProjectDrawer';
import { ClientDrawer } from './components/ClientDrawer';
import { Modals } from './components/Modals';
import { AuthScreen } from '@/components/AuthScreen';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    isMounted,
    authUser,
    setAuthUser,
    authInitialMode,
    authInitialEmail,
    loadData,
    theme,
    toggleTheme,
    isSidebarCollapsed,
    isPrivacyOn,
    activeProjectDrawerId,
    activeClientDrawerId,
    closeDrawer,
  } = useDashboard();

  if (!isMounted) return null;

  if (!authUser) {
    return (
      <div key="page-auth" className="page-view-transition">
        <AuthScreen
          onSuccess={(user) => {
            setAuthUser(user);
            loadData(user.email);
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
          initialMode={authInitialMode}
          initialEmail={authInitialEmail}
        />
      </div>
    );
  }

  return (
    <div key="page-dashboard" className={`app page-view-transition ${isSidebarCollapsed ? 'c' : ''}${isPrivacyOn ? ' privacy-on' : ''}`}>
      <MobileHeader />
      <Sidebar />
      <main id="main">
        {children}
      </main>

      {/* Overlay for Drawers */}
      <div
        className={`ov ${activeProjectDrawerId || activeClientDrawerId ? 'on' : ''}`}
        id="ov"
        onClick={closeDrawer}
      />

      <ProjectDrawer />
      <ClientDrawer />
      <Modals />
      <MobileNav />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
