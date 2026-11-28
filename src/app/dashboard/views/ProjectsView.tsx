'use client';

import React, { useState } from 'react';
import { useDashboard } from '../DashboardContext';
import { Project } from '@/types';
import { Icon } from '@/components/Icons';
import { today, isOverdue } from '@/lib/formatters';
import { Pager, usePagination } from '@/components/Pager';
import { Money } from '@/components/Money';

type View = 'Pending' | 'Progress' | 'Overdue' | 'Finished' | 'Cancelled';

const VIEW_LABELS: Record<View, string> = {
  Pending: 'Not started',
  Progress: 'In progress',
  Overdue: 'Overdue',
  Finished: 'Completed',
  Cancelled: 'Cancelled',
};

// "In progress" also holds projects that have not started yet, so the tabs add up to All
const TABS: { id: string; label: string; views: View[] }[] = [
  { id: 'All', label: 'All', views: ['Pending', 'Progress', 'Overdue', 'Finished', 'Cancelled'] },
  { id: 'Progress', label: 'In progress', views: ['Pending', 'Progress'] },
  { id: 'Overdue', label: 'Overdue', views: ['Overdue'] },
  { id: 'Finished', label: 'Completed', views: ['Finished'] },
  { id: 'Cancelled', label: 'Cancelled', views: ['Cancelled'] },
];

const shortDate = (s: string) => {
  const d = new Date(s + 'T00:00');
  if (isNaN(d.getTime())) return 'No date';
  const sameYear = s.slice(0, 4) === today().slice(0, 4);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
};

// Earliest unpaid installment, described the way the table shows it
const nextPayment = (p: Project, view: View) => {
  if (view === 'Cancelled') return { text: 'Cancelled', late: false };
  if (!p.plan.length) return { text: 'No plan', late: false };
  const next = p.plan
    .filter((i) => !i.paid && !i.cancelled)
    .sort((a, b) => (a.due || '9').localeCompare(b.due || '9'))[0];
  if (!next) return { text: 'All settled', late: false };
  if (isOverdue(next.due)) {
    const days = Math.round((Date.parse(today()) - Date.parse(next.due)) / 86_400_000);
    return { text: `${next.l} · ${days} day${days > 1 ? 's' : ''} late`, late: true };
  }
  return { text: `${next.l} · ${next.due ? shortDate(next.due) : 'No date'}`, late: false };
};

export function ProjectsView() {
  const {
    projects,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    filterStatus,
    setFilterStatus,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    getClient,
    getProjectStatus,
    getProjectPct,
    setActiveProjectDrawerId,
    handleStartNewProject,
  } = useDashboard();

  // Mobile cards: one open at a time
  const [openId, setOpenId] = useState<number | null>(null);
  const toggleCard = (id: number) => setOpenId((cur) => (cur === id ? null : id));

  const toggleSort = (k: 'name' | 'due' | 'pg' | 'v') => {
    if (sortKey === k) {
      setSortDir((d) => -d);
    } else {
      setSortKey(k);
      setSortDir(1);
    }
  };

  const getView = (p: Project): View => {
    const status = getProjectStatus(p);
    if (status === 'Finished' || status === 'Cancelled') return status;
    return p.plan.some((i) => !i.cancelled && isOverdue(i.due, i.paid)) ? 'Overdue' : status;
  };

  const tab = TABS.find((t) => t.id === filterStatus) || TABS[0];

  const q = searchQuery.toLowerCase();
  const filtered = projects.filter((p) => {
    const c = getClient(p.c);
    return tab.views.includes(getView(p)) && (p.name + c.name + c.co).toLowerCase().indexOf(q) > -1;
  });

  filtered.sort((a, b) => {
    const f =
      sortKey === 'v'
        ? (p: Project) => p.v
        : sortKey === 'name'
          ? (p: Project) => p.name
          : sortKey === 'pg'
            ? getProjectPct
            : (p: Project) => p.due || '9';
    const x = f(a);
    const y = f(b);
    return (x > y ? 1 : x < y ? -1 : 0) * sortDir;
  });

  const { pageItems, ...pager } = usePagination(filtered, `${q}|${tab.id}|${sortKey}|${sortDir}`);
  const totalValue = projects.reduce((acc, p) => acc + p.v, 0);
  const arrow = (k: string) => (sortKey === k ? (sortDir > 0 ? ' ↑' : ' ↓') : '');

  return (
    <div className="prj-page">
      <div className="crumbs">
        <span>Workspace</span>
        <span aria-hidden="true">/</span>
        <b>Projects</b>
      </div>

      <div className="page-head">
        <div className="page-title">
          <h1>Projects</h1>
          <p>
            {projects.length} {projects.length === 1 ? 'project' : 'projects'} · <Money v={totalValue} /> total value
          </p>
        </div>
        <label className="page-search">
          <Icon name="search" size={15} />
          <input
            ref={searchInputRef}
            id="q"
            placeholder="Search projects"
            aria-label="Search projects"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button className="page-btn" id="add" onClick={() => handleStartNewProject()}>
          <Icon name="plus" size={15} />
          New project
        </button>
      </div>

      <div className="seg" role="tablist" aria-label="Filter projects">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab.id === t.id}
            className={tab.id === t.id ? 'on' : ''}
            onClick={() => setFilterStatus(t.id)}
          >
            {t.label}
            <em>{projects.filter((p) => t.views.includes(getView(p))).length}</em>
          </button>
        ))}
      </div>

      {/* Table */}
      {!filtered.length ? (
        <div className="empty">No projects found</div>
      ) : (
        <>
          <div className="pay-table-wrap">
            <table className="pay-table">
              <thead>
                <tr>
                  <th className="s" onClick={() => toggleSort('name')}>Project{arrow('name')}</th>
                  <th>Status</th>
                  <th className="s prj-paid" onClick={() => toggleSort('pg')}>Paid / outstanding{arrow('pg')}</th>
                  <th className="s" onClick={() => toggleSort('due')}>Next payment{arrow('due')}</th>
                  <th className="s r" onClick={() => toggleSort('v')}>Value{arrow('v')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => {
                  const c = getClient(p.c);
                  const view = getView(p);
                  const next = nextPayment(p, view);
                  return (
                    <tr key={p.id} onClick={() => setActiveProjectDrawerId(p.id)}>
                      <td>
                        <div className="pay-inst-name proj-name">
                          {p.name}
                          <AddOnChip project={p} />
                        </div>
                        <div className="pay-inst-sub">
                          {c.name}{c.co ? ` · ${c.co}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className={`prj-chip is-${view}`}>{VIEW_LABELS[view]}</span>
                      </td>
                      <td>
                        <ProgressBar project={p} status={getProjectStatus(p)} pct={getProjectPct(p)} />
                      </td>
                      <td className={`pay-date${next.late ? ' is-late' : ''}`}>{next.text}</td>
                      <td className="r pay-amt"><Money v={p.v} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (<= 768px) */}
          <div className="mob-card-list">
            {pageItems.map((p) => {
              const c = getClient(p.c);
              const st = getProjectStatus(p);
              const pctVal = getProjectPct(p);
              const view = getView(p);
              const next = nextPayment(p, view);
              const isOpen = openId === p.id;
              return (
                <div
                  key={p.id}
                  className={`mob-item-card mob-toggle${isOpen ? ' open' : ''}`}
                >
                  <div
                    className="mob-item-top"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => toggleCard(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCard(p.id);
                      }
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="mob-item-title proj-name">
                        {p.name}
                        <AddOnChip project={p} />
                      </div>
                      <div className="mob-item-sub">
                        {c.name}{c.co ? ` · ${c.co}` : ''}
                      </div>
                    </div>
                    <span className={`prj-chip is-${view}`}>{VIEW_LABELS[view]}</span>
                    <span className="client-chev" aria-hidden>
                      <Icon name="chevron" size={16} />
                    </span>
                  </div>

                  <div className="mob-toggle-body" aria-hidden={!isOpen}>
                    <div className="mob-toggle-in">
                      <ProgressBar project={p} status={st} pct={pctVal} compact />

                      <div className="mob-item-bottom">
                        <span className={`pay-date${next.late ? ' is-late' : ''}`} style={{ fontSize: '12px' }}>
                          {next.text}
                        </span>
                        <span className="mob-item-val"><Money v={p.v} /></span>
                      </div>

                      <button
                        className="btn"
                        onClick={() => setActiveProjectDrawerId(p.id)}
                        tabIndex={isOpen ? 0 : -1}
                        style={{ alignSelf: 'flex-start', fontSize: '12.5px' }}
                      >
                        View details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pager {...pager} />
        </>
      )}
    </div>
  );
}

// Received bar. A cancelled project shows what was paid against the original
// contract (paid + cancelled installments), with the dropped share faded.
function ProgressBar({
  project,
  status,
  pct,
  compact,
}: {
  project: Project;
  status: string;
  pct: number;
  compact?: boolean;
}) {
  const cancelledAmt = project.plan.filter((i) => i.cancelled).reduce((s, i) => s + i.a, 0);
  const isCancelled = status === 'Cancelled' && cancelledAmt > 0;
  const original = project.v + cancelledAmt;
  const paidPct = isCancelled && original ? Math.round((project.v / original) * 100) : pct;

  return (
    <div className="pg" style={compact ? { margin: '2px 0 4px', gap: '8px' } : undefined}>
      <div
        className={`prog${isCancelled ? ' prog-cancel' : ''}`}
        tabIndex={isCancelled ? 0 : undefined}
        aria-label={isCancelled ? 'Cancelled after the down payment' : undefined}
        onClick={isCancelled ? (e) => e.stopPropagation() : undefined}
      >
        <i style={{ width: `${paidPct}%` }} />
        {isCancelled && (
          <>
            <b style={{ width: `${100 - paidPct}%` }} />
            <span className="prog-tip">Cancelled after the down payment</span>
          </>
        )}
      </div>
      <span
        className="mut num"
        style={compact ? { fontSize: '11px', fontVariantNumeric: 'tabular-nums' } : undefined}
      >
        {paidPct}%
      </span>
    </div>
  );
}

// Marks a main project that has additional services; details live in its drawer.
function AddOnChip({ project }: { project: Project }) {
  const count = (project.items || []).filter((it) => it.type === 'Additional').length;
  if (!count) return null;
  return (
    <span className="addon-chip" title={`${count} additional service${count > 1 ? 's' : ''}`}>
      <Icon name="plus" size={10} />
      {count} add-on{count > 1 ? 's' : ''}
    </span>
  );
}
