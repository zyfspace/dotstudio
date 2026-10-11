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
        <div className="grid">
          {filtered.map((c) => {
            const ps = projects.filter((p) => p.c === c.id);
            const v = ps.reduce((acc, p) => acc + p.v, 0);
            const g = ps.reduce(
              (acc, p) => acc + getProjectPaidAmount(p),
              0
            );
            const progress = v ? Math.round((g / v) * 100) : 0;
            return (
              <div
                key={c.id}
                className="card"
                onClick={() => setActiveClientDrawerId(c.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                {/* Header: Name, Company, & Project Count Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <b style={{ fontSize: '15px', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </b>
                    {c.co && (
                      <div className="mut" style={{ fontSize: '12.5px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.co}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--mut)',
                      background: 'var(--soft)',
                      border: '1px solid var(--line)',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {ps.length} {ps.length === 1 ? 'project' : 'projects'}
                  </span>
                </div>

                {/* Contact Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {c.mail && (
                    <div className="mut kv" style={{ padding: 0, fontSize: '12.5px' }}>
                      <Icon name="mail" size={13} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.mail}
                      </span>
                    </div>
                  )}
                  {c.tel && (
                    <div className="mut kv" style={{ padding: 0, fontSize: '12.5px' }}>
                      <Icon name="phone" size={13} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.tel}
                      </span>
                    </div>
                  )}
                  {!c.mail && !c.tel && (
                    <div className="mut" style={{ fontSize: '12.5px' }}>No contact info</div>
                  )}
                </div>

                {/* Financial Summary & Progress */}
                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="pg" style={{ margin: 0, gap: '8px', alignItems: 'center' }}>
                    <div className="prog" style={{ flex: 1, margin: 0, height: '4px' }}>
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <span className="mut" style={{ fontSize: '11px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {progress}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="mut" style={{ fontSize: '11px', marginBottom: '1px' }}>Paid</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {rp(g)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 0 }}>
                      <div className="mut" style={{ fontSize: '11px', marginBottom: '1px' }}>Total</div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {rp(v)}
                      </div>
                    </div>
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
