'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { rp, dt } from '@/lib/formatters';

export function PaymentsView() {
  const {
    paidPayments,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    getClient,
    setActiveProjectDrawerId,
    setPreviewProof,
    handleStartNewProject,
  } = useDashboard();

  const q = searchQuery.toLowerCase();
  const filtered = paidPayments
    .filter((x) => {
      const c = getClient(x.p.c);
      return (
        (x.p.name + c.name + x.i.l)
          .toLowerCase()
          .indexOf(q) > -1
      );
    })
    .sort((a, b) => (a.i.pd < b.i.pd ? 1 : -1));

  const totalPaymentsAmount = filtered.reduce(
    (acc, x) => acc + x.i.a,
    0
  );

  return (
    <div>
      <div className="top">
        <h1>Payments</h1>
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
        <div className="empty">No payments recorded yet</div>
      ) : (
        <>
          <div className="tw tw-desktop-only">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Proof</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x) => {
                  const c = getClient(x.p.c);
                  return (
                    <tr
                      key={x.i.id}
                      onClick={() => setActiveProjectDrawerId(x.p.id)}
                    >
                      <td className="mut">{dt(x.i.pd)}</td>
                      <td>{x.p.name}</td>
                      <td>{c.name}</td>
                      <td>
                        {x.i.l}{' '}
                        {x.i.pct > 0 && <span className="mut">{x.i.pct}%</span>}
                      </td>
                      <td className="mut">
                        {x.i.proof && x.i.proof.n ? (
                          x.i.proof.d ? (
                            <button
                              type="button"
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: 'var(--fg)',
                                cursor: 'pointer',
                                fontSize: 'inherit',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                textAlign: 'left',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewProof({
                                  name: x.i.proof!.n,
                                  url: x.i.proof!.d,
                                });
                              }}
                              title="Lihat bukti pembayaran"
                            >
                              <Icon name="file" size={13} />
                              <span style={{ textDecoration: 'underline' }}>{x.i.proof.n}</span>
                            </button>
                          ) : (
                            x.i.proof.n
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="r">{rp(x.i.a)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={5} className="mut">
                    Total · {filtered.length} payments
                  </td>
                  <td className="r">
                    <b>{rp(totalPaymentsAmount)}</b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Payments Card List (<= 768px) */}
          <div className="mob-card-list">
            <div style={{ padding: '8px 12px', background: 'var(--soft)', borderRadius: '8px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span className="mut" style={{ fontSize: '12px' }}>Total {filtered.length} pembayaran</span>
              <b style={{ fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>{rp(totalPaymentsAmount)}</b>
            </div>
            {filtered.map((x) => {
              const c = getClient(x.p.c);
              return (
                <div
                  key={x.i.id}
                  className="mob-item-card"
                  onClick={() => setActiveProjectDrawerId(x.p.id)}
                >
                  <div className="mob-item-top">
                    <div>
                      <div className="mob-item-title">{x.p.name}</div>
                      <div className="mob-item-sub">{c.name} · {x.i.l}{x.i.pct > 0 ? ` (${x.i.pct}%)` : ''}</div>
                    </div>
                    <span className="mob-item-val">{rp(x.i.a)}</span>
                  </div>
                  <div className="mob-item-bottom">
                    <span className="mut" style={{ fontSize: '11.5px' }}>
                      Dibayar: {dt(x.i.pd)}
                    </span>
                    {x.i.proof && x.i.proof.n && x.i.proof.d ? (
                      <button
                        type="button"
                        className="btn sm"
                        style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewProof({
                            name: x.i.proof!.n,
                            url: x.i.proof!.d,
                          });
                        }}
                      >
                        <Icon name="file" size={11} />
                        <span>Bukti</span>
                      </button>
                    ) : (
                      <span className="mut" style={{ fontSize: '11.5px' }}>Tanpa bukti</span>
                    )}
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
