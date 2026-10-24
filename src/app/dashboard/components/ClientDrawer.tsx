'use client';

import React, { useEffect, useState } from 'react';
import { useDashboard, STATUS_LABELS } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { AutoTextarea } from '@/components/AutoTextarea';
import { sh } from '@/lib/formatters';
import { Client } from '@/types';

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

  // Edit buffer for the contact details; null while viewing.
  const [draft, setDraft] = useState<Client | null>(null);

  // Opening another client (or closing the drawer) discards unsaved edits.
  useEffect(() => {
    setDraft(null);
  }, [activeClient?.id]);

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
                    <b className="pv">{sh(totalVal)}</b>
                  </div>
                  <div className="drawer-stat">
                    <span>Paid</span>
                    <b className="pv">{sh(totalPaid)}</b>
                  </div>
                  <div className="drawer-stat">
                    <span>Balance</span>
                    <b className="pv">{sh(balance)}</b>
                  </div>
                </div>

                {/* Contact Details: read-only until Edit is clicked */}
                <div className="sec">
                  <div className="sec-head">
                    <small>Contact Details</small>
                    {!draft && (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => setDraft({ ...activeClient })}
                      >
                        <Icon name="edit" size={13} />
                        Edit
                      </button>
                    )}
                  </div>

                  {draft ? (
                    <>
                      <div className="f">
                        <label htmlFor="cn">Name</label>
                        <input
                          id="cn"
                          type="text"
                          value={draft.name}
                          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        />
                      </div>
                      <div className="f">
                        <label htmlFor="cc">Company</label>
                        <input
                          id="cc"
                          type="text"
                          value={draft.co}
                          onChange={(e) => setDraft({ ...draft, co: e.target.value })}
                        />
                      </div>
                      <div className="two">
                        <div className="f">
                          <label htmlFor="cm">Email</label>
                          <input
                            id="cm"
                            type="email"
                            value={draft.mail}
                            onChange={(e) => setDraft({ ...draft, mail: e.target.value })}
                          />
                        </div>
                        <div className="f">
                          <label htmlFor="ct">Phone</label>
                          <input
                            id="ct"
                            type="tel"
                            value={draft.tel}
                            onChange={(e) => setDraft({ ...draft, tel: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="f">
                        <label htmlFor="cx">Notes</label>
                        <AutoTextarea
                          id="cx"
                          placeholder="Preferences, billing info…"
                          value={draft.n}
                          onChange={(e) => setDraft({ ...draft, n: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn sm pri"
                          disabled={!draft.name.trim()}
                          onClick={() => {
                            const saved = { ...draft, name: draft.name.trim() };
                            setClients((prev) =>
                              prev.map((c) => (c.id === saved.id ? saved : c))
                            );
                            setDraft(null);
                          }}
                        >
                          Save
                        </button>
                        <button type="button" className="btn sm" onClick={() => setDraft(null)}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="detail-list">
                      <DetailRow label="Name" value={activeClient.name} />
                      <DetailRow label="Company" value={activeClient.co} />
                      <div className="two" style={{ gap: '12px' }}>
                        <DetailRow label="Email" value={activeClient.mail} />
                        <DetailRow label="Phone" value={activeClient.tel} />
                      </div>
                      <DetailRow label="Notes" value={activeClient.n} multiline />
                    </div>
                  )}
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
                          <b className="pv">{sh(p.v)}</b>
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
                                <b className="pv">{sh(quoteTotal)}</b>
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

function DetailRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="mut" style={{ fontSize: '11.5px', marginBottom: '2px' }}>{label}</div>
      <div
        className={value ? undefined : 'mut'}
        style={{
          fontSize: '14px',
          fontWeight: value ? 500 : 400,
          color: value ? 'var(--fg)' : undefined,
          overflowWrap: 'anywhere',
          whiteSpace: multiline ? 'pre-wrap' : undefined,
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}
