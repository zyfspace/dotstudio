'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { DocActionButton } from '@/components/DocActionButton';
import { invoiceFilename, rp, today } from '@/lib/formatters';
import { DocView } from './DocView';

type Status = 'Paid' | 'Overdue' | 'Outstanding' | 'Cancelled';

const shortDate = (s?: string) => {
  if (!s) return '';
  const d = new Date(s + 'T00:00');
  if (isNaN(d.getTime())) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
};

const initials = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '—';

// Wide enough to show the list and the A4 preview side by side
const useWide = () => {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1100px)');
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
};

export function InvoicesView() {
  const {
    allPayments,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    getClient,
    formatInvoiceNo,
    openDoc,
  } = useDashboard();

  const wide = useWide();
  const now = today();

  const invoices = allPayments
    .filter((x) => x.i.inv)
    .map((x) => {
      const c = getClient(x.p.c);
      const status: Status = x.i.paid
        ? 'Paid'
        : x.i.cancelled
          ? 'Cancelled'
          : x.i.due && x.i.due < now
            ? 'Overdue'
            : 'Outstanding';
      return {
        ...x,
        c,
        no: formatInvoiceNo(x.i.inv!.no, x.i.inv!.date),
        key: `${x.p.id}-${x.i.id}`,
        status,
      };
    })
    .sort((a, b) => (a.i.inv!.date < b.i.inv!.date ? 1 : -1));

  const q = searchQuery.toLowerCase();
  const filtered = invoices.filter((x) =>
    (x.no + x.p.name + x.c.name + (x.c.co || '') + x.i.l).toLowerCase().includes(q)
  );

  // Group by company, falling back to the client name for individuals
  const groups: { key: string; title: string; sub: string; items: typeof filtered }[] = [];
  filtered.forEach((x) => {
    const key = x.c.co?.trim() || x.c.name?.trim() || 'Unassigned';
    let g = groups.find((y) => y.key === key);
    if (!g) {
      g = { key, title: key, sub: x.c.co?.trim() ? x.c.name : 'Individual', items: [] };
      groups.push(g);
    }
    g.items.push(x);
  });

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = filtered.find((x) => x.key === selectedKey) || filtered[0] || null;

  const [openGroups, setOpenGroups] = useState<Set<string> | null>(null);
  // First visit: open the group holding the newest invoice
  const opened = openGroups ?? new Set(groups[0] ? [groups[0].key] : []);
  const toggleGroup = (key: string) => {
    const next = new Set(opened);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpenGroups(next);
  };
  const isOpen = (key: string) => (q ? true : opened.has(key));

  const pick = (x: (typeof filtered)[number]) => {
    if (wide) setSelectedKey(x.key);
    else openDoc('inv', x.p.id, x.i.id);
  };

  return (
    <div className="inv-page">
      <div className="crumbs">
        <span>Money</span>
        <span aria-hidden="true">/</span>
        <b>Invoices</b>
      </div>

      <div className="page-head">
        <div className="page-title">
          <h1>Invoices</h1>
          <p>
            {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}, grouped by client.
            {wide && invoices.length > 0 && ' Select one to preview.'}
          </p>
        </div>
        <label className="page-search">
          <Icon name="search" size={15} />
          <input
            ref={searchInputRef}
            id="q"
            placeholder="Search by no. or client"
            aria-label="Search invoices"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
      </div>

      {!filtered.length ? (
        <div className="empty">
          {q ? 'No matching invoices.' : 'No invoices yet. Create one from an installment in a project.'}
        </div>
      ) : (
        <div className="inv-split">
          <div className="inv-list">
            {groups.map((g) => {
              const total = g.items.reduce((a, x) => a + x.i.a, 0);
              const paid = g.items.filter((x) => x.status === 'Paid').reduce((a, x) => a + x.i.a, 0);
              const pct = total ? Math.round((paid / total) * 100) : 0;
              const open = isOpen(g.key);
              return (
                <div className="inv-group" key={g.key}>
                  <button
                    type="button"
                    className="inv-group-head"
                    aria-expanded={open}
                    onClick={() => toggleGroup(g.key)}
                  >
                    <span className="inv-ini">{initials(g.title)}</span>
                    <span className="inv-group-who">
                      <span className="inv-group-title">{g.title}</span>
                      <span className="inv-group-sub">
                        {g.sub} · {g.items.length} {g.items.length === 1 ? 'invoice' : 'invoices'}
                      </span>
                    </span>
                    <span className="inv-group-bar" title={`${pct}% paid`} aria-label={`${pct}% paid`}>
                      <span style={{ flex: pct }} className="is-paid" />
                      <span style={{ flex: 100 - pct }} className="is-rest" />
                    </span>
                    <span className="inv-group-total pv">{rp(total)}</span>
                    <Icon name="chevron" size={16} className={`inv-chev${open ? ' is-open' : ''}`} />
                  </button>

                  {open && (
                    <div className="inv-rows">
                      {g.items.map((x) => {
                        const on = wide && selected?.key === x.key;
                        return (
                          <button
                            type="button"
                            key={x.key}
                            className={`inv-row${on ? ' is-on' : ''}`}
                            aria-current={on ? 'true' : undefined}
                            onClick={() => pick(x)}
                          >
                            <span className="inv-no">{x.no}</span>
                            <span className="inv-label">
                              {x.i.l}
                              <span className="inv-sub"> · {x.p.name} · {shortDate(x.i.inv!.date)}</span>
                            </span>
                            <span className={`inv-chip is-${x.status.toLowerCase()}`}>{x.status}</span>
                            <span className="inv-amt pv">{rp(x.i.a)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {wide && selected && (
            <aside className="inv-preview" aria-label="Invoice preview">
              <div className="inv-preview-head">
                <span className="inv-no">{selected.no}</span>
                <button
                  type="button"
                  className="pay-act"
                  onClick={() => openDoc('inv', selected.p.id, selected.i.id)}
                >
                  Open
                </button>
                <DocActionButton
                  filename={invoiceFilename(
                    selected.c.co || selected.c.name || '',
                    selected.no,
                    selected.p.plan.map((x) => x.l),
                    selected.p.plan.findIndex((x) => x.id === selected.i.id)
                  )}
                />
              </div>
              <div className="inv-preview-body">
                <Suspense fallback={null}>
                  <DocView key={selected.key} doc={{ t: 'inv', a: selected.p.id, b: selected.i.id }} embedded />
                </Suspense>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
