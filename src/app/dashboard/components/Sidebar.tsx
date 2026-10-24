'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { DotStudioPaperLogo } from '@/components/Logo';
import { setAuthSession } from '@/lib/auth';

export function Sidebar() {
  const pathname = usePathname();
  const {
    isSidebarCollapsed,
    toggleSidebar,
    projects,
    clients,
    theme,
    toggleTheme,
    setAuthUser,
    closeDrawer,
    setFilterStatus,
    setSearchQuery,
  } = useDashboard();

  const getActiveNavKey = () => {
    if (pathname === '/dashboard') return 'overview';
    if (pathname.startsWith('/dashboard/projects') || pathname === '/dashboard/new') return 'projects';
    if (pathname.startsWith('/dashboard/clients')) return 'clients';
    if (pathname.startsWith('/dashboard/payments')) return 'payments';
    if (
      pathname.startsWith('/dashboard/invoices') ||
      pathname.startsWith('/dashboard/quotations') ||
      pathname === '/dashboard/quote'
    ) return 'invoices';
    if (pathname.startsWith('/dashboard/settings')) return 'settings';
    return '';
  };

  const activeNavKey = getActiveNavKey();

  const handleNavClick = () => {
    setFilterStatus('All');
    setSearchQuery('');
    closeDrawer();
  };

  return (
    <aside>
      <div className="brand">
        {!isSidebarCollapsed && <DotStudioPaperLogo height={20} />}
        <div className="brand-actions">
          <button
            className="ib"
            id="tg"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Icon name="side" size={17} />
            <span className="sidebar-tooltip">
              {isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </span>
          </button>
        </div>
      </div>

      <Link
        href="/dashboard"
        className={`nav ${activeNavKey === 'overview' ? 'on' : ''}`}
        onClick={handleNavClick}
        style={{ textDecoration: 'none' }}
      >
        <Icon name="home" size={17} />
        <span className="lb">Overview</span>
        <span className="sidebar-tooltip">Overview</span>
      </Link>

      <Link
        href="/dashboard/projects"
        className={`nav ${activeNavKey === 'projects' ? 'on' : ''}`}
        onClick={handleNavClick}
        style={{ textDecoration: 'none' }}
      >
        <Icon name="folder" size={17} />
        <span className="lb">Projects</span>
        <em>{projects.length}</em>
        <span className="sidebar-tooltip">Projects</span>
      </Link>

      <Link
        href="/dashboard/clients"
        className={`nav ${activeNavKey === 'clients' ? 'on' : ''}`}
        onClick={handleNavClick}
        style={{ textDecoration: 'none' }}
      >
        <Icon name="users" size={17} />
        <span className="lb">Clients</span>
        <em>{clients.length}</em>
        <span className="sidebar-tooltip">Clients</span>
      </Link>

      <Link
        href="/dashboard/payments"
        className={`nav ${activeNavKey === 'payments' ? 'on' : ''}`}
        onClick={handleNavClick}
        style={{ textDecoration: 'none' }}
      >
        <Icon name="wallet" size={17} />
        <span className="lb">Payments</span>
        <span className="sidebar-tooltip">Payments</span>
      </Link>

      <Link
        href="/dashboard/invoices"
        className={`nav ${activeNavKey === 'invoices' ? 'on' : ''}`}
        onClick={handleNavClick}
        style={{ textDecoration: 'none' }}
      >
        <Icon name="file" size={17} />
        <span className="lb">Documents</span>
        <span className="sidebar-tooltip">Invoices &amp; quotations</span>
      </Link>

      <Link
        href="/dashboard/settings"
        className={`nav ${activeNavKey === 'settings' ? 'on' : ''}`}
        onClick={handleNavClick}
        style={{ textDecoration: 'none' }}
      >
        <Icon name="settings" size={17} />
        <span className="lb">Settings</span>
        <span className="sidebar-tooltip">Settings</span>
      </Link>


      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <button
          className="nav"
          id="th"
          onClick={toggleTheme}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          <span className="lb">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          <span className="sidebar-tooltip">
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </span>
        </button>

        <button
          className="nav"
          onClick={() => {
            setAuthSession(null);
            setAuthUser(null);
          }}
          title="Log out"
        >
          <Icon name="logout" size={17} />
          <span className="lb">Log out</span>
          <span className="sidebar-tooltip">Log out</span>
        </button>
      </div>
    </aside>
  );
}
