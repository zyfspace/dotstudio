'use client';

import React, { useState } from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { rp, dt } from '@/lib/formatters';

export function QuotationsView() {
  const {
    quotes,
    projects,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    formatQuoteNo,
    openDoc,
    setActiveProjectDrawerId,
    handleStartNewQuote,
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
    <div>
      <div className="top">
        <h1>Quotations</h1>
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
          onClick={() => handleStartNewQuote()}
        >
          <Icon name="plus" />
          New quotation
        </button>
      </div>

      {!filtered.length ? (
        <div className="empty">No quotations yet</div>
      ) : (
        <div>
          {grouped.map(({ company, items }) => {
            const isOpen = openGroup === company;
            const toggle = () => setOpenGroup(isOpen ? null : company);
            const totalGroupAmount = items.reduce((acc, curr) => {
              const val = curr.items.reduce((a, it) => a + (it.q * it.p), 0);
              return acc + val;
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
                                  <span className={`st ${QS[x.s]}`}>
                                    {x.s}
                                  </span>
                                </td>
                                <td className="r">{rp(totalVal)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Quotations Card List */}
                    <div className="mob-card-list">
                      {items.map((x) => {
                        const totalVal = x.items.reduce(
                          (acc, curr) => acc + curr.q * curr.p,
                          0
                        );
                        const linkedProj = x.pid > 0 ? projects.find((p) => p.id === x.pid) : null;
                        return (
                          <div
                            key={x.id}
                            className="mob-item-card"
                            onClick={() => openDoc('quo', x.id)}
                          >
                            <div className="mob-item-top">
                              <div>
                                <div className="mob-item-title">{formatQuoteNo(x.no, x.date, x.senderName)}</div>
                                <div className="mob-item-sub">
                                  {x.title} · {x.cn} {linkedProj ? ` · [${linkedProj.name}]` : ' · (Standalone)'}
                                </div>
                              </div>
                              <span className={`st ${QS[x.s]}`}>
                                {x.s}
                              </span>
                            </div>
                            <div className="mob-item-bottom">
                              <div className="mob-item-amount">{rp(totalVal)}</div>
                              <span className="mut" style={{ fontSize: '12px' }}>
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
    </div>
  );
}
