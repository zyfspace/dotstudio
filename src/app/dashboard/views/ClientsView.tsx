'use client';

import React, { useEffect, useState } from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { idShort } from '@/lib/formatters';

const RING_C = 2 * Math.PI * 15;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

function PaidRing({ pct }: { pct: number }) {
  return (
    <svg className="cl-ring" width="56" height="56" viewBox="0 0 36 36" role="img" aria-label={`${pct}% paid`}>
      <circle cx="18" cy="18" r="15" className="cl-ring-track" />
      {pct > 0 && (
        <circle
          cx="18"
          cy="18"
          r="15"
          transform="rotate(-90 18 18)"
          className="cl-ring-bar"
          strokeDasharray={`${((RING_C * pct) / 100).toFixed(1)} ${RING_C.toFixed(1)}`}
        />
      )}
    </svg>
  );
}

const EMPTY_FORM = { name: '', co: '', mail: '', tel: '' };

export function ClientsView() {
  const {
    clients,
    projects,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    getProjectPaidAmount,
    setActiveClientDrawerId,
    ensureClient,
  } = useDashboard();

  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  // Open the add form when arriving from the sidebar "New client" action
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === '1') {
      setIsAdding(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const closeAdd = () => {
    setIsAdding(false);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFormError('Client name is required.');
      return;
    }
    if (clients.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setFormError('A client with this name already exists.');
      return;
    }
    ensureClient({ cn: name, co: form.co.trim(), mail: form.mail.trim(), tel: form.tel.trim() });
    closeAdd();
  };

  const allRows = clients.map((c) => {
    const ps = projects.filter((p) => p.c === c.id);
    const total = ps.reduce((acc, p) => acc + p.v, 0);
    const paid = ps.reduce((acc, p) => acc + getProjectPaidAmount(p), 0);
    const progress = total ? Math.min(100, Math.round((paid / total) * 100)) : 0;
    return { c, count: ps.length, paid, outstanding: Math.max(0, total - paid), total, progress };
  });
  const lifetimePaid = allRows.reduce((acc, r) => acc + r.paid, 0);

  const q = searchQuery.toLowerCase();
  const rows = allRows.filter(({ c }) => (c.name + c.co + c.mail).toLowerCase().includes(q));

  return (
    <div className="cl-page">
      <div className="crumbs">
        <span>Workspace</span>
        <span aria-hidden="true">/</span>
        <b>Clients</b>
      </div>

      <div className="page-head">
        <div className="page-title">
          <h1>Clients</h1>
          <p>
            {clients.length} {clients.length === 1 ? 'client' : 'clients'} ·{' '}
            <span className="pv">Rp {idShort(lifetimePaid)}</span> paid lifetime
          </p>
        </div>
        <label className="page-search">
          <Icon name="search" size={15} />
          <input
            ref={searchInputRef}
            id="q"
            placeholder="Search clients"
            aria-label="Search clients"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button className="page-btn" id="add" onClick={() => setIsAdding(true)}>
          <Icon name="plus" size={15} />
          Add client
        </button>
      </div>

      {!rows.length ? (
        <div className="empty">{clients.length ? 'No clients match your search' : 'No clients yet'}</div>
      ) : (
        <div className="cl-grid">
          {rows.map(({ c, count, paid, outstanding, progress }) => (
            <button
              key={c.id}
              type="button"
              className="cl-card"
              onClick={() => setActiveClientDrawerId(c.id)}
            >
              <div className="cl-card-top">
                <span className="cl-ini">{initials(c.name)}</span>
                <span className="cl-who">
                  <span className="cl-name">{c.name}</span>
                  {c.co && <span className="cl-co">{c.co}</span>}
                </span>
                <Icon name="upright" size={16} className="cl-go" />
              </div>

              <div className="cl-card-mid">
                <PaidRing pct={progress} />
                <div className="cl-stats">
                  <div>
                    Paid
                    <b className="pv">{idShort(paid)}</b>
                  </div>
                  <div>
                    Outstanding
                    <b className="pv">{idShort(outstanding)}</b>
                  </div>
                  <div className="cl-meta">
                    {count} {count === 1 ? 'project' : 'projects'} · {progress}% paid
                  </div>
                </div>
              </div>

              <div className="cl-card-foot">
                <span>{c.mail || 'No email'}</span>
                <span>{c.tel || 'No phone'}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {isAdding && (
        <div
          className="pin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAdd();
          }}
        >
          <form
            className="pin-modal-card cl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-btn-title"
            onSubmit={submitAdd}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeAdd();
            }}
          >
            <div>
              <h3 id="page-btn-title">Add client</h3>
              <p>Save their contact now and add projects whenever you are ready.</p>
            </div>
            <div className="f">
              <label htmlFor="ncn">Name</label>
              <input
                id="ncn"
                type="text"
                autoFocus
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setFormError('');
                }}
              />
            </div>
            <div className="f">
              <label htmlFor="ncc">Company</label>
              <input
                id="ncc"
                type="text"
                value={form.co}
                onChange={(e) => setForm({ ...form, co: e.target.value })}
              />
            </div>
            <div className="two">
              <div className="f">
                <label htmlFor="ncm">Email</label>
                <input
                  id="ncm"
                  type="email"
                  value={form.mail}
                  onChange={(e) => setForm({ ...form, mail: e.target.value })}
                />
              </div>
              <div className="f">
                <label htmlFor="nct">Phone</label>
                <input
                  id="nct"
                  type="tel"
                  value={form.tel}
                  onChange={(e) => setForm({ ...form, tel: e.target.value })}
                />
              </div>
            </div>
            {formError && <div className="cl-err">{formError}</div>}
            <div className="cl-modal-actions">
              <button type="button" className="btn" onClick={closeAdd}>
                Cancel
              </button>
              <button type="submit" className="btn pri">
                Add client
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
