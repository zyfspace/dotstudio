'use client';

import React, { useState } from 'react';
import { useDashboard, STATUS_LABELS } from '../DashboardContext';
import { Project } from '@/types';
import { Icon } from '@/components/Icons';
import { dt, isOverdue } from '@/lib/formatters';
import { Money } from '@/components/Money';

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

  const q = searchQuery.toLowerCase();
  const filtered = projects.filter((p) => {
    const c = getClient(p.c);
    const status = getProjectStatus(p);
    const matchesFilter = filterStatus === 'All' || status === filterStatus;
    const matchesSearch =
      (p.name + c.name + c.co).toLowerCase().indexOf(q) > -1;
    return matchesFilter && matchesSearch;
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

  return (
    <div>
      <div className="top">
        <h1>Projects</h1>
        <label className="search">
          <Icon name="search" />
          <input
            ref={searchInputRef}
            id="q"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
          <kbd>/</kbd>
        </label>
        <button
          className="btn pri"
          id="add"
          onClick={() => handleStartNewProject()}
        >
          <Icon name="plus" />
          New project
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ margin: '0 0 14px' }}>
        <div className="seg seg-auto" role="group">
          {(['All', 'Pending', 'Progress', 'Finished', 'Cancelled'] as const).map(
            (s) => {
              const count =
                s === 'All'
                  ? projects.length
                  : projects.filter(
                    (p) => getProjectStatus(p) === s
                  ).length;
              const label =
                s === 'Progress'
                  ? 'In progress'
                  : s;
              return (
                <button
                  key={s}
                  className={filterStatus === s ? 'on' : ''}
                  onClick={() => setFilterStatus(s)}
                >
                  {label} · {count}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Table */}
      {!filtered.length ? (
        <div className="empty">No projects found</div>
      ) : (
        <>
          <div className="tw tw-desktop-only">
            <table>
              <thead>
                <tr>
                  <th className="s" onClick={() => toggleSort('name')}>
                    Project {sortKey === 'name' ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                  </th>
                  <th>Client</th>
                  <th>Status</th>
                  <th className="s" onClick={() => toggleSort('due')}>
                    Due {sortKey === 'due' ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                  </th>
                  <th className="s" onClick={() => toggleSort('pg')}>
                    Received {sortKey === 'pg' ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                  </th>
                  <th className="s" onClick={() => toggleSort('v')}>
                    Value {sortKey === 'v' ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const c = getClient(p.c);
                  const st = getProjectStatus(p);
                  const pctVal = getProjectPct(p);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setActiveProjectDrawerId(p.id)}
                    >
                      <td className="wrap">
                        <span className="proj-name">
                          {p.name}
                          <AddOnChip project={p} />
                        </span>
                      </td>
                      <td className="wrap">
                        <div className="cell-two">
                          <span>{c.name}</span>
                          {c.co && <span className="mut">{c.co}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`st ${st}`}>
                          {STATUS_LABELS[st]}
                        </span>
                      </td>
                      <td className="mut num">{dt(p.due)}</td>
                      <td>
                        <ProgressBar project={p} status={st} pct={pctVal} />
                      </td>
                      <td><Money v={p.v} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (<= 768px) */}
          <div className="mob-card-list">
            {filtered.map((p) => {
              const c = getClient(p.c);
              const st = getProjectStatus(p);
              const pctVal = getProjectPct(p);
              const overdue = isOverdue(p.due, st === 'Finished');
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
                    <span className={`st ${st}`} style={{ fontSize: '11.5px', flexShrink: 0 }}>
                      {STATUS_LABELS[st]}
                    </span>
                    <span className="client-chev" aria-hidden>
                      <Icon name="chevron" size={16} />
                    </span>
                  </div>

                  <div className="mob-toggle-body" aria-hidden={!isOpen}>
                    <div className="mob-toggle-in">
                      <ProgressBar project={p} status={st} pct={pctVal} compact />

                      <div className="mob-item-bottom">
                        <span className={overdue ? 'od' : 'mut'} style={{ fontSize: '12px' }}>
                          {overdue ? 'Overdue: ' : 'Due: '}{dt(p.due)}
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
