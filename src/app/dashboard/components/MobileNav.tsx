'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { setAuthSession } from '@/lib/auth';

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    authUser,
    setAuthUser,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    closeDrawer,
    setFilterStatus,
    setSearchQuery,
  } = useDashboard();

  const isTabActive = (tab: string) => {
    if (tab === 'overview') return pathname === '/dashboard';
    if (tab === 'projects') return pathname.startsWith('/dashboard/projects') || pathname === '/dashboard/new';
    if (tab === 'clients') return pathname.startsWith('/dashboard/clients');
    if (tab === 'invoices') return pathname.startsWith('/dashboard/invoices');
    if (tab === 'quotations') return pathname.startsWith('/dashboard/quotations') || pathname === '/dashboard/quote';
    if (tab === 'payments') return pathname.startsWith('/dashboard/payments');
    if (tab === 'settings') return pathname.startsWith('/dashboard/settings');
    return false;
  };

  const isMoreActive =
    isMobileMenuOpen ||
    isTabActive('quotations') ||
    isTabActive('payments') ||
    isTabActive('settings');

  const handleNavClick = () => {
    setFilterStatus('All');
    setSearchQuery('');
    closeDrawer();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const mainEl = document.querySelector('.app main') || document.getElementById('main');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="mob-bottom-nav" aria-label="Mobile Navigation">
        <Link
          href="/dashboard"
          className={`mob-nav-item ${isTabActive('overview') ? 'active' : ''}`}
          onClick={handleNavClick}
          style={{ textDecoration: 'none' }}
        >
          <Icon name="chart" size={18} />
          <span>Overview</span>
        </Link>

        <Link
          href="/dashboard/projects"
          className={`mob-nav-item ${isTabActive('projects') ? 'active' : ''}`}
          onClick={handleNavClick}
          style={{ textDecoration: 'none' }}
        >
          <Icon name="briefcase" size={18} />
          <span>Projects</span>
        </Link>

        <Link
          href="/dashboard/clients"
          className={`mob-nav-item ${isTabActive('clients') ? 'active' : ''}`}
          onClick={handleNavClick}
          style={{ textDecoration: 'none' }}
        >
          <Icon name="users" size={18} />
          <span>Clients</span>
        </Link>

        <Link
          href="/dashboard/invoices"
          className={`mob-nav-item ${isTabActive('invoices') ? 'active' : ''}`}
          onClick={handleNavClick}
          style={{ textDecoration: 'none' }}
        >
          <Icon name="file" size={18} />
          <span>Invoices</span>
        </Link>


        <button
          type="button"
          className={`mob-nav-item ${isMoreActive ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Icon name="dots" size={18} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Menu Drawer Sheet */}
      <div
        className={`mob-menu-overlay ${isMobileMenuOpen ? 'on' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div className={`mob-menu-drawer ${isMobileMenuOpen ? 'on' : ''}`}>
        <div className="mob-menu-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>Others</div>
            <div style={{ fontSize: '12px', color: 'var(--mut)' }}>{authUser?.email || 'Freelance Workspace'}</div>
          </div>
          <button
            type="button"
            className="ib"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleNavClick();
              router.push('/dashboard/quotations');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              textAlign: 'left',
              background: isTabActive('quotations') ? 'var(--soft)' : 'transparent',
              color: 'var(--fg)',
              fontSize: '13.5px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Icon name="quote" size={16} />
            <span>Quotations</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleNavClick();
              router.push('/dashboard/payments');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              textAlign: 'left',
              background: isTabActive('payments') ? 'var(--soft)' : 'transparent',
              color: 'var(--fg)',
              fontSize: '13.5px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Icon name="coins" size={16} />
            <span>Payments &amp; Income</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleNavClick();
              router.push('/dashboard/settings');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              textAlign: 'left',
              background: isTabActive('settings') ? 'var(--soft)' : 'transparent',
              color: 'var(--fg)',
              fontSize: '13.5px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Icon name="settings" size={16} />
            <span>Settings &amp; Branding</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setAuthSession(null);
              setAuthUser(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              textAlign: 'left',
              background: 'transparent',
              color: '#ef4444',
              fontSize: '13.5px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Icon name="logout" size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
