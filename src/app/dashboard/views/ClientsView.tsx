'use client';

import React, { useState } from 'react';
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

  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const q = searchQuery.toLowerCase();
  const filtered = clients.filter(
    (c) => (c.name + c.co + c.mail).toLowerCase().indexOf(q) > -1
  );

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
        <div className="grid clients-grid">
          {filtered.map((c) => {
            const ps = projects.filter((p) => p.c === c.id);
            const v = ps.reduce((acc, p) => acc + p.v, 0);
            const g = ps.reduce(
              (acc, p) => acc + getProjectPaidAmount(p),
              0
            );
            const progress = v ? Math.round((g / v) * 100) : 0;
            const isOpen = openIds.has(c.id);
            return (
              <div
                key={c.id}
                className={`card client-card${isOpen ? ' open' : ''}`}
              >
                {/* Header (toggle): Name, Company, Project Count, Chevron */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => toggle(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggle(c.id);
                    }
                  }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <b className="client-name">
                      {c.name}
                    </b>
                    {c.co && (
                      <div className="mut client-co">
                        {c.co}
                      </div>
                    )}
                  </div>
                  <span className="client-count">
                    {ps.length} {ps.length === 1 ? 'project' : 'projects'}
                  </span>
                  <span className="client-chev" aria-hidden>
                    <Icon name="chevron" size={16} />
                  </span>
                </div>

                <div className="client-body" aria-hidden={!isOpen}>
                  <div className="client-body-in">

                {/* Contact Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {c.mail && (
                    <div className="mut kv client-contact">
                      <Icon name="mail" size={13} />
                      <span>
                        {c.mail}
                      </span>
                    </div>
                  )}
                  {c.tel && (
                    <div className="mut kv client-contact">
                      <Icon name="phone" size={13} />
                      <span>
                        {c.tel}
                      </span>
                    </div>
                  )}
                  {!c.mail && !c.tel && (
                    <div className="mut client-contact">No contact info</div>
                  )}
                </div>

                {/* Financial Summary & Progress */}
                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="pg" style={{ margin: 0, gap: '8px', alignItems: 'center' }}>
                    <div className="prog" style={{ flex: 1, margin: 0, height: '4px' }}>
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <span className="mut client-pct">
                      {progress}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="mut client-stat-label">Paid</div>
                      <div className="client-stat-val">
                        {rp(g)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 0 }}>
                      <div className="mut client-stat-label">Total</div>
                      <div className="client-stat-val">
                        {rp(v)}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  className="btn"
                  onClick={() => setActiveClientDrawerId(c.id)}
                  tabIndex={isOpen ? 0 : -1}
                  style={{ alignSelf: 'flex-start' }}
                >
                  View details
                </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
