'use client';

import React, { useState } from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { rp, dt, isOverdue } from '@/lib/formatters';

// Left column of the Invoices & Quotations page.
export function InvoicesPanel() {
  const {
    allPayments,
    searchQuery,
    getClient,
    formatInvoiceNo,
    openDoc,
  } = useDashboard();

  // Groups start closed and only one is open at a time.
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const q = searchQuery.toLowerCase();
  const invoicesList = allPayments
    .filter((x) => {
      if (!x.i.inv) return false;
      const c = getClient(x.p.c);
      const invFormattedNo = formatInvoiceNo(x.i.inv.no, x.i.inv.date);
      return (
        (invFormattedNo + x.p.name + c.name + (c.co || ''))
          .toLowerCase()
          .indexOf(q) > -1
      );
    })
    .sort((a, b) =>
      a.i.inv!.date < b.i.inv!.date ? 1 : -1
    );

  // Group by Company / Business Name
  const grouped: { company: string; items: typeof invoicesList }[] = [];
  const companyMap = new Map<string, typeof invoicesList>();
  // Client names and company shown in each group header.
  const groupLabels = new Map<string, { names: Set<string>; companyName: string }>();

  invoicesList.forEach((item) => {
    const c = getClient(item.p.c);
    const comp = (c.co && c.co.trim()) ? c.co.trim() : (c.name && c.name.trim() ? `${c.name} (Individual)` : 'General / Unassigned');
    if (!companyMap.has(comp)) {
      companyMap.set(comp, []);
      groupLabels.set(comp, { names: new Set(), companyName: (c.co || '').trim() });
    }
    companyMap.get(comp)!.push(item);
    if (c.name && c.name.trim()) groupLabels.get(comp)!.names.add(c.name.trim());
  });

  companyMap.forEach((items, company) => {
    grouped.push({ company, items });
  });

  return (
    <section className="doc-col" aria-labelledby="doc-col-inv">
      <div className="doc-col-head">
        <h2 id="doc-col-inv">Invoices</h2>
        <span>{invoicesList.length}</span>
      </div>

      {!invoicesList.length ? (
        <div className="empty">{q ? 'No matching invoices.' : 'No invoices yet.'}</div>
      ) : (
        <div>
          {grouped.map(({ company, items }) => {
            const isOpen = openGroup === company;
            const toggle = () => setOpenGroup(isOpen ? null : company);
            const totalGroupAmount = items.reduce((acc, curr) => acc + curr.i.a, 0);

            return (
              <div key={company} className="accordion-group">
                <div
                  className="accordion-header"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={toggle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggle();
                    }
                  }}
                >
                  <div className="accordion-title-box">
                    <div className="accordion-company-icon">
                      <Icon name="bld" size={15} />
                    </div>
                    <div className="accordion-name-stack">
                      <span className="accordion-client-name">
                        {[...(groupLabels.get(company)?.names || [])].join(', ') || 'Unassigned'}
                      </span>
                      <span className="accordion-company-sub">
                        {groupLabels.get(company)?.companyName || 'Individual'}
                        <span className="accordion-count-inline">
                          {' · '}{items.length} {items.length === 1 ? 'invoice' : 'invoices'}
                        </span>
                      </span>
                    </div>
                    <span className="accordion-count-badge">
                      {items.length} {items.length === 1 ? 'invoice' : 'invoices'}
                    </span>
                  </div>
                  <div className="accordion-meta-box">
                    <span className="accordion-total-amount">
                      {rp(totalGroupAmount)}
                    </span>
                    <span className={`accordion-chevron ${isOpen ? 'expanded' : ''}`}>
                      <Icon name="chevron" size={15} />
                    </span>
                  </div>
                </div>

                <div className={`accordion-collapse ${isOpen ? 'open' : ''}`} inert={!isOpen}>
                  <div className="accordion-collapse-inner">
                  <div className="accordion-body">
                    <div className="tw-desktop-only">
                      <table>
                        <thead>
                          <tr>
                            <th>No.</th>
                            <th>Date</th>
                            <th>Project</th>
                            <th>Status</th>
                            <th className="r">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((x) => {
                            const overdue = isOverdue(x.i.due, x.i.paid || x.i.cancelled);
                            return (
                              <tr
                                key={x.i.id}
                                onClick={() =>
                                  openDoc('inv', x.p.id, x.i.id)
                                }
                              >
                                <td>{formatInvoiceNo(x.i.inv!.no, x.i.inv!.date)}</td>
                                <td className="mut">{dt(x.i.inv!.date)}</td>
                                <td className="wrap">
                                  <div className="cell-two">
                                    <span>{x.p.name}</span>
                                    {x.i.l && <span className="mut">{x.i.l}</span>}
                                  </div>
                                </td>
                                <td>
                                  {x.i.paid ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: '#10b981',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: '15px',
                                          height: '15px',
                                          borderRadius: '50%',
                                          background: 'rgba(16, 185, 129, 0.15)',
                                          border: '1px solid rgba(16, 185, 129, 0.4)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0,
                                        }}
                                      >
                                        <svg
                                          width="9"
                                          height="9"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="3"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      </span>
                                      Paid
                                    </span>
                                  ) : x.i.cancelled ? (
                                    <span style={{ color: 'var(--mut)', fontSize: '13px' }}>Cancelled</span>
                                  ) : overdue ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: '#ef4444',
                                        fontSize: '13px',
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: '7px',
                                          height: '7px',
                                          borderRadius: '50%',
                                          background: '#ef4444',
                                          display: 'inline-block',
                                          flexShrink: 0,
                                        }}
                                      />
                                      Overdue
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: 'var(--mut)',
                                        fontSize: '13px',
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: '7px',
                                          height: '7px',
                                          borderRadius: '50%',
                                          border: '1.5px solid var(--mut)',
                                          background: 'transparent',
                                          display: 'inline-block',
                                          flexShrink: 0,
                                        }}
                                      />
                                      Unpaid
                                    </span>
                                  )}
                                </td>
                                <td className="r">{rp(x.i.a)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Invoices Card List */}
                    <div className="mob-card-list">
                      {items.map((x) => {
                        const overdue = isOverdue(x.i.due, x.i.paid || x.i.cancelled);
                        return (
                          <div
                            key={x.i.id}
                            className="mob-item-card"
                            onClick={() => openDoc('inv', x.p.id, x.i.id)}
                          >
                            <div className="mob-item-top">
                              <div>
                                <div className="mob-item-title mob-doc-no">{formatInvoiceNo(x.i.inv!.no, x.i.inv!.date)}</div>
                                <div className="mob-item-sub">{x.p.name} · {x.i.l}</div>
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 500, color: x.i.paid ? '#10b981' : overdue ? '#ef4444' : 'var(--mut)' }}>
                                {x.i.paid ? 'Paid' : x.i.cancelled ? 'Cancelled' : overdue ? 'Overdue' : 'Unpaid'}
                              </span>
                            </div>
                            <div className="mob-item-bottom">
                              <span className="mut mob-doc-date">{dt(x.i.inv!.date)}</span>
                              <span className="mob-item-val">{rp(x.i.a)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
