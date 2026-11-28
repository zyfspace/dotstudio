'use client';

import React, { useRef, useState } from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { DatePicker } from '@/components/DatePicker';
import { rp, today } from '@/lib/formatters';
import type { PlanItem, Project } from '@/types';

type Kind = 'late' | 'out' | 'paid';
type Tab = 'all' | 'out' | 'paid' | 'proof';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'out', label: 'Outstanding' },
  { key: 'paid', label: 'Paid' },
  { key: 'proof', label: 'Needs proof' },
];

const shortDate = (s?: string) => {
  if (!s) return '';
  const d = new Date(s + 'T00:00');
  if (isNaN(d.getTime())) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
};

const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to + 'T00:00').getTime() - new Date(from + 'T00:00').getTime()) / 864e5);

export function PaymentsView() {
  const {
    allPayments,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    getClient,
    setActiveProjectDrawerId,
    setPreviewProof,
    handleTogglePaymentPaid,
    handleProofUpload,
    uploadingItemId,
  } = useDashboard();

  const [tab, setTab] = useState<Tab>('all');
  const [markTarget, setMarkTarget] = useState<{ p: Project; i: PlanItem } | null>(null);
  const [markDate, setMarkDate] = useState(today());
  const [markFile, setMarkFile] = useState<File | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [proofTarget, setProofTarget] = useState<{ p: Project; i: PlanItem } | null>(null);

  const now = today();
  const rows = allPayments
    .filter((x) => !x.i.cancelled)
    .map((x) => {
      const kind: Kind = x.i.paid ? 'paid' : x.i.due && x.i.due < now ? 'late' : 'out';
      return { ...x, kind, c: getClient(x.p.c) };
    });

  const sum = (k: Kind) => rows.filter((r) => r.kind === k).reduce((a, r) => a + r.i.a, 0);
  const paid = sum('paid');
  const late = sum('late');
  const upcoming = sum('out');
  const grand = paid + upcoming + late || 1;

  const q = searchQuery.toLowerCase();
  const order: Record<Kind, number> = { late: 0, out: 1, paid: 2 };
  const visible = rows
    .filter((r) => {
      if (tab === 'out') return r.kind !== 'paid';
      if (tab === 'paid') return r.kind === 'paid';
      if (tab === 'proof') return r.kind === 'paid' && !r.i.proof?.n;
      return true;
    })
    .filter((r) => (r.p.name + r.c.name + r.c.co + r.i.l).toLowerCase().includes(q))
    .sort((a, b) => {
      if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
      if (a.kind === 'paid') return a.i.pd < b.i.pd ? 1 : -1;
      return (a.i.due || '9') < (b.i.due || '9') ? -1 : 1;
    });

  const counts: Record<Tab, number> = {
    all: rows.length,
    out: rows.filter((r) => r.kind !== 'paid').length,
    paid: rows.filter((r) => r.kind === 'paid').length,
    proof: rows.filter((r) => r.kind === 'paid' && !r.i.proof?.n).length,
  };

  const dateLabel = (r: (typeof rows)[number]) => {
    if (r.kind === 'paid') return `Paid ${shortDate(r.i.pd)}`;
    if (!r.i.due) return 'No due date';
    if (r.kind === 'late') {
      const d = daysBetween(r.i.due, now);
      return `Overdue ${d} ${d === 1 ? 'day' : 'days'}`;
    }
    return r.i.due === now ? 'Due today' : `Due ${shortDate(r.i.due)}`;
  };

  const installmentLabel = (i: PlanItem) => (i.pct > 0 && i.pct < 100 ? `${i.l} · ${i.pct}%` : i.l);

  const openMark = (p: Project, i: PlanItem) => {
    setMarkTarget({ p, i });
    setMarkDate(today());
    setMarkFile(null);
  };

  const confirmMark = () => {
    if (!markTarget || !markDate) return;
    if (markFile) {
      handleProofUpload(markTarget.p.id, markTarget.i.id, markFile, markDate);
    } else {
      handleTogglePaymentPaid(markTarget.p.id, markTarget.i.id, true, null, markDate);
    }
    setMarkTarget(null);
  };

  const startProofUpload = (p: Project, i: PlanItem) => {
    setProofTarget({ p, i });
    proofInputRef.current?.click();
  };

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ['Installment', 'Project', 'Client', 'Company', 'Status', 'Due date', 'Paid date', 'Amount', 'Proof'];
    const lines = visible.map((r) =>
      [
        installmentLabel(r.i),
        r.p.name,
        r.c.name,
        r.c.co,
        r.kind === 'paid' ? 'Paid' : r.kind === 'late' ? 'Overdue' : 'Outstanding',
        r.i.due,
        r.i.pd,
        r.i.a,
        r.i.proof?.n || '',
      ]
        .map(esc)
        .join(',')
    );
    const blob = new Blob([[head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${now}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const proofCell = (r: (typeof rows)[number]) =>
    r.i.proof?.n ? (
      r.i.proof.d ? (
        <button
          type="button"
          className="pay-file"
          title={r.i.proof.n}
          onClick={(e) => {
            e.stopPropagation();
            setPreviewProof({ name: r.i.proof!.n, url: r.i.proof!.d });
          }}
        >
          {r.i.proof.n}
        </button>
      ) : (
        <span className="pay-file is-static" title={r.i.proof.n}>{r.i.proof.n}</span>
      )
    ) : (
      <span className="pay-none">No proof</span>
    );

  const actionCell = (r: (typeof rows)[number]) => {
    const busy = uploadingItemId === r.i.id;
    if (r.kind !== 'paid') {
      return (
        <button
          type="button"
          className="pay-act is-pri"
          onClick={(e) => {
            e.stopPropagation();
            openMark(r.p, r.i);
          }}
        >
          Mark paid
        </button>
      );
    }
    if (!r.i.proof?.n) {
      return (
        <button
          type="button"
          className="pay-act"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            startProofUpload(r.p, r.i);
          }}
        >
          {busy ? 'Uploading…' : 'Upload proof'}
        </button>
      );
    }
    return (
      <button
        type="button"
        className="pay-act"
        onClick={(e) => {
          e.stopPropagation();
          setActiveProjectDrawerId(r.p.id);
        }}
      >
        View
      </button>
    );
  };

  return (
    <div className="pay-page">
      <div className="crumbs">
        <span>Money</span>
        <span aria-hidden="true">/</span>
        <b>Payments</b>
      </div>

      <div className="page-head">
        <div className="page-title">
          <h1>Payments</h1>
          <p>Every installment across all projects.</p>
        </div>
        <label className="page-search">
          <Icon name="search" size={15} />
          <input
            ref={searchInputRef}
            id="q"
            placeholder="Search payments"
            aria-label="Search payments"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button className="page-btn ghost" onClick={exportCsv} disabled={!visible.length}>
          <Icon name="download" size={15} />
          Export CSV
        </button>
      </div>

      <section className="pay-sum" aria-label="Payment summary">
        <div className="pay-sum-grid">
          <div>
            <div className="pay-sum-lb">
              <span className="pay-dot is-paid" />
              Paid
            </div>
            <div className="pay-sum-val pv">{rp(paid)}</div>
          </div>
          <div>
            <div className="pay-sum-lb">
              <span className="pay-dot is-out" />
              Upcoming
            </div>
            <div className="pay-sum-val pv">{rp(upcoming)}</div>
          </div>
          <div>
            <div className="pay-sum-lb is-late">
              <span className="pay-dot is-late" />
              Overdue
            </div>
            <div className="pay-sum-val pv">{rp(late)}</div>
          </div>
        </div>
        <div className="pay-bar" aria-hidden="true">
          {paid > 0 && <span className="is-paid" style={{ flex: paid / grand }} />}
          {upcoming > 0 && <span className="is-out" style={{ flex: upcoming / grand }} />}
          {late > 0 && <span className="is-late" style={{ flex: late / grand }} />}
        </div>
      </section>

      <div className="seg" role="tablist" aria-label="Filter payments">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? 'on' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key !== 'all' && counts[t.key] > 0 && <em>{counts[t.key]}</em>}
          </button>
        ))}
      </div>

      {!visible.length ? (
        <div className="empty">
          {rows.length ? 'Nothing here for this filter' : 'No installments yet. Add a project to start tracking payments.'}
        </div>
      ) : (
        <>
          <div className="pay-table-wrap">
            <table className="pay-table">
              <thead>
                <tr>
                  <th>Installment</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Proof</th>
                  <th className="r">Amount</th>
                  <th className="r">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={`${r.p.id}-${r.i.id}`} onClick={() => setActiveProjectDrawerId(r.p.id)}>
                    <td>
                      <div className="pay-inst">
                        <span className={`pay-dot is-${r.kind}`} />
                        <div>
                          <div className="pay-inst-name">{installmentLabel(r.i)}</div>
                          <div className="pay-inst-sub">{r.p.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="pay-client">{r.c.co || r.c.name}</td>
                    <td className={`pay-date${r.kind === 'late' ? ' is-late' : ''}`}>{dateLabel(r)}</td>
                    <td>{proofCell(r)}</td>
                    <td className="r pay-amt pv">{rp(r.i.a)}</td>
                    <td className="r">{actionCell(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pay-cards">
            {visible.map((r) => (
              <div
                key={`${r.p.id}-${r.i.id}`}
                className="pay-card"
                onClick={() => setActiveProjectDrawerId(r.p.id)}
              >
                <div className="pay-card-top">
                  <span className={`pay-dot is-${r.kind}`} />
                  <div className="pay-card-who">
                    <div className="pay-inst-name">{installmentLabel(r.i)}</div>
                    <div className="pay-inst-sub">
                      {r.p.name} · {r.c.co || r.c.name}
                    </div>
                  </div>
                  <b className="pay-amt pv">{rp(r.i.a)}</b>
                </div>
                <div className="pay-card-bottom">
                  <span className={`pay-date${r.kind === 'late' ? ' is-late' : ''}`}>{dateLabel(r)}</span>
                  {actionCell(r)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <input
        ref={proofInputRef}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp,application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f && proofTarget) handleProofUpload(proofTarget.p.id, proofTarget.i.id, f, proofTarget.i.pd);
          setProofTarget(null);
        }}
      />

      {markTarget && (
        <div
          className="pin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMarkTarget(null);
          }}
        >
          <form
            className="pin-modal-card cl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pay-mark-title"
            onSubmit={(e) => {
              e.preventDefault();
              confirmMark();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setMarkTarget(null);
            }}
          >
            <div>
              <h3 id="pay-mark-title">Mark as paid</h3>
              <p>
                {installmentLabel(markTarget.i)} · {markTarget.p.name} · <span className="pv">{rp(markTarget.i.a)}</span>
              </p>
            </div>
            <div className="f">
              <label>Paid date</label>
              <DatePicker value={markDate} onChange={setMarkDate} placeholder="Paid date" />
            </div>
            <div className="f">
              <label>Payment proof (optional)</label>
              <label className="pay-drop">
                <Icon name="upload" size={15} />
                <span>{markFile ? markFile.name : 'Choose JPG, PNG, WebP or PDF'}</span>
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => setMarkFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div className="cl-modal-actions">
              <button type="button" className="btn" onClick={() => setMarkTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="btn pri" disabled={!markDate}>
                Mark paid
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
