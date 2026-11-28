'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { setAuthSession } from '@/lib/auth';
import { today } from '@/lib/formatters';

type NavItem = {
  key: string;
  href: string;
  icon: string;
  label: string;
  count?: number;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'DS';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isSidebarCollapsed,
    toggleSidebar,
    projects,
    clients,
    quotes,
    authUser,
    studioProfile,
    theme,
    toggleTheme,
    setAuthUser,
    closeDrawer,
    setFilterStatus,
    setSearchQuery,
    searchInputRef,
    handleStartNewProject,
    handleStartNewQuote,
  } = useDashboard();

  const [menu, setMenu] = useState<'new' | 'user' | null>(null);
  const newRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      const box = menu === 'new' ? newRef.current : userRef.current;
      if (box && !box.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const focusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      return;
    }
    router.push('/dashboard/projects');
    setTimeout(() => searchInputRef.current?.focus(), 250);
  };

  // ⌘K / Ctrl+K jumps to the page search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const getActiveNavKey = () => {
    if (pathname === '/dashboard') return 'overview';
    if (pathname.startsWith('/dashboard/projects') || pathname === '/dashboard/new') return 'projects';
    if (pathname.startsWith('/dashboard/clients')) return 'clients';
    if (pathname.startsWith('/dashboard/payments')) return 'payments';
    if (pathname.startsWith('/dashboard/invoices')) return 'invoices';
    if (pathname.startsWith('/dashboard/quotations') || pathname === '/dashboard/quote') return 'quotations';
    if (pathname.startsWith('/dashboard/settings')) return 'settings';
    return '';
  };
  const activeNavKey = getActiveNavKey();

  const now = today();
  const duePayments = projects.reduce(
    (acc, p) => acc + p.plan.filter((it) => !it.paid && it.due && it.due <= now).length,
    0
  );
  const openQuotes = quotes.filter((q) => q.s !== 'Accepted').length;

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Workspace',
      items: [
        { key: 'overview', href: '/dashboard', icon: 'home', label: 'Overview' },
        { key: 'projects', href: '/dashboard/projects', icon: 'folder', label: 'Projects', count: projects.length },
        { key: 'clients', href: '/dashboard/clients', icon: 'users', label: 'Clients', count: clients.length },
      ],
    },
    {
      label: 'Money',
      items: [
        { key: 'payments', href: '/dashboard/payments', icon: 'wallet', label: 'Payments', count: duePayments },
        { key: 'invoices', href: '/dashboard/invoices', icon: 'file', label: 'Invoices' },
        { key: 'quotations', href: '/dashboard/quotations', icon: 'quote', label: 'Quotations', count: openQuotes },
      ],
    },
    {
      label: 'Studio',
      items: [{ key: 'settings', href: '/dashboard/settings', icon: 'settings', label: 'Settings' }],
    },
  ];

  const handleNavClick = () => {
    setFilterStatus('All');
    setSearchQuery('');
    closeDrawer();
  };

  const userName = studioProfile.ownerName?.trim() || authUser?.name || 'You';
  const studioName = studioProfile.studioName?.trim() || authUser?.studioName || 'Studio';

  return (
    <aside className="sb">
      <div className="sb-brand">
        <Link href="/dashboard" className="sb-logo" onClick={handleNavClick} aria-label="DotStudio home">
          <i aria-hidden="true" />
          <b>DotStudio</b>
        </Link>
        <button className="sb-ib" id="tg" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <Icon name="side" size={16} />
          <span className="sidebar-tooltip">
            {isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </span>
        </button>
      </div>

      <button className="sb-search" onClick={focusSearch} aria-label="Search or jump to">
        <Icon name="search" size={15} />
        <span className="lb sb-search-lb">Search or jump to</span>
        <kbd className="lb">⌘K</kbd>
        <span className="sidebar-tooltip">Search</span>
      </button>

      <div className="sb-pop-wrap" ref={newRef}>
        <button
          className="sb-new"
          onClick={() => setMenu(menu === 'new' ? null : 'new')}
          aria-haspopup="menu"
          aria-expanded={menu === 'new'}
        >
          <Icon name="plus" size={15} />
          <span className="lb">New</span>
          <span className="sidebar-tooltip">New</span>
        </button>
        {menu === 'new' && (
          <div className="sb-pop" role="menu">
            <button
              role="menuitem"
              onClick={() => {
                setMenu(null);
                handleStartNewProject();
              }}
            >
              <Icon name="folder" size={15} />
              New project
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setMenu(null);
                handleStartNewQuote();
              }}
            >
              <Icon name="file" size={15} />
              New quotation
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setMenu(null);
                handleNavClick();
                router.push('/dashboard/clients?add=1');
              }}
            >
              <Icon name="user" size={15} />
              New client
            </button>
          </div>
        )}
      </div>

      <nav className="sb-nav">
        {groups.map((g) => (
          <div className="sb-group" key={g.label}>
            <div className="sb-label">{g.label}</div>
            {g.items.map((it) => (
              <Link
                key={it.key}
                href={it.href}
                className={`nav ${activeNavKey === it.key ? 'on' : ''}`}
                onClick={handleNavClick}
                aria-current={activeNavKey === it.key ? 'page' : undefined}
              >
                <Icon name={it.icon} size={16} />
                <span className="lb">{it.label}</span>
                {!!it.count && <em>{it.count}</em>}
                <span className="sidebar-tooltip">{it.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sb-foot">
        <div className="sb-pop-wrap sb-user-wrap" ref={userRef}>
          <button
            className="sb-user"
            onClick={() => setMenu(menu === 'user' ? null : 'user')}
            aria-haspopup="menu"
            aria-expanded={menu === 'user'}
          >
            <span className="sb-avatar">{initials(userName)}</span>
            <span className="sb-user-meta lb">
              <span className="sb-user-name">{userName}</span>
              <span className="sb-user-sub">Owner · {studioName}</span>
            </span>
          </button>
          {menu === 'user' && (
            <div className="sb-pop sb-pop-up" role="menu">
              <button
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  handleNavClick();
                  router.push('/dashboard/settings');
                }}
              >
                <Icon name="settings" size={15} />
                Settings
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  setAuthSession(null);
                  setAuthUser(null);
                }}
              >
                <Icon name="logout" size={15} />
                Log out
              </button>
            </div>
          )}
        </div>

        <div className="sb-theme" role="group" aria-label="Theme">
          <button
            className={theme === 'light' ? 'on' : ''}
            aria-label="Light mode"
            aria-pressed={theme === 'light'}
            onClick={() => theme !== 'light' && toggleTheme()}
          >
            <Icon name="sun" size={14} />
          </button>
          <button
            className={theme === 'dark' ? 'on' : ''}
            aria-label="Dark mode"
            aria-pressed={theme === 'dark'}
            onClick={() => theme !== 'dark' && toggleTheme()}
          >
            <Icon name="moon" size={14} />
          </button>
        </div>

        <button className="sb-ib sb-theme-mini" onClick={toggleTheme} aria-label="Toggle theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          <span className="sidebar-tooltip">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </aside>
  );
}
