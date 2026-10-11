'use client';

import React from 'react';
import { useDashboard, STATUS_LABELS } from '../DashboardContext';
import { Project } from '@/types';
import { Icon } from '@/components/Icons';
import { rp, dt, isOverdue } from '@/lib/formatters';

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
        <div className="chips" style={{ marginTop: 0 }}>
          {(['All', 'Pending', 'Progress', 'Finished'] as const).map(
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
                  className={`chip ${filterStatus === s ? 'on' : ''}`}
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
                  <th className="s r" onClick={() => toggleSort('v')}>
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
                      <td>{p.name}</td>
                      <td>
                        <span>{c.name}</span>
                        {c.co && <span className="mut"> · {c.co}</span>}
                      </td>
                      <td>
                        <span className={`st ${st}`}>
                          {STATUS_LABELS[st]}
                        </span>
                      </td>
                      <td className="mut">{dt(p.due)}</td>
                      <td>
                        <div className="pg">
                          <div className="prog">
                            <i style={{ width: `${pctVal}%` }} />
                          </div>
                          <span className="mut">{pctVal}%</span>
                        </div>
                      </td>
                      <td className="r">{rp(p.v)}</td>
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
              return (
                <div
                  key={p.id}
                  className="mob-item-card"
                  onClick={() => setActiveProjectDrawerId(p.id)}
                >
                  <div className="mob-item-top">
                    <div style={{ minWidth: 0 }}>
                      <div className="mob-item-title">{p.name}</div>
                      <div className="mob-item-sub">
                        {c.name}{c.co ? ` · ${c.co}` : ''}
                      </div>
                    </div>
                    <span className={`st ${st}`} style={{ fontSize: '11.5px', flexShrink: 0 }}>
                      {STATUS_LABELS[st]}
                    </span>
                  </div>

                  <div className="pg" style={{ margin: '2px 0 4px', gap: '8px' }}>
                    <div className="prog" style={{ height: '4px' }}>
                      <i style={{ width: `${pctVal}%` }} />
                    </div>
                    <span className="mut" style={{ fontSize: '11px', fontVariantNumeric: 'tabular-nums' }}>
                      {pctVal}%
                    </span>
                  </div>

                  <div className="mob-item-bottom">
                    <span className={overdue ? 'od' : 'mut'} style={{ fontSize: '12px' }}>
                      {overdue ? 'Overdue: ' : 'Due: '}{dt(p.due)}
                    </span>
                    <span className="mob-item-val">{rp(p.v)}</span>
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
