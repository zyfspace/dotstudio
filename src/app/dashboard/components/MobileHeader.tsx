'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { DotStudioPaperLogo } from '@/components/Logo';

export function MobileHeader() {
  const pathname = usePathname();
  const { theme, toggleTheme, setIsMobileMenuOpen, docState } = useDashboard();

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/dashboard/new') return 'New Project';
    if (pathname === '/dashboard/quote') return 'New Quote';
    if (pathname.startsWith('/dashboard/invoices')) return 'Documents';
    if (pathname.startsWith('/dashboard/doc')) {
      return docState?.t === 'inv' ? 'Invoice' : 'Quotation';
    }
    const segment = pathname.replace('/dashboard/', '');
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <header className="mob-header">
      <div className="mob-header-left">
        <DotStudioPaperLogo height={18} />
        <span
          className="mob-header-sep"
          style={{
            color: 'var(--mut)',
            opacity: 0.4,
            margin: '0 2px 0 6px',
            fontSize: '13px',
          }}
        >
          /
        </span>
        <span className="mob-header-title">{getPageTitle()}</span>
      </div>
      <div className="mob-header-right">
        <button
          type="button"
          className="ib"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
        </button>
        <button
          type="button"
          className="ib"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <Icon name="side" size={18} />
        </button>
      </div>
    </header>
  );
}
