'use client';

import React, { useState } from 'react';
import { useDashboard, STATUS_LABELS } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { AutoTextarea } from '@/components/AutoTextarea';
import { DatePicker } from '@/components/DatePicker';
import { rp, sh, dt, isOverdue, today } from '@/lib/formatters';

export function ProjectDrawer() {
  const {
    activeProjectDrawerId,
    activeProject,
    getClient,
    getProjectPaidAmount,
    getProjectPct,
    getProjectStatus,
    closeDrawer,
    setPreviewProof,
    uploadingItemId,
    handleProofUpload,
    handleCreateOrViewInvoice,
    handleAddAdditionalService,
    quotes,
    handleStartNewQuote,
    openDoc,
    handleUnlinkQuoteFromProject,
    handleLinkQuoteToProject,
    formatQuoteNo,
    setActiveClientDrawerId,
    setActiveProjectDrawerId,
    setProjects,
    deleteArmed,
    handleDeleteProject,
    handleCancelPlanItem,
  } = useDashboard();

  const [cancelTarget, setCancelTarget] = useState<{ projectId: number; itemId: number; label: string; amount: number } | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [addServiceLabel, setAddServiceLabel] = useState('');
  const [addServiceCost, setAddServiceCost] = useState('');
  const [addServicePaidAt, setAddServicePaidAt] = useState('');
  const [addServiceProof, setAddServiceProof] = useState<File | null>(null);
  // Paid date picked per plan item before its proof can be uploaded
  const [pendingPaidDates, setPendingPaidDates] = useState<Record<number, string>>({});

  return (
    <div className={`dr ${activeProjectDrawerId ? 'on' : ''}`} id="dr">
      {activeProject && (
        <div>
          {(() => {
            const c = getClient(activeProject.c);
            const g = getProjectPaidAmount(activeProject);
            const b = activeProject.v - g;
            const k = getProjectStatus(activeProject);
            const progress = getProjectPct(activeProject);

            return (
              <>
                <div className="dh">
                  <div>
                    <h2>{activeProject.name}</h2>
                    <div className="mut">
                      {c.name}
                      {c.co ? ` · ${c.co}` : ''}
                    </div>
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

                <span className={`st ${k}`}>{STATUS_LABELS[k]}</span>

                <div className="big" style={{ marginTop: '14px' }}>
                  {rp(g)}{' '}
                  <span className="mut" style={{ fontSize: '14px' }}>
                    of {rp(activeProject.v)}
                  </span>
                </div>

                <div
                  className="prog"
                  style={{ margin: '12px 0 8px', height: '6px' }}
                >
                  <i style={{ width: `${progress}%` }} />
                </div>

                <div className="mut">
                  {k === 'Cancelled'
                    ? 'Stopped midway, remaining payments cancelled'
                    : b > 0
                      ? `Remaining ${rp(b)}`
                      : 'All payments received'}
                </div>

                {/* Payment schedule */}
                <div className="sec" style={{ marginTop: '18px' }}>
                  <small>Payment schedule</small>
                  {activeProject.plan.map((item) => {
                    const overdue = isOverdue(item.due, item.paid || item.cancelled);
                    return (
                      <div key={item.id} className="ins">
                        <div className="ih">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="ins-title">
                              {item.l}{' '}
                              {/* Additional services are paid in full and stored with pct 0 */}
                              {item.pct > 0 && (
                                <span className="mut" style={{ fontWeight: 400, fontSize: '12.5px' }}>
                                  ({item.pct}%)
                                </span>
                              )}
                            </div>
                            <div className="ins-date-pill">
                              <span className={overdue ? 'od' : 'mut'} style={{ fontSize: '12px' }}>
                                {item.paid ? 'Paid date:' : item.cancelled ? 'Was due:' : overdue ? 'Overdue:' : 'Due date:'}
                              </span>
                              {item.paid ? (
                                <span style={{ fontSize: '12px', fontWeight: 500 }}>
                                  {item.pd ? dt(item.pd) : '—'}
                                </span>
                              ) : (
                                <span style={{ fontSize: '12px', fontWeight: 500, color: overdue ? 'var(--red, #ef4444)' : 'inherit' }}>
                                  {item.due ? dt(item.due) : '—'}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`ins-amount ${item.paid || item.cancelled ? 'mut' : ''}`}
                            style={item.cancelled ? { textDecoration: 'line-through' } : undefined}
                          >
                            {rp(item.a)}
                          </span>
                        </div>

                        <div className="ia">
                          {item.paid ? (
                            <>
                              {item.proof && item.proof.n ? (
                                item.proof.d ? (
                                  <button
                                    type="button"
                                    className="btn sm"
                                    title={item.proof.n}
                                    onClick={() =>
                                      setPreviewProof({
                                        name: item.proof!.n,
                                        url: item.proof!.d,
                                      })
                                    }
                                  >
                                    <Icon name="file" size={14} />
                                    Proof
                                  </button>
                                ) : (
                                  <span className="mut" style={{ fontSize: '12px' }}>{item.proof.n}</span>
                                )
                              ) : (
                                <span className="mut" style={{ fontSize: '12px' }}>No proof</span>
                              )}
                            </>
                          ) : item.cancelled ? (
                            <span className="mut" style={{ fontSize: '12px' }}>Cancelled</span>
                          ) : (() => {
                            const paidDate = pendingPaidDates[item.id] || '';
                            const uploading = uploadingItemId === item.id;
                            const canUpload = Boolean(paidDate) && !uploading;
                            return (
                              <>
                                <DatePicker
                                  value={paidDate}
                                  onChange={(val) =>
                                    setPendingPaidDates((prev) => ({ ...prev, [item.id]: val }))
                                  }
                                  placeholder="Paid date"
                                  className="ia-date"
                                  disabled={uploading}
                                />
                                <label
                                  className="btn sm pri"
                                  title={paidDate ? undefined : 'Pick the paid date first'}
                                  style={{
                                    cursor: uploading ? 'wait' : canUpload ? 'pointer' : 'not-allowed',
                                    opacity: canUpload ? 1 : uploading ? 0.7 : 0.4,
                                  }}
                                >
                                  <Icon name="upload" size={14} />
                                  {uploading ? 'Uploading…' : 'Payment'}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,application/pdf"
                                    disabled={!canUpload}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      e.target.value = '';
                                      if (f && paidDate) {
                                        handleProofUpload(activeProject.id, item.id, f, paidDate);
                                        setPendingPaidDates((prev) => {
                                          const next = { ...prev };
                                          delete next[item.id];
                                          return next;
                                        });
                                      }
                                    }}
                                  />
                                </label>
                              </>
                            );
                          })()}

                          <button
                            className="btn sm"
                            onClick={() =>
                              handleCreateOrViewInvoice(
                                activeProject.id,
                                item.id
                              )
                            }
                          >
                            <Icon name="file" size={14} />
                            {item.inv ? 'View invoice' : 'Create invoice'}
                          </button>

                          {!item.paid && !item.cancelled && (
                            <button
                              type="button"
                              className="btn sm out"
                              onClick={() =>
                                setCancelTarget({
                                  projectId: activeProject.id,
                                  itemId: item.id,
                                  label: item.l,
                                  amount: item.a,
                                })
                              }
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Additional Service */}
                  {!showAddService ? (
                    <button
                      type="button"
                      className="add-svc-btn"
                      onClick={() => {
                        setShowAddService(true);
                        setAddServiceLabel('');
                        setAddServiceCost('');
                        setAddServicePaidAt(today());
                        setAddServiceProof(null);
                      }}
                    >
                      <Icon name="plus" size={14} />
                      Additional service
                    </button>
                  ) : (
                    <div className="add-svc-form">
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--fg)' }}>
                        New additional service
                      </div>
                      <div className="f" style={{ margin: 0 }}>
                        <label htmlFor="add-svc-label" style={{ fontSize: '12px' }}>Service name</label>
                        <input
                          id="add-svc-label"
                          className="in"
                          type="text"
                          placeholder="e.g. Payment Gateway Integration"
                          value={addServiceLabel}
                          onChange={(e) => setAddServiceLabel(e.target.value)}
                        />
                      </div>
                      <div className="two" style={{ gap: '10px' }}>
                        <div className="f" style={{ margin: 0 }}>
                          <label htmlFor="add-svc-cost" style={{ fontSize: '12px' }}>Cost (Rp)</label>
                          <input
                            id="add-svc-cost"
                            className="in"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={addServiceCost}
                            onChange={(e) => setAddServiceCost(e.target.value)}
                          />
                        </div>
                        <div className="f" style={{ margin: 0 }}>
                          <label style={{ fontSize: '12px' }}>Paid at</label>
                          <DatePicker
                            value={addServicePaidAt}
                            onChange={(val) => setAddServicePaidAt(val)}
                            placeholder="Paid at"
                          />
                        </div>
                      </div>
                      <div className="f" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px' }}>Payment proof</label>
                        <label className="btn sm add-svc-file" title={addServiceProof?.name}>
                          <Icon name="upload" size={14} />
                          <span className="add-svc-file-name">
                            {addServiceProof ? addServiceProof.name : 'Choose file'}
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,application/pdf"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = '';
                              if (f) setAddServiceProof(f);
                            }}
                          />
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                        <button
                          type="button"
                          className="btn sm pri"
                          disabled={
                            !addServiceLabel.trim() ||
                            !addServiceCost ||
                            +addServiceCost <= 0 ||
                            !addServicePaidAt ||
                            !addServiceProof
                          }
                          onClick={() => {
                            if (!addServiceProof) return;
                            const newItemId = handleAddAdditionalService(
                              activeProject.id,
                              addServiceLabel.trim(),
                              +addServiceCost,
                              addServicePaidAt
                            );
                            if (newItemId !== null) {
                              handleProofUpload(activeProject.id, newItemId, addServiceProof, addServicePaidAt);
                            }
                            setShowAddService(false);
                            setAddServiceLabel('');
                            setAddServiceCost('');
                            setAddServicePaidAt('');
                            setAddServiceProof(null);
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn sm out"
                          onClick={() => setShowAddService(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Project Details (Read-only) */}
                <div className="sec">
                  <small>Details</small>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                    <div>
                      <div className="mut" style={{ fontSize: '11.5px', marginBottom: '2px' }}>Project name</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
                        {activeProject.name}
                      </div>
                    </div>

                    <div className="two" style={{ gap: '12px' }}>
                      <div>
                        <div className="mut" style={{ fontSize: '11.5px', marginBottom: '2px' }}>Value (Rp)</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)' }}>
                          {rp(activeProject.v)}
                        </div>
                      </div>
                      <div>
                        <div className="mut" style={{ fontSize: '11.5px', marginBottom: '2px' }}>Billing type</div>
                        <div style={{ fontSize: '13.5px', color: 'var(--fg)' }}>
                          {activeProject.billingType || 'One-time'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mut" style={{ fontSize: '11.5px', marginBottom: '2px' }}>Deadline</div>
                      <div style={{ fontSize: '13px', color: 'var(--fg)' }}>
                        {activeProject.due ? dt(activeProject.due) : '—'}
                      </div>
                    </div>

                    {activeProject.desc && (
                      <div>
                        <div className="mut" style={{ fontSize: '11.5px', marginBottom: '4px' }}>Scope</div>
                        <div
                          style={{
                            fontSize: '12.5px',
                            lineHeight: '1.55',
                            color: 'var(--fg)',
                            whiteSpace: 'pre-wrap',
                            background: 'var(--panel)',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--line)',
                          }}
                        >
                          {activeProject.desc}
                        </div>
                      </div>
                    )}

                    {activeProject.items && activeProject.items.length > 0 && (
                      <div>
                        <div className="mut" style={{ fontSize: '11.5px', marginBottom: '6px' }}>Cost items</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {activeProject.items.map((it, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifySelf: 'stretch',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12.5px',
                                padding: '8px 10px',
                                background: 'var(--panel)',
                                borderRadius: '6px',
                                border: '1px solid var(--line)',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1, paddingRight: '10px' }}>
                                <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{it.d || activeProject.name}</span>
                                {it.type && <span className="mut" style={{ fontSize: '11px' }}>{it.type}</span>}
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap' }}>
                                {rp(+it.p || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Linked Quotations & Proposals */}
                {(() => {
                  const linkedQuotes = quotes.filter((q) => q.pid === activeProject.id);
                  const unlinkedQuotesForClient = quotes.filter(
                    (q) =>
                      (!q.pid || q.pid === 0) &&
                      (q.cn.toLowerCase() === c.name.toLowerCase() ||
                        (q.mail && c.mail && q.mail.toLowerCase() === c.mail.toLowerCase()) ||
                        (q.co && c.co && q.co.toLowerCase() === c.co.toLowerCase()))
                  );

                  return (
                    <div className="sec">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <small style={{ margin: 0 }}>Quotations &amp; Proposals ({linkedQuotes.length})</small>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => {
                            handleStartNewQuote(activeProject.id, activeProject.c);
                            closeDrawer();
                          }}
                        >
                          <Icon name="plus" size={13} />
                          New quote
                        </button>
                      </div>

                      {linkedQuotes.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {linkedQuotes.map((q) => {
                            const quoteTotal = q.items.reduce((acc, curr) => acc + (curr.q || 1) * curr.p, 0);
                            return (
                              <div
                                key={q.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  background: 'var(--soft)',
                                  borderRadius: '8px',
                                  border: '1px solid var(--line)',
                                  gap: '10px',
                                }}
                              >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 500, fontSize: '13px' }}>
                                      {formatQuoteNo(q.no, q.date, q.senderName)}
                                    </span>
                                    <span className={`st ${q.s === 'Accepted' ? 'Finished' : q.s === 'Sent' ? 'Progress' : 'Pending'}`} style={{ fontSize: '10.5px', padding: '1px 7px' }}>
                                      {q.s}
                                    </span>
                                  </div>
                                  <div className="mut" style={{ fontSize: '12px', marginTop: '3px' }}>
                                    {q.title} · {rp(quoteTotal)}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    className="btn sm"
                                    onClick={() => {
                                      openDoc('quo', q.id);
                                    }}
                                    title="View quotation"
                                  >
                                    <Icon name="file" size={13} />
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    className="ib"
                                    style={{ width: '28px', height: '28px' }}
                                    onClick={() => handleUnlinkQuoteFromProject(q.id)}
                                    title="Unlink from project"
                                    aria-label="Unlink quotation"
                                  >
                                    <Icon name="x" size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mut" style={{ fontSize: '12.5px', padding: '2px 0' }}>
                          No quotations linked to this project yet.
                        </div>
                      )}

                      {unlinkedQuotesForClient.length > 0 && (
                        <div style={{ marginTop: '10px', padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px dashed var(--line)' }}>
                          <div className="mut" style={{ fontSize: '11.5px', marginBottom: '6px' }}>
                            Attach existing standalone quotation from {c.name}:
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                              className="in"
                              style={{ fontSize: '12.5px', height: '30px' }}
                              defaultValue=""
                              id={`attach-quote-${activeProject.id}`}
                            >
                              <option value="" disabled>Select quotation...</option>
                              {unlinkedQuotesForClient.map((uq) => (
                                <option key={uq.id} value={uq.id}>
                                  {formatQuoteNo(uq.no, uq.date, uq.senderName)} — {uq.title}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn sm pri"
                              style={{ height: '30px', flexShrink: 0 }}
                              onClick={() => {
                                const sel = document.getElementById(`attach-quote-${activeProject.id}`) as HTMLSelectElement;
                                if (sel && sel.value) {
                                  handleLinkQuoteToProject(+sel.value, activeProject.id);
                                }
                              }}
                            >
                              Attach
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Client info in drawer */}
                <div className="sec">
                  <small>Client</small>
                  <div className="drawer-client-box">
                    <div className="kv">
                      <Icon name="users" />
                      <b>{c.name}</b>
                    </div>
                    {c.co && (
                      <div className="kv">
                        <Icon name="bld" />
                        <span>{c.co}</span>
                      </div>
                    )}
                    {c.mail && (
                      <div className="kv">
                        <Icon name="mail" />
                        <span>{c.mail}</span>
                      </div>
                    )}
                    {c.tel && (
                      <div className="kv">
                        <Icon name="phone" />
                        <span>{c.tel}</span>
                      </div>
                    )}
                    <button
                      className="btn sm"
                      id="vc"
                      style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                      onClick={() => {
                        setActiveClientDrawerId(activeProject.c);
                        setActiveProjectDrawerId(null);
                      }}
                    >
                      View client profile
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div className="sec">
                  <small>Notes</small>
                  <div className="f" style={{ margin: 0 }}>
                    <AutoTextarea
                      id="nt"
                      placeholder="Reminders, links…"
                      value={activeProject.n}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProjects((prev) =>
                          prev.map((p) =>
                            p.id === activeProject.id
                              ? { ...p, n: val }
                              : p
                          )
                        );
                      }}
                    />
                  </div>
                </div>

                {/* Delete button */}
                <button
                  className={`btn danger ${deleteArmed ? 'arm' : ''}`}
                  id="del"
                  onClick={() => handleDeleteProject(activeProject.id)}
                >
                  <Icon name="trash" />
                  {deleteArmed ? 'Click again to confirm' : 'Delete project'}
                </button>
              </>
            );
          })()}
        </div>
      )}

      {cancelTarget && (
        <div
          className="pin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCancelTarget(null);
          }}
        >
          <div className="pin-modal-card" role="dialog" aria-modal="true" style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
              Cancel {cancelTarget.label}?
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--mut)', margin: '6px 0 0', lineHeight: 1.45 }}>
              The {rp(cancelTarget.amount)} payment will be cancelled and the project value will
              drop by that amount. Existing invoices and received payments stay on record.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
              <button type="button" className="btn out" onClick={() => setCancelTarget(null)}>
                Keep
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  handleCancelPlanItem(cancelTarget.projectId, cancelTarget.itemId);
                  setCancelTarget(null);
                }}
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
