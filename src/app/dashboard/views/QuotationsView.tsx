'use client';

import React, { useState } from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { rp, dt, isRecurringBilling } from '@/lib/formatters';

// Right column of the Invoices & Quotations page.
export function QuotationsPanel() {
  const {
    quotes,
    projects,
    searchQuery,
    formatQuoteNo,
    openDoc,
    setActiveProjectDrawerId,
    handleStartEditQuote,
  } = useDashboard();

  // Groups start closed and only one is open at a time.
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const q = searchQuery.toLowerCase();
  const filtered = quotes
    .filter((x) => {
      const qFormattedNo = formatQuoteNo(x.no, x.date, x.senderName);
      return (
        (qFormattedNo + x.title + x.cn + (x.co || '')).toLowerCase().indexOf(q) > -1
      );
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const QS: Record<string, string> = {
    Draft: 'Pending',
    Sent: 'Progress',
    Accepted: 'Finished',
  };

  // Group by Company / Business Name
  const grouped: { company: string; items: typeof filtered }[] = [];
  const companyMap = new Map<string, typeof filtered>();
  // Client names and company shown in each group header.
  const groupLabels = new Map<string, { names: Set<string>; companyName: string }>();

  filtered.forEach((item) => {
    const comp = (item.co && item.co.trim()) ? item.co.trim() : (item.cn && item.cn.trim() ? `${item.cn} (Individual)` : 'General / Unassigned');
    if (!companyMap.has(comp)) {
      companyMap.set(comp, []);
      groupLabels.set(comp, { names: new Set(), companyName: (item.co || '').trim() });
    }
    companyMap.get(comp)!.push(item);
    if (item.cn && item.cn.trim()) groupLabels.get(comp)!.names.add(item.cn.trim());
  });

  companyMap.forEach((items, company) => {
    grouped.push({ company, items });
  });

  return (
    <section className="doc-col" aria-labelledby="doc-col-quo">
      <div className="doc-col-head">
        <h2 id="doc-col-quo">Quotations</h2>
        <span>{filtered.length}</span>
      </div>

      {!filtered.length ? (
        <div className="empty">{q ? 'No matching quotations.' : 'No quotations yet.'}</div>
      ) : (
        <div>
          {grouped.map(({ company, items }) => {
            const isOpen = openGroup === company;
            const toggle = () => setOpenGroup(isOpen ? null : company);
            const totalGroupAmount = items.reduce((acc, curr) => {
              const oneTime = curr.items
                .filter((it) => !isRecurringBilling(it.type))
                .reduce((a, it) => a + (it.q || 1) * (it.p || 0), 0);
              const all = curr.items.reduce((a, it) => a + (it.q || 1) * (it.p || 0), 0);
              return acc + (oneTime > 0 ? oneTime : all);
            }, 0);

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
                          {' · '}{items.length} {items.length === 1 ? 'quotation' : 'quotations'}
                        </span>
                      </span>
                    </div>
                    <span className="accordion-count-badge">
                      {items.length} {items.length === 1 ? 'quotation' : 'quotations'}
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
                            <th>Title</th>
                            <th>Project</th>
                            <th>Valid until</th>
                            <th>Status</th>
                            <th className="r">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((x) => {
                            const totalVal = x.items.reduce(
                              (acc, curr) => acc + curr.q * curr.p,
                              0
                            );
                            const linkedProj = x.pid > 0 ? projects.find((p) => p.id === x.pid) : null;
                            return (
                              <tr
                                key={x.id}
                                onClick={() => openDoc('quo', x.id)}
                              >
                                <td>{formatQuoteNo(x.no, x.date, x.senderName)}</td>
                                <td className="mut">{dt(x.date)}</td>
                                <td className="wrap">{x.title}</td>
                                <td className="wrap">
                                  {linkedProj ? (
                                    <button
                                      type="button"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--line)',
                                        background: 'var(--soft)',
                                        fontSize: '11.5px',
                                        fontWeight: 500,
                                        color: 'var(--fg)',
                                        cursor: 'pointer',
                                        maxWidth: '130px',
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveProjectDrawerId(linkedProj.id);
                                      }}
                                      title={`Buka project: ${linkedProj.name}`}
                                    >
                                      <Icon name="folder" size={12} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {linkedProj.name}
                                      </span>
                                    </button>
                                  ) : (
                                    <span className="mut" style={{ fontSize: '11.5px' }}>
                                      Standalone
                                    </span>
                                  )}
                                </td>
                                <td className="mut">{dt(x.valid)}</td>
                                <td>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <span className={`st ${QS[x.s]}`}>
                                      {x.s}
                                    </span>
                                    {x.s === 'Draft' && !x.pid && (
                                      <button
                                        type="button"
                                        className="ib sm"
                                        style={{ width: '24px', height: '24px', padding: 0 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEditQuote(x.id);
                                        }}
                                        title="Edit quotation"
                                        aria-label="Edit quotation"
                                      >
                                        <Icon name="edit" size={13} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="r">
                                  {(() => {
                                    const oneTime = x.items
                                      .filter((it) => !isRecurringBilling(it.type))
                                      .reduce((acc, curr) => acc + (curr.q || 1) * (curr.p || 0), 0);
                                    const recurring = x.items
                                      .filter((it) => isRecurringBilling(it.type))
                                      .reduce((acc, curr) => acc + (curr.q || 1) * (curr.p || 0), 0);

                                    if (recurring > 0 && oneTime > 0) {
                                      return (
                                        <div>
                                          <div style={{ fontWeight: 600 }}>{rp(oneTime)}</div>
                                          <div className="mut" style={{ fontSize: '11px' }}>
                                            +{rp(recurring)}/bln
                                          </div>
                                        </div>
                                      );
                                    }
                                    if (recurring > 0) {
                                      return (
                                        <div>
                                          <div style={{ fontWeight: 600 }}>{rp(recurring)}</div>
                                          <div className="mut" style={{ fontSize: '11px' }}>/bulan</div>
                                        </div>
                                      );
                                    }
                                    return <span className="mob-item-val">{rp(oneTime)}</span>;
                                  })()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Quotations Card List */}
                    <div className="mob-card-list">
                      {items.map((x) => {
                        const linkedProj = x.pid > 0 ? projects.find((p) => p.id === x.pid) : null;
                        const oneTime = x.items
                          .filter((it) => !isRecurringBilling(it.type))
                          .reduce((acc, curr) => acc + (curr.q || 1) * (curr.p || 0), 0);
                        const recurring = x.items
                          .filter((it) => isRecurringBilling(it.type))
                          .reduce((acc, curr) => acc + (curr.q || 1) * (curr.p || 0), 0);
                        return (
                          <div
                            key={x.id}
                            className="mob-item-card"
                            onClick={() => openDoc('quo', x.id)}
                          >
                            <div className="mob-item-top">
                              <div>
                                <div className="mob-item-title mob-doc-no">{formatQuoteNo(x.no, x.date, x.senderName)}</div>
                                <div className="mob-item-sub">
                                  {x.title} · {x.cn} {linkedProj ? ` · [${linkedProj.name}]` : ' · (Standalone)'}
                                </div>
                              </div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span className={`st ${QS[x.s]}`}>
                                  {x.s}
                                </span>
                                {x.s === 'Draft' && !x.pid && (
                                  <button
                                    type="button"
                                    className="ib sm"
                                    style={{ width: '24px', height: '24px', padding: 0 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEditQuote(x.id);
                                    }}
                                    title="Edit quotation"
                                    aria-label="Edit quotation"
                                  >
                                    <Icon name="edit" size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="mob-item-bottom">
                              <div className="mob-item-amount">
                                {recurring > 0 && oneTime > 0 ? (
                                  <div>
                                    <div className="mob-item-val">{rp(oneTime)}</div>
                                    <div className="mut" style={{ fontSize: '11px', fontWeight: 400 }}>
                                      +{rp(recurring)}/bln recurring
                                    </div>
                                  </div>
                                ) : recurring > 0 ? (
                                  <div>
                                    <div className="mob-item-val">{rp(recurring)}</div>
                                    <div className="mut" style={{ fontSize: '11px', fontWeight: 400 }}>/bulan</div>
                                  </div>
                                ) : (
                                  <span className="mob-item-val">{rp(oneTime)}</span>
                                )}
                              </div>
                              <span className="mut mob-doc-date">
                                Valid: {dt(x.valid)}
                              </span>
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
