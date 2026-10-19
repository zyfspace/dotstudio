'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useDashboard,
  PRESETS,
  PRESET_NAMES,
  generatePlanFromPreset,
  isProjectAmountLocked,
} from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { AutoTextarea } from '@/components/AutoTextarea';
import { DatePicker } from '@/components/DatePicker';
import { DocumentWatermark } from '@/components/DocumentWatermark';
import { DocLangToggle } from '@/components/DocLangToggle';
import { NewInvoicePreviewEn } from './NewDocPreviewEn';
import { rp, dt, today, addDays, isRecurringBilling, normalizeBillingType, paymentTermDays } from '@/lib/formatters';

export function NewProjectView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams.get('edit');
  const {
    quotes,
    clients,
    selectedProjectQuoteId,
    setSelectedProjectQuoteId,
    selectedProjectClientId,
    setSelectedProjectClientId,
    projectClientMode,
    setProjectClientMode,
    newProjectData,
    setNewProjectData,
    formatQuoteNo,
    handlePlanPresetChange,
    handleCreateProjectSubmit,
    studioProfile,
    getNextInvoiceNo,
    formatInvoiceNo,
    projects,
    docState,
    editingProjectId,
    setEditingProjectId,
    loadProjectForEdit,
  } = useDashboard();
  const termDays = paymentTermDays(studioProfile.paymentTermDays);

  const [draggedProjectItemIdx, setDraggedProjectItemIdx] = React.useState<number | null>(null);
  const [dragOverProjectItemIdx, setDragOverProjectItemIdx] = React.useState<number | null>(null);
  const [dragHandleProjectIdx, setDragHandleProjectIdx] = React.useState<number | null>(null);

  // /dashboard/new?edit=<id> edits an existing project (and its invoices)
  useEffect(() => {
    if (!editParam) {
      if (editingProjectId) setEditingProjectId(null);
      return;
    }
    const editId = Number(editParam);
    if (!editId) return;
    if (editingProjectId !== editId) loadProjectForEdit(editId);
  }, [editParam, editingProjectId, setEditingProjectId, loadProjectForEdit]);

  const editingProject = editingProjectId
    ? projects.find((x) => x.id === editingProjectId)
    : undefined;
  // Amounts and payment scheme are fixed once money has moved
  const amountsLocked = !!editingProject && isProjectAmountLocked(editingProject);
  const backToDoc = docState?.t === 'inv' && docState.a === editingProjectId;

  const moveProjectItem = (fromIdx: number, toIdx: number) => {
    setNewProjectData((prev) => {
      if (toIdx < 0 || toIdx >= prev.items.length) return prev;
      const next = [...prev.items];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, items: next };
    });
  };

  const moveProjectPlan = (fromIdx: number, toIdx: number) => {
    setNewProjectData((prev) => {
      if (toIdx < 0 || toIdx >= prev.plan.length) return prev;
      const next = [...prev.plan];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, pre: 'custom', plan: next };
    });
  };

  return (
    <div>
      <div className="top">
        <button
          className="ib"
          id="bk"
          onClick={() => {
            if (editingProject && backToDoc && docState) {
              router.push(`/dashboard/doc?t=inv&a=${docState.a}&b=${docState.b}`);
            } else {
              router.push('/dashboard/projects');
            }
          }}
          aria-label={editingProject && backToDoc ? 'Back to invoice' : 'Back to projects'}
        >
          <Icon name="back" size={18} />
        </button>
        <h1>{editingProject ? 'Edit invoice' : 'New project'}</h1>
      </div>

      <div className="project-split-layout">
        {/* Left Column: Form Details */}
        <div className="project-form-col">
          {/* Client Details Panel */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>Client</h3>
              {clients.length > 0 && (
                <div className="seg seg-auto" role="group" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={projectClientMode === 'existing' ? 'on' : ''}
                    onClick={() => {
                      setProjectClientMode('existing');
                      const targetClient = clients.find((c) => c.id === selectedProjectClientId) || clients[0];
                      if (targetClient) {
                        setSelectedProjectClientId(targetClient.id);
                        setNewProjectData((prev) => ({
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
                    className={projectClientMode === 'new' ? 'on' : ''}
                    onClick={() => {
                      setProjectClientMode('new');
                      setNewProjectData((prev) => ({
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

            {projectClientMode === 'existing' && clients.length > 0 ? (
              <div>
                <div className="f">
                  <label htmlFor="select-project-client">Select client</label>
                  <select
                    id="select-project-client"
                    className="in"
                    value={selectedProjectClientId}
                    onChange={(e) => {
                      const chosenId = +e.target.value;
                      setSelectedProjectClientId(chosenId);
                      const found = clients.find((c) => c.id === chosenId);
                      if (found) {
                        setNewProjectData((prev) => ({
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
                  const activeSelectedClient = clients.find((c) => c.id === selectedProjectClientId) || clients[0];
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mut" style={{ fontSize: '12px' }}>Company</span>
                        <span style={{ fontWeight: 500 }}>{activeSelectedClient.co || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mut" style={{ fontSize: '12px' }}>Email</span>
                        <span>{activeSelectedClient.mail || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mut" style={{ fontSize: '12px' }}>Phone</span>
                        <span>{activeSelectedClient.tel || '—'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div>
                <div className="f">
                  <label htmlFor="nc">Name</label>
                  <input
                    id="nc"
                    type="text"
                    placeholder="e.g. Maya Lestari"
                    value={newProjectData.cn}
                    onChange={(e) =>
                      setNewProjectData((prev) => ({ ...prev, cn: e.target.value }))
                    }
                  />
                </div>
                <div className="f">
                  <label htmlFor="no">Company</label>
                  <input
                    id="no"
                    type="text"
                    placeholder="e.g. PT Digital Nusantara"
                    value={newProjectData.co}
                    onChange={(e) =>
                      setNewProjectData((prev) => ({ ...prev, co: e.target.value }))
                    }
                  />
                </div>
                <div className="two">
                  <div className="f">
                    <label htmlFor="nm">Email</label>
                    <input
                      id="nm"
                      type="email"
                      placeholder="client@company.com"
                      value={newProjectData.mail}
                      onChange={(e) =>
                        setNewProjectData((prev) => ({ ...prev, mail: e.target.value }))
                      }
                    />
                  </div>
                  <div className="f">
                    <label htmlFor="nt">Phone</label>
                    <input
                      id="nt"
                      type="tel"
                      placeholder="+62 812..."
                      value={newProjectData.tel}
                      onChange={(e) =>
                        setNewProjectData((prev) => ({ ...prev, tel: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reference Quotation Panel (Optional) */}
          {quotes.length > 0 && !editingProject && (
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0 }}>Reference quotation (Optional)</h3>
                {selectedProjectQuoteId > 0 && (
                  <button
                    type="button"
                    className="btn sm out"
                    style={{ height: '24px', fontSize: '11.5px', padding: '0 8px' }}
                    onClick={() => setSelectedProjectQuoteId(0)}
                  >
                    Reset
                  </button>
                )}
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--mut)', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                Select a quotation to automatically populate project name, deliverables, and client details.
              </p>
              <div className="f" style={{ margin: 0 }}>
                <label htmlFor="select-project-quote">Select quotation</label>
                <select
                  id="select-project-quote"
                  className="in"
                  value={selectedProjectQuoteId}
                  onChange={(e) => {
                    const chosenQid = +e.target.value;
                    setSelectedProjectQuoteId(chosenQid);
                    if (chosenQid > 0) {
                      const foundQ = quotes.find((q) => q.id === chosenQid);
                      if (foundQ) {
                        const oneTimeItems = (foundQ.items || []).filter((it) => !isRecurringBilling(it.type));
                        const projectItems = oneTimeItems.length > 0 ? oneTimeItems : foundQ.items;
                        const qTot = projectItems.reduce((acc, curr) => acc + (+curr.q || 1) * (+curr.p || 0), 0);
                        const matchedClient = clients.find(
                          (c) =>
                            c.name.toLowerCase() === foundQ.cn.toLowerCase() ||
                            (foundQ.mail && c.mail && c.mail.toLowerCase() === foundQ.mail.toLowerCase())
                        );
                        if (matchedClient) {
                          setSelectedProjectClientId(matchedClient.id);
                          setProjectClientMode('existing');
                        }
                        setNewProjectData((prev) => ({
                          ...prev,
                          name: foundQ.title,
                          v: String(qTot),
                          billingType: projectItems[0]?.type || 'One-time',
                          items: projectItems.map((it) => ({
                            d: it.d,
                            type: it.type || 'One-time',
                            p: String((+it.q || 1) * (+it.p || 0)),
                          })),
                          desc: foundQ.scope && foundQ.scope.filter((s) => s.trim()).length
                            ? foundQ.scope.filter((s) => s.trim()).join('\n')
                            : '',
                          cn: matchedClient ? matchedClient.name : foundQ.cn,
                          co: matchedClient ? matchedClient.co : foundQ.co,
                          mail: matchedClient ? matchedClient.mail : foundQ.mail,
                          tel: matchedClient ? matchedClient.tel : foundQ.tel,
                          plan: prev.pre !== 'custom'
                            ? generatePlanFromPreset(
                                prev.pre,
                                prev.due,
                                prev.plan,
                                prev.invoiceDate,
                                studioProfile.paymentTermDays
                              )
                            : prev.plan,
                        }));
                      }
                    }
                  }}
                >
                  <option value={0}>None (Create project from scratch)</option>
                  {quotes.map((q) => {
                    const oneTimeTot = (q.items || [])
                      .filter((it) => !isRecurringBilling(it.type))
                      .reduce((acc, curr) => acc + (+curr.q || 1) * (+curr.p || 0), 0);
                    const totalVal = oneTimeTot > 0
                      ? oneTimeTot
                      : (q.items || []).reduce((acc, curr) => acc + (+curr.q || 1) * (+curr.p || 0), 0);
                    return (
                      <option key={q.id} value={q.id}>
                        {formatQuoteNo(q.no, q.date, q.senderName)} — {q.title} ({q.cn} · {rp(totalVal)}) {q.pid > 0 ? '· Linked' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {/* Project Details Panel */}
          <div className="panel">
            <h3>Project</h3>
            <div className="f">
              <label htmlFor="nn">Project title</label>
              <input
                id="nn"
                type="text"
                placeholder="Project title"
                value={newProjectData.name}
                onChange={(e) =>
                  setNewProjectData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="two">
              <div className="f">
                <label htmlFor="ni-date">Invoice date</label>
                <DatePicker
                  id="ni-date"
                  value={newProjectData.invoiceDate || today()}
                  onChange={(val) =>
                    setNewProjectData((prev) => {
                      const nextPlan = [...prev.plan];
                      const prevFirstDue = addDays(prev.invoiceDate || today(), termDays);
                      if (nextPlan.length > 0 && (!nextPlan[0].due || nextPlan[0].due === prevFirstDue)) {
                        nextPlan[0] = { ...nextPlan[0], due: addDays(val, termDays) };
                      }
                      return { ...prev, invoiceDate: val, plan: nextPlan };
                    })
                  }
                  placeholder="Select invoice date"
                />
              </div>
              <div className="f">
                <label htmlFor="nd">Project deadline</label>
                <DatePicker
                  id="nd"
                  value={newProjectData.due}
                  onChange={(val) =>
                    setNewProjectData((prev) => {
                      const nextPlan = [...prev.plan];
                      if (nextPlan.length > 1) {
                        const lastIdx = nextPlan.length - 1;
                        if (!nextPlan[lastIdx].due || nextPlan[lastIdx].due === prev.due) {
                          nextPlan[lastIdx] = { ...nextPlan[lastIdx], due: val };
                        }
                        if (!nextPlan[0].due) {
                          nextPlan[0] = { ...nextPlan[0], due: addDays(prev.invoiceDate || today(), termDays) };
                        }
                        if (nextPlan.length === 3 && (!nextPlan[1].due || nextPlan[1].due === prev.due) && val) {
                          const baseDate = prev.invoiceDate || today();
                          const d1 = new Date(baseDate + 'T00:00');
                          const d2 = new Date(val + 'T00:00');
                          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 > d1) {
                            const midTime = d1.getTime() + (d2.getTime() - d1.getTime()) / 2;
                            const mid = new Date(midTime);
                            const y = mid.getFullYear();
                            const m = String(mid.getMonth() + 1).padStart(2, '0');
                            const d = String(mid.getDate()).padStart(2, '0');
                            nextPlan[1] = { ...nextPlan[1], due: `${y}-${m}-${d}` };
                          }
                        }
                      } else if (nextPlan.length === 1 && !nextPlan[0].due) {
                        nextPlan[0] = { ...nextPlan[0], due: addDays(prev.invoiceDate || today(), termDays) };
                      }
                      return { ...prev, due: val, plan: nextPlan };
                    })
                  }
                  placeholder="Select deadline"
                />
              </div>
            </div>
            <div className="f" style={{ margin: 0 }}>
              <label htmlFor="ne">Scope / description</label>
              <AutoTextarea
                id="ne"
                placeholder="Deliverables and scope breakdown (1 line = 1 point)..."
                value={newProjectData.desc}
                onChange={(e) =>
                  setNewProjectData((prev) => ({ ...prev, desc: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Rincian Biaya Panel */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Cost items</h3>
              {!amountsLocked && (
              <button
                type="button"
                className="btn sm"
                onClick={() => {
                  setNewProjectData((prev) => {
                    const nextItems = [...prev.items, { d: '', type: prev.billingType || 'One-time', p: '' }];
                    return { ...prev, items: nextItems };
                  });
                }}
              >
                <Icon name="plus" size={14} />
                Add item
              </button>
              )}
            </div>

            <div id="project-items-table">
              <div
                className="pl hd"
                style={{ gridTemplateColumns: '24px 2fr 1.2fr 1.2fr 72px' }}
              >
                <span />
                <span>Item</span>
                <span>Billing type</span>
                <span>Cost (Rp)</span>
                <span />
              </div>
              {newProjectData.items.map((r, i) => {
                const isDragging = draggedProjectItemIdx === i;
                const isDragOver = dragOverProjectItemIdx === i;
                return (
                  <div
                    key={i}
                    className={`pl ${isDragging ? 'item-dragging' : ''} ${isDragOver ? 'item-drag-over' : ''}`}
                    style={{ gridTemplateColumns: '24px 2fr 1.2fr 1.2fr 72px' }}
                    draggable={dragHandleProjectIdx === i}
                    onDragStart={() => setDraggedProjectItemIdx(i)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverProjectItemIdx !== i) setDragOverProjectItemIdx(i);
                    }}
                    onDrop={() => {
                      if (draggedProjectItemIdx !== null && draggedProjectItemIdx !== i) {
                        moveProjectItem(draggedProjectItemIdx, i);
                      }
                      setDraggedProjectItemIdx(null);
                      setDragOverProjectItemIdx(null);
                    }}
                    onDragEnd={() => {
                      setDraggedProjectItemIdx(null);
                      setDragOverProjectItemIdx(null);
                    }}
                  >
                    <button
                      type="button"
                      className="drag-handle-btn"
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                      onMouseEnter={() => setDragHandleProjectIdx(i)}
                      onMouseLeave={() => setDragHandleProjectIdx(null)}
                      onTouchStart={() => setDragHandleProjectIdx(i)}
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
                        setNewProjectData((prev) => {
                          const nextItems = [...prev.items];
                          nextItems[i] = { ...nextItems[i], d: val };
                          return { ...prev, items: nextItems };
                        });
                      }}
                    />
                    <select
                      className="in"
                      value={normalizeBillingType(r.type)}
                      disabled={amountsLocked}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewProjectData((prev) => {
                          const nextItems = [...prev.items];
                          nextItems[i] = { ...nextItems[i], type: val };
                          return { ...prev, items: nextItems };
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
                      {r.type === 'Additional' && <option value="Additional">Additional</option>}
                    </select>
                    <input
                      className="in"
                      type="number"
                      min="0"
                      placeholder="0"
                      disabled={amountsLocked}
                      value={r.p}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewProjectData((prev) => {
                          const nextItems = [...prev.items];
                          nextItems[i] = { ...nextItems[i], p: val };
                          const sumVal = nextItems.reduce((acc, curr) => acc + (+curr.p || 0), 0);
                          return {
                            ...prev,
                            items: nextItems,
                            v: sumVal > 0 ? String(sumVal) : prev.v,
                          };
                        });
                      }}
                    />
                    <div className="item-actions">
                      <button
                        type="button"
                        className="ib"
                        disabled={i === 0}
                        onClick={() => moveProjectItem(i, i - 1)}
                        title="Move up"
                        aria-label="Move up"
                      >
                        <Icon name="arrow-up" size={13} />
                      </button>
                      <button
                        type="button"
                        className="ib"
                        disabled={i === newProjectData.items.length - 1}
                        onClick={() => moveProjectItem(i, i + 1)}
                        title="Move down"
                        aria-label="Move down"
                      >
                        <Icon name="arrow-down" size={13} />
                      </button>
                      <button
                        type="button"
                        className="ib"
                        disabled={amountsLocked}
                        onClick={() => {
                          setNewProjectData((prev) => {
                            const nextItems = prev.items.filter((_, idx) => idx !== i);
                            const fallback = nextItems.length ? nextItems : [{ d: '', type: 'One-time', p: '' }];
                            const sumVal = fallback.reduce((acc, curr) => acc + (+curr.p || 0), 0);
                            return {
                              ...prev,
                              items: fallback,
                              v: sumVal > 0 ? String(sumVal) : prev.v,
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

            <div className="row" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
              <span className="mut" style={{ fontSize: '13px' }}>Total Project Value</span>
              <b style={{ fontSize: '15px' }}>
                {rp(
                  newProjectData.items.reduce(
                    (acc, curr) => acc + (+curr.p || 0),
                    0
                  ) || (+newProjectData.v || 0)
                )}
              </b>
            </div>
          </div>

          {/* Payment Scheme Panel */}
          {amountsLocked ? (
            <div className="panel">
              <h3>Payment scheme</h3>
              <p className="note" style={{ margin: 0 }}>
                Amounts and payment scheme are locked because a payment has been recorded or an
                additional invoice exists. You can still edit the title, scope, item descriptions,
                deadline, client, and language.
              </p>
            </div>
          ) : (
          <div className="panel">
            <h3>Payment scheme</h3>
            <div className="seg seg-auto" role="group" style={{ marginBottom: '14px' }}>
              {Object.keys(PRESET_NAMES).map((k) => (
                <button
                  key={k}
                  className={newProjectData.pre === k ? 'on' : ''}
                  onClick={() => handlePlanPresetChange(k)}
                >
                  {PRESET_NAMES[k]}
                </button>
              ))}
            </div>

            <div id="plan">
              <div
                className="pl hd"
                style={{ gridTemplateColumns: '1.4fr 72px 1fr 1.3fr 72px' }}
              >
                <span>Label</span>
                <span>%</span>
                <span>Amount</span>
                <span>Due date</span>
                <span />
              </div>
              {newProjectData.plan.map((r, i) => {
                const totalVal = +newProjectData.v || 0;
                const calculatedAmount = Math.round(
                  (totalVal * (+r.pct || 0)) / 100
                );
                return (
                  <div
                    key={i}
                    className="pl"
                    style={{ gridTemplateColumns: '1.4fr 72px 1fr 1.3fr 72px' }}
                  >
                    <input
                      className="in"
                      value={r.l}
                      placeholder="e.g. DP"
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewProjectData((prev) => {
                          const nextPlan = [...prev.plan];
                          nextPlan[i] = { ...nextPlan[i], l: val };
                          return { ...prev, pre: 'custom', plan: nextPlan };
                        });
                      }}
                    />
                    <input
                      className="in"
                      type="number"
                      min="0"
                      max="100"
                      value={r.pct}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                      }}
                      onChange={(e) => {
                        const val = +e.target.value;
                        setNewProjectData((prev) => {
                          const nextPlan = [...prev.plan];
                          nextPlan[i] = { ...nextPlan[i], pct: val };
                          return { ...prev, pre: 'custom', plan: nextPlan };
                        });
                      }}
                    />
                    <span className="amt">{rp(calculatedAmount)}</span>
                    <DatePicker
                      value={r.due}
                      onChange={(val) => {
                        setNewProjectData((prev) => {
                          const nextPlan = [...prev.plan];
                          nextPlan[i] = { ...nextPlan[i], due: val };
                          return { ...prev, plan: nextPlan };
                        });
                      }}
                      placeholder="Due date"
                      className="plan-row-datepicker"
                    />
                    <div className="item-actions">
                      <button
                        type="button"
                        className="ib"
                        disabled={i === 0}
                        onClick={() => moveProjectPlan(i, i - 1)}
                        title="Move up"
                        aria-label="Move up"
                      >
                        <Icon name="arrow-up" size={13} />
                      </button>
                      <button
                        type="button"
                        className="ib"
                        disabled={i === newProjectData.plan.length - 1}
                        onClick={() => moveProjectPlan(i, i + 1)}
                        title="Move down"
                        aria-label="Move down"
                      >
                        <Icon name="arrow-down" size={13} />
                      </button>
                      <button
                        type="button"
                        className="ib"
                        onClick={() => {
                          setNewProjectData((prev) => {
                            const nextPlan = prev.plan.filter((_, idx) => idx !== i);
                            return { ...prev, pre: 'custom', plan: nextPlan };
                          });
                        }}
                        aria-label="Remove installment"
                        title="Remove installment"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                className="btn sm"
                id="ar"
                onClick={() => {
                  setNewProjectData((prev) => ({
                    ...prev,
                    pre: 'custom',
                    plan: [...prev.plan, { l: '', pct: 0, due: '' }],
                  }));
                }}
              >
                <Icon name="plus" size={14} />
                Add installment
              </button>
            </div>
          </div>
          )}

          {/* Submit Panel */}
          <div className="panel">
            {!amountsLocked && (
            <div className="row" style={{ marginBottom: '8px' }}>
              <span className="mut">Total Scheme</span>
              {(() => {
                const sumPct = newProjectData.plan.reduce(
                  (acc, r) => acc + (+r.pct || 0),
                  0
                );
                return <b className={sumPct === 100 ? '' : 'od'}>{sumPct}%</b>;
              })()}
            </div>
            )}
            {!amountsLocked && (() => {
              const sumPct = newProjectData.plan.reduce(
                (acc, r) => acc + (+r.pct || 0),
                0
              );
              return sumPct !== 100 ? (
                <div className="od" style={{ fontSize: '12px', marginBottom: '10px' }}>
                  Installments must add up to 100%.
                </div>
              ) : null;
            })()}
            <p className="note" style={{ margin: '0 0 12px' }}>
              Status updates automatically: Pending → In progress → Finished as each payment is confirmed.
            </p>
            {!newProjectData.cn.trim() && (
              <div className="od" style={{ fontSize: '12px', marginBottom: '10px' }}>
                Choose or enter a client name.
              </div>
            )}
            <button
              className="btn pri"
              id="mk"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={!newProjectData.cn.trim()}
              onClick={handleCreateProjectSubmit}
            >
              {editingProject ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </div>

        {/* Right Column: Live Invoice Preview */}
        <div className="project-preview-col">
          <div className="project-preview-sticky-wrap">
            <DocLangToggle
              value={newProjectData.lang}
              onChange={(lang) => setNewProjectData((prev) => ({ ...prev, lang }))}
            />
            {newProjectData.lang === 'en' ? (
              <NewInvoicePreviewEn />
            ) : (
            <div className="docx-paper docx-a4">
              <div className="docx-body-content">
                {/* Header */}
                <div className="docx-header-grid">
                  <div>
                    <div className="docx-h-title">Invoice</div>
                    <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                      No. Invoice {editingProject?.plan[0]?.inv
                        ? formatInvoiceNo(editingProject.plan[0].inv.no, editingProject.plan[0].inv.date)
                        : `${getNextInvoiceNo(newProjectData.invoiceDate || today())} (Draft)`}
                    </div>
                    <div className="docx-h-sub">Invoice Date: {dt(newProjectData.invoiceDate || today())}</div>
                    <div className="docx-h-sub">
                      Due Date: {newProjectData.plan[0]?.due ? dt(newProjectData.plan[0].due) : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="docx-h-title">
                      {studioProfile.studioName || <span style={{ color: '#888', fontStyle: 'italic', fontWeight: 400 }}>[Nama Studio Belum Diatur]</span>}
                    </div>
                    {studioProfile.tagline && <div className="docx-h-sub" style={{ marginTop: '4px' }}>{studioProfile.tagline}</div>}
                    {(studioProfile.email || studioProfile.phone) && (
                      <div className="docx-h-sub">
                        {studioProfile.email}
                        {studioProfile.phone ? (studioProfile.email ? ` · ${studioProfile.phone}` : studioProfile.phone) : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recipient & Sender Meta Box */}
                <div className="docx-meta-grid">
                  <div>
                    <div style={{ marginBottom: '4px' }}>
                      <b>Kepada:</b> {newProjectData.cn || 'Nama Klien'} {newProjectData.co ? `(${newProjectData.co})` : ''}
                    </div>
                    <div>
                      <b>Subject:</b> Invoice {newProjectData.name || 'Layanan Project'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>
                      <b>Dari:</b> {studioProfile.studioName || <span style={{ color: '#888', fontStyle: 'italic' }}>[Atur di Settings]</span>}
                    </div>
                  </div>
                </div>

                {/* Section 1: Ruang Lingkup Pekerjaan (Scope of Work) */}
                <div className="docx-sec-title">Ruang Lingkup Pekerjaan (Scope of Work)</div>
                <ol className="docx-list">
                  {(() => {
                    const rawLines = newProjectData.desc
                      ? newProjectData.desc
                        .split('\n')
                        .map((s) => s.trim().replace(/^[-*•\d.]+\s*/, ''))
                        .filter(Boolean)
                      : [];
                    const namedItems = newProjectData.items.filter((it) => it.d.trim()).map((it) => it.d.trim());
                    const scopeItems = rawLines.length > 0
                      ? rawLines
                      : namedItems.length > 0
                        ? namedItems
                        : ['Lingkup pekerjaan sesuai kesepakatan'];
                    return scopeItems.map((sc, idx) => (
                      <li key={idx}>{sc}</li>
                    ));
                  })()}
                </ol>

                {/* Section 2: Rincian Biaya */}
                <div className="docx-sec-title bold">Rincian Biaya</div>
                <table className="docx-cost-table">
                  <thead>
                    <tr>
                      <th style={{ width: '52%' }}>Item</th>
                      <th className="c" style={{ width: '24%' }}>Jenis Biaya</th>
                      <th className="c" style={{ width: '24%' }}>Biaya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const activeItems = newProjectData.items;
                      return activeItems.map((it, idx) => (
                        <tr key={idx}>
                          <td>{it.d.trim() || (activeItems.length > 1 ? `Item Layanan ${idx + 1}` : 'Item Layanan')}</td>
                          <td className="c">{it.type || 'One-time'}</td>
                          <td className="c" style={{ fontWeight: 700 }}>
                            Rp{(+it.p || 0).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>

                {/* Payment Method & Summary Grid */}
                <div className="docx-payment-summary-grid">
                  <div className="docx-payment-method-box">
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>Payment Method</div>
                    {studioProfile.bankName || studioProfile.accountNumber ? (
                      <>
                        <div><b>Bank:</b> {studioProfile.bankName || '—'}</div>
                        <div><b>Account Number:</b> {studioProfile.accountNumber || '—'}</div>
                        <div><b>Account Holder:</b> {studioProfile.accountHolder || studioProfile.ownerName || studioProfile.studioName || '—'}</div>
                      </>
                    ) : (
                      <div style={{ color: '#71717a', fontSize: '12px', fontStyle: 'italic', lineHeight: 1.4, marginTop: '4px' }}>
                        Payment method not set in Settings.
                      </div>
                    )}
                  </div>
                  <div className="docx-calc-box">
                    <div className="docx-calc-row">
                      <span>Sub-total</span>
                      <span>Rp{(+newProjectData.v || 0).toLocaleString('id-ID')}</span>
                    </div>
                    {newProjectData.plan.length > 1 && (+newProjectData.plan[0]?.pct || 0) < 100 && (
                      <div className="docx-calc-row" style={{ color: '#4b5563' }}>
                        <span>{newProjectData.plan[0]?.l || 'Down Payment'} ({newProjectData.plan[0]?.pct || 50}%)</span>
                        <span>
                          Rp{Math.round(((+newProjectData.v || 0) * (+newProjectData.plan[0]?.pct || 50)) / 100).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                    <div className="docx-calc-total">
                      <span>Amount Due</span>
                      <span>
                        Rp{Math.round(((+newProjectData.v || 0) * (+newProjectData.plan[0]?.pct || 100)) / 100).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Catatan dan Ketentuan */}
                <div className="docx-sec-title">Catatan dan Ketentuan</div>
                <ol className="docx-list">
                  <li>
                    Pembayaran saat ini adalah <b>{newProjectData.plan[0]?.l || 'Termin 1'} ({newProjectData.plan[0]?.pct || 100}%)</b> sebesar <b>Rp{Math.round(((+newProjectData.v || 0) * (+newProjectData.plan[0]?.pct || 100)) / 100).toLocaleString('id-ID')}</b> untuk layanan <b>{newProjectData.name || 'Project'}</b>.
                  </li>
                  <li>
                    Jatuh tempo pembayaran pada {newProjectData.plan[0]?.due ? dt(newProjectData.plan[0].due) : (newProjectData.due ? dt(newProjectData.due) : 'sesuai kesepakatan')}.
                  </li>
                </ol>
              </div>

              {/* Footer Wrap at bottom of page */}
              <div className="docx-footer-wrap">
                <div className="docx-footer">
                  <div style={{ marginBottom: '16px' }}>Terima kasih atas kepercayaannya.</div>
                  <div>Hormat Kami</div>
                  <div style={{ height: '36px' }} />
                  <div style={{ fontWeight: 700 }}>
                    {studioProfile.studioName || <span style={{ color: '#888', fontStyle: 'italic' }}>[Nama Studio / Brand]</span>}
                  </div>
                  {studioProfile.tagline && <div style={{ fontSize: '13px' }}>{studioProfile.tagline}</div>}
                </div>

                {/* Subtle Watermark */}
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
