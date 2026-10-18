'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { AutoTextarea } from '@/components/AutoTextarea';
import { DatePicker } from '@/components/DatePicker';
import { DocumentWatermark } from '@/components/DocumentWatermark';
import { DocLangToggle } from '@/components/DocLangToggle';
import { NewQuotePreviewEn } from './NewDocPreviewEn';
import {
  rp,
  dt,
  today,
  addDays,
  isRecurringBilling,
  normalizeBillingType,
  getBillingTypeDocLabel,
} from '@/lib/formatters';

export function NewQuoteView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams.get('edit');
  const {
    quotes,
    clients,
    projects,
    getClient,
    quoteClientMode,
    setQuoteClientMode,
    selectedQuoteClientId,
    setSelectedQuoteClientId,
    selectedQuoteProjectId,
    setSelectedQuoteProjectId,
    newQuoteData,
    setNewQuoteData,
    handleSaveQuotationSubmit,
    studioProfile,
    getNextQuoteNo,
    formatQuoteNo,
    editingQuoteId,
    setEditingQuoteId,
  } = useDashboard();

  const [draggedQuoteItemIdx, setDraggedQuoteItemIdx] = React.useState<number | null>(null);
  const [dragOverQuoteItemIdx, setDragOverQuoteItemIdx] = React.useState<number | null>(null);
  const [dragHandleActiveIdx, setDragHandleActiveIdx] = React.useState<number | null>(null);

  const moveQuoteItem = (fromIdx: number, toIdx: number) => {
    setNewQuoteData((prev) => {
      if (toIdx < 0 || toIdx >= prev.items.length) return prev;
      const next = [...prev.items];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, items: next };
    });
  };

  const moveQuoteScope = (fromIdx: number, toIdx: number) => {
    setNewQuoteData((prev) => {
      if (toIdx < 0 || toIdx >= prev.scope.length) return prev;
      const next = [...prev.scope];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, scope: next };
    });
  };

  const moveQuoteService = (fromIdx: number, toIdx: number) => {
    setNewQuoteData((prev) => {
      if (toIdx < 0 || toIdx >= prev.services.length) return prev;
      const next = [...prev.services];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, services: next };
    });
  };

  const moveQuoteTerm = (fromIdx: number, toIdx: number) => {
    setNewQuoteData((prev) => {
      const curr = prev.terms || [''];
      if (toIdx < 0 || toIdx >= curr.length) return prev;
      const next = [...curr];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, terms: next };
    });
  };

  useEffect(() => {
    if (!editParam) {
      if (editingQuoteId) setEditingQuoteId(null);
      return;
    }
    const editId = Number(editParam);
    if (!editId) return;

    if (editingQuoteId !== editId) {
      const q = quotes.find((item) => item.id === editId);
      if (!q) return;
      if (q.s !== 'Draft' || q.pid) {
        router.replace(`/dashboard/doc?t=quo&a=${editId}`);
        return;
      }

      const targetClient = clients.find(
        (c) =>
          (c.name && c.name.toLowerCase() === (q.cn || '').toLowerCase()) ||
          (c.co && c.co.toLowerCase() === (q.co || '').toLowerCase())
      );

      setQuoteClientMode(targetClient ? 'existing' : 'new');
      setSelectedQuoteClientId(targetClient ? targetClient.id : '');
      setSelectedQuoteProjectId(q.pid || 0);
      setEditingQuoteId(editId);

      setNewQuoteData({
        cn: q.cn || '',
        co: q.co || '',
        mail: q.mail || '',
        tel: q.tel || '',
        title: q.title || '',
        date: q.date || today(),
        valid: q.valid || addDays(today(), 7),
        validDays: q.validDays || 7,
        scope: q.scope && q.scope.length ? q.scope : [''],
        items: q.items && q.items.length
          ? q.items.map((it) => ({
              d: it.d || '',
              type: it.type || 'One-time',
              q: it.q != null ? it.q : 1,
              p: it.p != null ? it.p : '',
            }))
          : [{ d: '', type: 'One-time', q: 1, p: '' }],
        services: q.services && q.services.length ? q.services : [''],
        terms: (q.terms && q.terms.length > 0)
          ? q.terms
          : [
              q.paymentTerms ? `Syarat pembayaran: ${q.paymentTerms}` : '',
              q.note || '',
            ].filter(Boolean).length
            ? [
                q.paymentTerms ? `Syarat pembayaran: ${q.paymentTerms}` : '',
                q.note || '',
              ].filter(Boolean)
            : [''],
        paymentTerms: q.paymentTerms || '',
        note: q.note || '',
        senderName: q.senderName || '',
        senderTagline: q.senderTagline || '',
        senderEmail: q.senderEmail || '',
        senderPhone: q.senderPhone || '',
        lang: q.lang || 'id',
      });
    }
  }, [
    editParam,
    editingQuoteId,
    quotes,
    clients,
    router,
    setEditingQuoteId,
    setQuoteClientMode,
    setSelectedQuoteClientId,
    setSelectedQuoteProjectId,
    setNewQuoteData,
  ]);

  const existingQuote = editingQuoteId ? quotes.find((q) => q.id === editingQuoteId) : null;

  return (
    <div>
      <div className="top">
        <button
          className="ib"
          id="bk"
          onClick={() => {
            if (editingQuoteId) {
              router.push(`/dashboard/doc?t=quo&a=${editingQuoteId}`);
            } else {
              router.push('/dashboard/quotations');
            }
          }}
          aria-label={editingQuoteId ? 'Back to document' : 'Back to quotations'}
        >
          <Icon name="back" size={18} />
        </button>
        <h1>{editingQuoteId ? 'Edit quotation' : 'New quotation'}</h1>
      </div>

      <div className="project-split-layout">
        <div className="project-form-col">
          {/* Client info */}
          <div className="panel">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <h3 style={{ margin: 0 }}>Client</h3>
              {clients.length > 0 && (
                <div className="chips" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={`chip ${quoteClientMode === 'existing' ? 'on' : ''}`}
                    onClick={() => {
                      setQuoteClientMode('existing');
                      const targetClient =
                        clients.find((c) => c.id === selectedQuoteClientId) || clients[0];
                      if (targetClient) {
                        setSelectedQuoteClientId(targetClient.id);
                        setNewQuoteData((prev) => ({
                          ...prev,
                          cn: targetClient.name,
                          co: targetClient.co,
                          mail: targetClient.mail,
                          tel: targetClient.tel,
                        }));
                      }
                    }}
                  >
                    Existing client
                  </button>
                  <button
                    type="button"
                    className={`chip ${quoteClientMode === 'new' ? 'on' : ''}`}
                    onClick={() => {
                      setQuoteClientMode('new');
                      setNewQuoteData((prev) => ({
                        ...prev,
                        cn: '',
                        co: '',
                        mail: '',
                        tel: '',
                      }));
                    }}
                  >
                    New client
                  </button>
                </div>
              )}
            </div>

            {quoteClientMode === 'existing' && clients.length > 0 ? (
              <div>
                <div className="f">
                  <label htmlFor="select-quote-client">Select client</label>
                  <select
                    id="select-quote-client"
                    className="in"
                    value={selectedQuoteClientId}
                    onChange={(e) => {
                      const chosenId = +e.target.value;
                      setSelectedQuoteClientId(chosenId);
                      const found = clients.find((c) => c.id === chosenId);
                      if (found) {
                        setNewQuoteData((prev) => ({
                          ...prev,
                          cn: found.name,
                          co: found.co,
                          mail: found.mail,
                          tel: found.tel,
                        }));
                      }
                    }}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.co ? `· ${c.co}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const activeSelectedClient =
                    clients.find((c) => c.id === selectedQuoteClientId) || clients[0];
                  if (!activeSelectedClient) return null;
                  return (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--soft)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '13px',
                        marginTop: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span className="mut" style={{ fontSize: '12px' }}>
                          Company
                        </span>
                        <span style={{ fontWeight: 500 }}>{activeSelectedClient.co || '—'}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span className="mut" style={{ fontSize: '12px' }}>
                          Email
                        </span>
                        <span>{activeSelectedClient.mail || '—'}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span className="mut" style={{ fontSize: '12px' }}>
                          Phone
                        </span>
                        <span>{activeSelectedClient.tel || '—'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div>
                <div className="f">
                  <label htmlFor="qc">Name</label>
                  <input
                    id="qc"
                    type="text"
                    placeholder="e.g. Maya Lestari"
                    value={newQuoteData.cn}
                    onChange={(e) =>
                      setNewQuoteData((prev) => ({ ...prev, cn: e.target.value }))
                    }
                  />
                </div>
                <div className="f">
                  <label htmlFor="qo">Company</label>
                  <input
                    id="qo"
                    type="text"
                    placeholder="e.g. PT Digital Nusantara"
                    value={newQuoteData.co}
                    onChange={(e) =>
                      setNewQuoteData((prev) => ({ ...prev, co: e.target.value }))
                    }
                  />
                </div>
                <div className="two">
                  <div className="f">
                    <label htmlFor="qm">Email</label>
                    <input
                      id="qm"
                      type="email"
                      placeholder="client@company.com"
                      value={newQuoteData.mail}
                      onChange={(e) =>
                        setNewQuoteData((prev) => ({ ...prev, mail: e.target.value }))
                      }
                    />
                  </div>
                  <div className="f">
                    <label htmlFor="qt">Phone</label>
                    <input
                      id="qt"
                      type="tel"
                      placeholder="+62 812..."
                      value={newQuoteData.tel}
                      onChange={(e) =>
                        setNewQuoteData((prev) => ({ ...prev, tel: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Relate to Project Panel (Optional) */}
          {projects.length > 0 && (
            <div className="panel">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <h3 style={{ margin: 0 }}>Relate to project (Optional)</h3>
              </div>
              <p
                style={{
                  fontSize: '12.5px',
                  color: 'var(--mut)',
                  margin: '0 0 10px 0',
                  lineHeight: 1.45,
                }}
              >
                Create a standalone quotation or link it to an active project to track proposals and
                scope add-ons.
              </p>
              <div className="f" style={{ margin: 0 }}>
                <label htmlFor="select-quote-project">Select project</label>
                <select
                  id="select-quote-project"
                  className="in"
                  value={selectedQuoteProjectId}
                  onChange={(e) => {
                    const chosenPid = +e.target.value;
                    setSelectedQuoteProjectId(chosenPid);
                    if (chosenPid > 0) {
                      const foundProj = projects.find((p) => p.id === chosenPid);
                      if (foundProj) {
                        const matchedClient = clients.find((c) => c.id === foundProj.c);
                        if (matchedClient) {
                          setSelectedQuoteClientId(matchedClient.id);
                          setQuoteClientMode('existing');
                          setNewQuoteData((prev) => ({
                            ...prev,
                            cn: matchedClient.name,
                            co: matchedClient.co,
                            mail: matchedClient.mail,
                            tel: matchedClient.tel,
                            title: foundProj.name,
                          }));
                        } else {
                          setNewQuoteData((prev) => ({
                            ...prev,
                            title: foundProj.name,
                          }));
                        }
                      }
                    }
                  }}
                >
                  <option value={0}>None (Standalone quotation)</option>
                  {projects.map((p) => {
                    const c = getClient(p.c);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} {c.name ? `(${c.name})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {/* Quotation Details */}
          <div className="panel">
            <h3>Quotation</h3>
            <div className="f">
              <label htmlFor="qn">Subject / Project Title</label>
              <input
                id="qn"
                type="text"
                placeholder="Quotation title"
                value={newQuoteData.title}
                disabled={selectedQuoteProjectId > 0}
                style={
                  selectedQuoteProjectId > 0
                    ? {
                        opacity: 0.7,
                        cursor: 'not-allowed',
                        backgroundColor: 'var(--card-subtle, rgba(255,255,255,0.03))',
                      }
                    : undefined
                }
                onChange={(e) =>
                  setNewQuoteData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="two">
              <div className="f">
                <label htmlFor="qd">Date</label>
                <DatePicker
                  id="qd"
                  value={newQuoteData.date}
                  onChange={(val) =>
                    setNewQuoteData((prev) => ({
                      ...prev,
                      date: val,
                      valid: addDays(val, prev.validDays || 7),
                    }))
                  }
                />
              </div>
              <div className="two">
                <div className="f">
                  <label htmlFor="qvd">Valid (Days)</label>
                  <input
                    id="qvd"
                    type="number"
                    min="1"
                    max="365"
                    value={newQuoteData.validDays === 0 ? '' : newQuoteData.validDays}
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                    }}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const days = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                      setNewQuoteData((prev) => ({
                        ...prev,
                        validDays: days,
                        valid: addDays(prev.date || today(), days),
                      }));
                    }}
                  />
                </div>
                <div className="f">
                  <label htmlFor="qv">Valid Until</label>
                  <DatePicker id="qv" value={newQuoteData.valid} disabled={true} />
                </div>
              </div>
            </div>
          </div>

          {/* Scope of Work */}
          <div className="panel">
            <div className="row" style={{ marginBottom: '10px' }}>
              <h3>Scope of work</h3>
              <button
                className="btn sm"
                onClick={() => {
                  setNewQuoteData((prev) => ({
                    ...prev,
                    scope: [...prev.scope, ''],
                  }));
                }}
              >
                <Icon name="plus" size={14} />
                Add scope
              </button>
            </div>
            {newQuoteData.scope.map((sc, i) => (
              <div key={i} className="row" style={{ marginBottom: '8px' }}>
                <span className="mut" style={{ width: '22px', fontSize: '13px' }}>
                  {i + 1}.
                </span>
                <input
                  className="in"
                  placeholder={`Scope item ${i + 1}`}
                  value={sc}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewQuoteData((prev) => {
                      const next = [...prev.scope];
                      next[i] = val;
                      return { ...prev, scope: next };
                    });
                  }}
                />
                <div className="item-actions">
                  <button
                    type="button"
                    className="ib"
                    disabled={i === 0}
                    onClick={() => moveQuoteScope(i, i - 1)}
                    title="Move up"
                    aria-label="Move up"
                  >
                    <Icon name="arrow-up" size={13} />
                  </button>
                  <button
                    type="button"
                    className="ib"
                    disabled={i === newQuoteData.scope.length - 1}
                    onClick={() => moveQuoteScope(i, i + 1)}
                    title="Move down"
                    aria-label="Move down"
                  >
                    <Icon name="arrow-down" size={13} />
                  </button>
                  <button
                    type="button"
                    className="ib"
                    onClick={() => {
                      setNewQuoteData((prev) => {
                        const next = prev.scope.filter((_, idx) => idx !== i);
                        return {
                          ...prev,
                          scope: next.length ? next : [''],
                        };
                      });
                    }}
                    aria-label="Remove scope item"
                    title="Remove scope item"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Cost Breakdown Items */}
          <div className="panel">
            <div className="row" style={{ marginBottom: '10px' }}>
              <h3>Cost items</h3>
              <button
                className="btn sm"
                id="ai"
                onClick={() => {
                  setNewQuoteData((prev) => ({
                    ...prev,
                    items: [...prev.items, { d: '', type: 'One-time', q: 1, p: '' }],
                  }));
                }}
              >
                <Icon name="plus" size={14} />
                Add cost item
              </button>
            </div>
            <div id="its">
              <div
                className="pl hd"
                style={{ gridTemplateColumns: '24px 2fr 1.1fr 60px 1.2fr 1fr 72px' }}
              >
                <span />
                <span>Item</span>
                <span>Billing type</span>
                <span>Qty</span>
                <span>Cost (Rp)</span>
                <span>Total</span>
                <span />
              </div>
              {newQuoteData.items.map((r, i) => {
                const amount = (+r.q || 0) * (+r.p || 0);
                const isDragging = draggedQuoteItemIdx === i;
                const isDragOver = dragOverQuoteItemIdx === i;
                return (
                  <div
                    key={i}
                    className={`pl ${isDragging ? 'item-dragging' : ''} ${isDragOver ? 'item-drag-over' : ''}`}
                    style={{ gridTemplateColumns: '24px 2fr 1.1fr 60px 1.2fr 1fr 72px' }}
                    draggable={dragHandleActiveIdx === i}
                    onDragStart={() => setDraggedQuoteItemIdx(i)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverQuoteItemIdx !== i) setDragOverQuoteItemIdx(i);
                    }}
                    onDrop={() => {
                      if (draggedQuoteItemIdx !== null && draggedQuoteItemIdx !== i) {
                        moveQuoteItem(draggedQuoteItemIdx, i);
                      }
                      setDraggedQuoteItemIdx(null);
                      setDragOverQuoteItemIdx(null);
                    }}
                    onDragEnd={() => {
                      setDraggedQuoteItemIdx(null);
                      setDragOverQuoteItemIdx(null);
                    }}
                  >
                    <button
                      type="button"
                      className="drag-handle-btn"
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                      onMouseEnter={() => setDragHandleActiveIdx(i)}
                      onMouseLeave={() => setDragHandleActiveIdx(null)}
                      onTouchStart={() => setDragHandleActiveIdx(i)}
                      tabIndex={-1}
                    >
                      <Icon name="grip-vertical" size={14} />
                    </button>
                    <input
                      className="in"
                      placeholder="Item description"
                      value={r.d}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewQuoteData((prev) => {
                          const next = [...prev.items];
                          next[i] = { ...next[i], d: val };
                          return { ...prev, items: next };
                        });
                      }}
                    />
                    <select
                      className="in"
                      value={normalizeBillingType(r.type)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewQuoteData((prev) => {
                          const next = [...prev.items];
                          next[i] = { ...next[i], type: val };
                          return { ...prev, items: next };
                        });
                      }}
                    >
                      <option value="One-time">One-time</option>
                      <option value="Per Project">Per Project</option>
                      <option value="Milestone">Milestone / Termin</option>
                      <option value="Hourly">Hourly</option>
                      <option value="Mingguan (Recurring)">Mingguan (Recurring)</option>
                      <option value="Monthly (Recurring)">Monthly (Recurring)</option>
                      <option value="Quarterly (Recurring)">Quarterly (Recurring)</option>
                      <option value="Tahunan (Recurring)">Tahunan (Recurring)</option>
                      <option value="Retainer (Recurring)">Retainer (Recurring)</option>
                    </select>
                    <input
                      className="in"
                      type="number"
                      min="0"
                      value={r.q}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                      }}
                      onChange={(e) => {
                        const val = +e.target.value;
                        setNewQuoteData((prev) => {
                          const next = [...prev.items];
                          next[i] = { ...next[i], q: val };
                          return { ...prev, items: next };
                        });
                      }}
                    />
                    <input
                      className="in"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={r.p}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewQuoteData((prev) => {
                          const next = [...prev.items];
                          next[i] = { ...next[i], p: val };
                          return { ...prev, items: next };
                        });
                      }}
                    />
                    <span className="amt">{rp(amount)}</span>
                    <div className="item-actions">
                      <button
                        type="button"
                        className="ib"
                        disabled={i === 0}
                        onClick={() => moveQuoteItem(i, i - 1)}
                        title="Move up"
                        aria-label="Move up"
                      >
                        <Icon name="arrow-up" size={13} />
                      </button>
                      <button
                        type="button"
                        className="ib"
                        disabled={i === newQuoteData.items.length - 1}
                        onClick={() => moveQuoteItem(i, i + 1)}
                        title="Move down"
                        aria-label="Move down"
                      >
                        <Icon name="arrow-down" size={13} />
                      </button>
                      <button
                        type="button"
                        className="ib"
                        onClick={() => {
                          setNewQuoteData((prev) => {
                            const next = prev.items.filter((_, idx) => idx !== i);
                            return {
                              ...prev,
                              items: next.length ? next : [{ d: '', type: 'One-time', q: 1, p: '' }],
                            };
                          });
                        }}
                        aria-label="Remove item"
                        title="Remove item"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {(() => {
              const oneTimeItems = newQuoteData.items.filter((it) => !isRecurringBilling(it.type));
              const recurringItems = newQuoteData.items.filter((it) => isRecurringBilling(it.type));
              const oneTimeTot = oneTimeItems.reduce(
                (acc, curr) => acc + (+curr.q || 1) * (+curr.p || 0),
                0
              );
              const recurringTot = recurringItems.reduce(
                (acc, curr) => acc + (+curr.q || 1) * (+curr.p || 0),
                0
              );

              return (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    background: 'var(--soft)',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    marginTop: '12px',
                    fontSize: '12.5px',
                  }}
                >
                  <div>
                    <span className="mut" style={{ marginRight: '6px' }}>Total:</span>
                    <span style={{ fontWeight: 700, color: 'var(--fg)', fontSize: '13px' }}>
                      {rp(oneTimeTot)}
                    </span>
                  </div>
                  {recurringItems.length > 0 && (
                    <div>
                      <span className="mut" style={{ marginRight: '6px' }}>Recurring:</span>
                      <span style={{ fontWeight: 700, color: 'var(--ac, #f16818)', fontSize: '13px' }}>
                        {rp(recurringTot)} / bln
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Cakupan/Services */}
          <div className="panel">
            <div className="row" style={{ marginBottom: '10px' }}>
              <h3>Deliverables / Services</h3>
              <button
                className="btn sm"
                onClick={() => {
                  setNewQuoteData((prev) => ({
                    ...prev,
                    services: [...prev.services, ''],
                  }));
                }}
              >
                <Icon name="plus" size={14} />
                Add service
              </button>
            </div>
            {newQuoteData.services.map((sv, i) => (
              <div key={i} className="row" style={{ marginBottom: '8px' }}>
                <span className="mut" style={{ width: '22px', fontSize: '13px' }}>
                  {i + 1}.
                </span>
                <input
                  className="in"
                  placeholder={`Deliverable item ${i + 1}`}
                  value={sv}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewQuoteData((prev) => {
                      const next = [...prev.services];
                      next[i] = val;
                      return { ...prev, services: next };
                    });
                  }}
                />
                <div className="item-actions">
                  <button
                    type="button"
                    className="ib"
                    disabled={i === 0}
                    onClick={() => moveQuoteService(i, i - 1)}
                    title="Move up"
                    aria-label="Move up"
                  >
                    <Icon name="arrow-up" size={13} />
                  </button>
                  <button
                    type="button"
                    className="ib"
                    disabled={i === newQuoteData.services.length - 1}
                    onClick={() => moveQuoteService(i, i + 1)}
                    title="Move down"
                    aria-label="Move down"
                  >
                    <Icon name="arrow-down" size={13} />
                  </button>
                  <button
                    type="button"
                    className="ib"
                    onClick={() => {
                      setNewQuoteData((prev) => {
                        const next = prev.services.filter((_, idx) => idx !== i);
                        return {
                          ...prev,
                          services: next.length ? next : [''],
                        };
                      });
                    }}
                    aria-label="Remove service item"
                    title="Remove service item"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Terms & conditions */}
          <div className="panel">
            <div className="row" style={{ marginBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>Terms &amp; conditions</h3>
              <button
                type="button"
                className="btn sm"
                onClick={() => {
                  setNewQuoteData((prev) => ({
                    ...prev,
                    terms: [...(prev.terms || []), ''],
                  }));
                }}
              >
                <Icon name="plus" size={14} />
                Add term
              </button>
            </div>
            {(newQuoteData.terms && newQuoteData.terms.length > 0 ? newQuoteData.terms : ['']).map((term, i) => (
              <div key={i} className="row" style={{ marginBottom: '8px' }}>
                <span className="mut" style={{ width: '22px', fontSize: '13px' }}>
                  {i + 1}.
                </span>
                <input
                  className="in"
                  placeholder={`Term / condition item ${i + 1}`}
                  value={term}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewQuoteData((prev) => {
                      const next = [...(prev.terms || [''])];
                      next[i] = val;
                      return { ...prev, terms: next };
                    });
                  }}
                />
                <div className="item-actions">
                  <button
                    type="button"
                    className="ib"
                    disabled={i === 0}
                    onClick={() => moveQuoteTerm(i, i - 1)}
                    title="Move up"
                    aria-label="Move up"
                  >
                    <Icon name="arrow-up" size={13} />
                  </button>
                  <button
                    type="button"
                    className="ib"
                    disabled={i === (newQuoteData.terms?.length || 1) - 1}
                    onClick={() => moveQuoteTerm(i, i + 1)}
                    title="Move down"
                    aria-label="Move down"
                  >
                    <Icon name="arrow-down" size={13} />
                  </button>
                  <button
                    type="button"
                    className="ib"
                    onClick={() => {
                      setNewQuoteData((prev) => {
                        const curr = prev.terms || [''];
                        const next = curr.filter((_, idx) => idx !== i);
                        return {
                          ...prev,
                          terms: next.length ? next : [''],
                        };
                      });
                    }}
                    aria-label="Remove term item"
                    title="Remove term item"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Freelancer / Sender Profile */}
          <div className="panel">
            <h3>Freelancer / Sender</h3>
            <div className="two">
              <div className="f">
                <label htmlFor="qsn">Name / Studio</label>
                <input
                  id="qsn"
                  type="text"
                  placeholder="e.g. Studio Name / Freelancer"
                  value={newQuoteData.senderName}
                  onChange={(e) =>
                    setNewQuoteData((prev) => ({ ...prev, senderName: e.target.value }))
                  }
                />
              </div>
              <div className="f">
                <label htmlFor="qst">Tagline</label>
                <input
                  id="qst"
                  type="text"
                  placeholder="e.g. Digital Partner Solution"
                  value={newQuoteData.senderTagline}
                  onChange={(e) =>
                    setNewQuoteData((prev) => ({ ...prev, senderTagline: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="two">
              <div className="f" style={{ margin: 0 }}>
                <label htmlFor="qse">Email</label>
                <input
                  id="qse"
                  type="email"
                  placeholder="e.g. contact@studio.com"
                  value={newQuoteData.senderEmail}
                  onChange={(e) =>
                    setNewQuoteData((prev) => ({ ...prev, senderEmail: e.target.value }))
                  }
                />
              </div>
              <div className="f" style={{ margin: 0 }}>
                <label htmlFor="qsp">Phone</label>
                <input
                  id="qsp"
                  type="tel"
                  placeholder="e.g. 0812-3456-7890"
                  value={newQuoteData.senderPhone}
                  onChange={(e) =>
                    setNewQuoteData((prev) => ({ ...prev, senderPhone: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Submit Panel */}
          <div className="panel">
            <div className="row" style={{ marginBottom: '8px' }}>
              <span className="mut">Total Quotation</span>
              <b>
                {rp(
                  newQuoteData.items.reduce(
                    (acc, curr) => acc + (+curr.q || 0) * (+curr.p || 0),
                    0
                  )
                )}
              </b>
            </div>
            <p className="note" style={{ margin: '0 0 12px' }}>
              {editingQuoteId
                ? 'Save your edits to this draft quotation.'
                : 'When the client accepts, convert it to a project in one click.'}
            </p>
            <button
              className="btn pri"
              id="mk"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleSaveQuotationSubmit}
            >
              {editingQuoteId ? 'Save changes' : 'Save quotation'}
            </button>
          </div>
        </div>

        {/* Right Column: Live Quotation Preview */}
        <div className="project-preview-col">
          <div className="project-preview-sticky-wrap">
            <DocLangToggle
              value={newQuoteData.lang}
              onChange={(lang) => setNewQuoteData((prev) => ({ ...prev, lang }))}
            />
            {newQuoteData.lang === 'en' ? (
              <NewQuotePreviewEn />
            ) : (
            <div className="docx-paper docx-a4">
              <div className="docx-body-content">
                {/* Header */}
                <div className="docx-header-grid">
                  <div>
                    <div className="docx-h-title">Quotation</div>
                    <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                      No. Quotation {existingQuote ? formatQuoteNo(existingQuote.no, newQuoteData.date, newQuoteData.senderName) : getNextQuoteNo(newQuoteData.date)} (Draft)
                    </div>
                    <div className="docx-h-sub">
                      Valid until {newQuoteData.valid ? dt(newQuoteData.valid) : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="docx-h-title">
                      {newQuoteData.senderName || studioProfile.studioName || (
                        <span style={{ color: '#888', fontStyle: 'italic', fontWeight: 400 }}>
                          [Nama Studio Belum Diatur]
                        </span>
                      )}
                    </div>
                    {(newQuoteData.senderTagline || studioProfile.tagline) && (
                      <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                        {newQuoteData.senderTagline || studioProfile.tagline}
                      </div>
                    )}
                    {(newQuoteData.senderEmail ||
                      studioProfile.email ||
                      newQuoteData.senderPhone ||
                      studioProfile.phone) && (
                      <div className="docx-h-sub">
                        {newQuoteData.senderEmail || studioProfile.email}
                        {newQuoteData.senderPhone || studioProfile.phone
                          ? ` · ${newQuoteData.senderPhone || studioProfile.phone}`
                          : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recipient & Sender Meta Box */}
                <div className="docx-meta-grid">
                  <div>
                    <div style={{ marginBottom: '4px' }}>
                      <b>Kepada:</b> {newQuoteData.cn || 'Nama Klien'}{' '}
                      {newQuoteData.co ? `(${newQuoteData.co})` : ''}
                    </div>
                    <div>
                      <b>Subject:</b> Quotation {newQuoteData.title || 'Layanan Project'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>
                      <b>Dari:</b>{' '}
                      {newQuoteData.senderName || studioProfile.studioName || (
                        <span style={{ color: '#888', fontStyle: 'italic' }}>
                          [Atur di Settings]
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 1: Scope */}
                <div className="docx-sec-title">Ruang Lingkup Pekerjaan (Scope of Work)</div>
                <ol className="docx-list">
                  {(newQuoteData.scope.filter((s) => s.trim()).length > 0
                    ? newQuoteData.scope.filter((s) => s.trim())
                    : ['Lingkup pekerjaan sesuai kesepakatan']
                  ).map((sc, idx) => (
                    <li key={idx}>{sc}</li>
                  ))}
                </ol>

                {/* Section 2: Rincian Biaya */}
                <div className="docx-sec-title bold">Rincian Biaya</div>
                <table className="docx-cost-table">
                  <thead>
                    <tr>
                      <th style={{ width: '46%' }}>Item</th>
                      <th className="c" style={{ width: '30%' }}>
                        Jenis Biaya
                      </th>
                      <th className="c" style={{ width: '24%' }}>
                        Biaya
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {newQuoteData.items.map((it, idx) => (
                      <tr key={idx}>
                        <td>
                          {it.d || `Item Layanan ${idx + 1}`}
                          {+it.q > 1 ? ` (${it.q}x)` : ''}
                        </td>
                        <td className="c">
                          {getBillingTypeDocLabel(it.type)}
                        </td>
                        <td className="c" style={{ fontWeight: 700 }}>
                          Rp{((+it.q || 1) * (+it.p || 0)).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const oneTimeItems = newQuoteData.items.filter((it) => !isRecurringBilling(it.type));
                      const recurringItems = newQuoteData.items.filter((it) => isRecurringBilling(it.type));
                      const oneTimeTot = oneTimeItems.reduce(
                        (acc, curr) => acc + (+curr.q || 1) * (+curr.p || 0),
                        0
                      );
                      const recurringTot = recurringItems.reduce(
                        (acc, curr) => acc + (+curr.q || 1) * (+curr.p || 0),
                        0
                      );

                      if (recurringItems.length > 0 && oneTimeItems.length > 0) {
                        return (
                          <>
                            <tr>
                              <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>
                                Total
                              </td>
                              <td style={{ fontWeight: 700 }}>
                                Rp{oneTimeTot.toLocaleString('id-ID')}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700, color: '#475569' }}>
                                Recurring
                              </td>
                              <td style={{ fontWeight: 700, color: '#475569' }}>
                                Rp{recurringTot.toLocaleString('id-ID')} / bulan
                              </td>
                            </tr>
                          </>
                        );
                      }

                      if (recurringItems.length > 0) {
                        return (
                          <tr>
                            <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>
                              Recurring
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              Rp{recurringTot.toLocaleString('id-ID')} / bulan
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>
                            Total
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            Rp{oneTimeTot.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>

                {/* Section 3: Cakupan/Services */}
                {newQuoteData.services.filter((s) => s.trim()).length > 0 && (
                  <>
                    <div className="docx-sec-title">Cakupan/Services</div>
                    <ol className="docx-list">
                      {newQuoteData.services
                        .filter((s) => s.trim())
                        .map((sv, idx) => (
                          <li key={idx}>{sv}</li>
                        ))}
                    </ol>
                  </>
                )}

                {/* Section 4: Syarat & Ketentuan */}
                <div className="docx-sec-title">Syarat &amp; Ketentuan</div>
                <ol className="docx-list">
                  {(() => {
                    const activeTerms = (newQuoteData.terms || []).filter((t) => t.trim());
                    const hasValidity = activeTerms.some((t) => /berlaku/i.test(t));
                    if (activeTerms.length > 0) {
                      return (
                        <>
                          {activeTerms.map((t, idx) => (
                            <li key={idx}>{t}</li>
                          ))}
                          {!hasValidity && (
                            <li>
                              Quotation ini berlaku {newQuoteData.validDays || 7} hari dari tanggal dikirimkan.
                            </li>
                          )}
                        </>
                      );
                    }
                    return (
                      <>
                        {newQuoteData.paymentTerms && (
                          <li>
                            <b>Syarat pembayaran: {newQuoteData.paymentTerms}</b>
                          </li>
                        )}
                        {newQuoteData.note && <li>{newQuoteData.note}</li>}
                        <li>
                          Quotation ini berlaku {newQuoteData.validDays || 7} hari dari tanggal dikirimkan.
                        </li>
                      </>
                    );
                  })()}
                </ol>
              </div>

              {/* Footer Wrap at bottom of page */}
              <div className="docx-footer-wrap">
                <div className="docx-footer">
                  <div style={{ marginBottom: '16px' }}>Terima kasih atas kepercayaannya.</div>
                  <div>Hormat Kami</div>
                  <div style={{ height: '36px' }} />
                  <div style={{ fontWeight: 700 }}>
                    {newQuoteData.senderName || studioProfile.studioName || 'Studio'}
                  </div>
                  {(newQuoteData.senderTagline || studioProfile.tagline) && (
                    <div style={{ fontSize: '13px' }}>
                      {newQuoteData.senderTagline || studioProfile.tagline}
                    </div>
                  )}
                </div>

                {/* Studio Subtle Bottom Watermark */}
                <DocumentWatermark />
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
