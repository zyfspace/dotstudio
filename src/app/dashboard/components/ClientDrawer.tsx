'use client';

import React from 'react';
import { useDashboard, STATUS_LABELS } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { AutoTextarea } from '@/components/AutoTextarea';
import { sh } from '@/lib/formatters';

export function ClientDrawer() {
  const {
    activeClientDrawerId,
    activeClient,
    projects,
    quotes,
    getProjectPaidAmount,
    getProjectStatus,
    getProjectPct,
    closeDrawer,
    setClients,
    setActiveProjectDrawerId,
    setActiveClientDrawerId,
    handleStartNewQuote,
    openDoc,
    formatQuoteNo,
    deleteArmed,
    handleDeleteClient,
  } = useDashboard();

  return (
    <div className={`dr ${activeClientDrawerId ? 'on' : ''}`}>
      {activeClient && (
        <div>
          {(() => {
            const clientProjs = projects.filter(
              (p) => p.c === activeClient.id
            );
            const totalVal = clientProjs.reduce(
              (acc, p) => acc + p.v,
              0
            );
            const totalPaid = clientProjs.reduce(
              (acc, p) => acc + getProjectPaidAmount(p),
              0
            );
            const balance = totalVal - totalPaid;

            return (
              <>
                <div className="dh">
                  <div>
                    <h2>{activeClient.name}</h2>
                    {activeClient.co && <div className="mut">{activeClient.co}</div>}
                  </div>
                  <button
                    className="ib"
                    id="x"
                    onClick={closeDrawer}
                    aria-label="Close drawer"
                  >
                    <Icon name="x" size={18} />
                  </button>
                </div>

                <div className="drawer-stats">
                  <div className="drawer-stat">
                    <span>Total Value</span>
                    <b>{sh(totalVal)}</b>
                  </div>
                  <div className="drawer-stat">
                    <span>Paid</span>
                    <b>{sh(totalPaid)}</b>
                  </div>
                  <div className="drawer-stat">
                    <span>Balance</span>
                    <b>{sh(balance)}</b>
                  </div>
                </div>

                {/* Contact Editor */}
                <div className="sec">
                  <small>Contact Details</small>
                  <div className="f">
                    <label htmlFor="cn">Name</label>
                    <input
                      id="cn"
                      type="text"
                      value={activeClient.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClients((prev) =>
                          prev.map((c) =>
                            c.id === activeClient.id
                              ? { ...c, name: val }
                              : c
                          )
                        );
                      }}
                    />
                  </div>
                  <div className="f">
                    <label htmlFor="cc">Company</label>
                    <input
                      id="cc"
                      type="text"
                      value={activeClient.co}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClients((prev) =>
                          prev.map((c) =>
                            c.id === activeClient.id
                              ? { ...c, co: val }
                              : c
                          )
                        );
                      }}
                    />
                  </div>
                  <div className="two">
                    <div className="f">
                      <label htmlFor="cm">Email</label>
                      <input
                        id="cm"
                        type="email"
                        value={activeClient.mail}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClients((prev) =>
                            prev.map((c) =>
                              c.id === activeClient.id
                                ? { ...c, mail: val }
                                : c
                            )
                          );
                        }}
                      />
                    </div>
                    <div className="f">
                      <label htmlFor="ct">Phone</label>
                      <input
                        id="ct"
                        type="tel"
                        value={activeClient.tel}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClients((prev) =>
                            prev.map((c) =>
                              c.id === activeClient.id
                                ? { ...c, tel: val }
                                : c
                            )
                          );
                        }}
                      />
                    </div>
                  </div>
                  <div className="f" style={{ margin: 0 }}>
                    <label htmlFor="cx">Notes</label>
                    <AutoTextarea
                      id="cx"
                      placeholder="Preferences, billing info…"
                      value={activeClient.n}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClients((prev) =>
                          prev.map((c) =>
                            c.id === activeClient.id
                              ? { ...c, n: val }
                              : c
                          )
                        );
                      }}
                    />
                  </div>
                </div>

                {/* Projects List */}
                <div className="sec">
                  <small>Projects ({clientProjs.length})</small>
                  {clientProjs.length > 0 ? (
                    clientProjs.map((p) => {
                      const st = getProjectStatus(p);
                      const progress = getProjectPct(p);
                      return (
                        <div
                          key={p.id}
                          className="client-project-item"
                          onClick={() => {
                            setActiveProjectDrawerId(p.id);
                            setActiveClientDrawerId(null);
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{p.name}</div>
                            <div className="mut" style={{ fontSize: '12px', marginTop: '2px' }}>
                              {STATUS_LABELS[st]} · {progress}% paid
                            </div>
                          </div>
                          <b>{sh(p.v)}</b>
                        </div>
                      );
                    })
                  ) : (
                    <div className="mut" style={{ fontSize: '13px' }}>No projects yet.</div>
                  )}
                </div>

                {/* Quotations List */}
                {(() => {
                  const clientQuotes = quotes.filter(
                    (q) =>
                      q.cn.toLowerCase() === activeClient.name.toLowerCase() ||
                      (q.mail && activeClient.mail && q.mail.toLowerCase() === activeClient.mail.toLowerCase()) ||
                      (q.co && activeClient.co && q.co.toLowerCase() === activeClient.co.toLowerCase())
                  );

                  return (
                    <div className="sec">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <small style={{ margin: 0 }}>Quotations ({clientQuotes.length})</small>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => {
                            handleStartNewQuote(undefined, activeClient.id);
                            closeDrawer();
                          }}
                        >
                          <Icon name="plus" size={13} />
                          New quote
                        </button>
                      </div>

                      {clientQuotes.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {clientQuotes.map((q) => {
                            const quoteTotal = q.items.reduce((acc, curr) => acc + (curr.q || 1) * curr.p, 0);
                            const linkedProj = q.pid > 0 ? projects.find((p) => p.id === q.pid) : null;
                            return (
                              <div
                                key={q.id}
                                className="client-project-item"
                                onClick={() => {
                                  openDoc('quo', q.id);
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{q.title}</div>
                                  <div className="mut" style={{ fontSize: '12px', marginTop: '2px' }}>
                                    {formatQuoteNo(q.no, q.date, q.senderName)} · {q.s} {linkedProj ? ` · [${linkedProj.name}]` : ' · (Standalone)'}
                                  </div>
                                </div>
                                <b>{sh(quoteTotal)}</b>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mut" style={{ fontSize: '13px' }}>No quotations for this client yet.</div>
                      )}
                    </div>
                  );
                })()}

                {/* Delete client button */}
                <button
                  className={`btn danger ${deleteArmed ? 'arm' : ''}`}
                  id="del-client"
                  style={{ marginTop: '18px' }}
                  onClick={() => handleDeleteClient(activeClient.id)}
                >
                  <Icon name="trash" />
                  {deleteArmed ? 'Click again to confirm' : 'Delete client'}
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
