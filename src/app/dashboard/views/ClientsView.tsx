'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { rp } from '@/lib/formatters';

export function ClientsView() {
  const {
    clients,
    projects,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    getProjectPaidAmount,
    setActiveClientDrawerId,
    handleStartNewProject,
  } = useDashboard();

  const q = searchQuery.toLowerCase();
  const filtered = clients.filter(
    (c) => (c.name + c.co + c.mail).toLowerCase().indexOf(q) > -1
  );
  const rows = filtered.map((c) => {
    const ps = projects.filter((p) => p.c === c.id);
    const total = ps.reduce((acc, p) => acc + p.v, 0);
    const paid = ps.reduce((acc, p) => acc + getProjectPaidAmount(p), 0);
    const progress = total ? Math.round((paid / total) * 100) : 0;
    return { c, count: ps.length, paid, total, progress };
  });

  return (
    <div>
      <div className="top">
        <h1>Clients</h1>
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

      {!filtered.length ? (
        <div className="empty">No clients found</div>
      ) : (
        <>
          <div className="tw tw-desktop-only">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th className="r">Projects</th>
                  <th>Paid progress</th>
                  <th className="r">Paid</th>
                  <th className="r">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, count, paid, total, progress }) => (
                  <tr
                    key={c.id}
                    tabIndex={0}
                    onClick={() => setActiveClientDrawerId(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveClientDrawerId(c.id);
                    }}
                  >
                    <td className="wrap">
                      <b className="client-name">{c.name}</b>
                      {c.co && <div className="mut client-co">{c.co}</div>}
                    </td>
                    <td className="wrap mut client-contact">
                      {c.mail && <div>{c.mail}</div>}
                      {c.tel && <div>{c.tel}</div>}
                      {!c.mail && !c.tel && '-'}
                    </td>
                    <td className="r">{count}</td>
                    <td>
                      <div className="pg client-pg">
                        <div className="prog">
                          <i style={{ width: `${progress}%` }} />
                        </div>
                        <span className="mut client-pct">{progress}%</span>
                      </div>
                    </td>
                    <td className="r">{rp(paid)}</td>
                    <td className="r">
                      <b>{rp(total)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Clients Card List (<= 768px) */}
          <div className="mob-card-list">
            {rows.map(({ c, count, paid, total, progress }) => (
              <div
                key={c.id}
                className="mob-item-card"
                onClick={() => setActiveClientDrawerId(c.id)}
              >
                <div className="mob-item-top">
                  <div style={{ minWidth: 0 }}>
                    <div className="mob-item-title">{c.name}</div>
                    <div className="mob-item-sub">
                      {[c.co, `${count} ${count === 1 ? 'project' : 'projects'}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <span className="mob-item-val">{rp(total)}</span>
                </div>
                <div className="mob-item-bottom">
                  <div className="pg client-pg" style={{ flex: 1 }}>
                    <div className="prog">
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <span className="mut client-pct">{progress}%</span>
                  </div>
                  <span className="mut" style={{ fontSize: '11.5px' }}>
                    Paid {rp(paid)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
