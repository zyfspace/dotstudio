'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { AutoTextarea } from '@/components/AutoTextarea';
import { DatePicker } from '@/components/DatePicker';
import { DocumentWatermark } from '@/components/DocumentWatermark';
import { rp, dt, today, addDays } from '@/lib/formatters';

export function NewQuoteView() {
  const router = useRouter();
  const {
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
  } = useDashboard();

  return (
    <div>
      <div className="top">
        <button
          className="ib"
          id="bk"
          onClick={() => router.push('/dashboard/quotations')}
          aria-label="Back to quotations"
        >
          <Icon name="back" size={18} />
        </button>
        <h1>New quotation</h1>
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
                <button
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
                >
                  <Icon name="x" />
                </button>
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
                style={{ gridTemplateColumns: '2fr 1.1fr 60px 1.2fr 1fr 30px' }}
              >
                <span>Item</span>
                <span>Billing type</span>
                <span>Qty</span>
                <span>Cost (Rp)</span>
                <span>Total</span>
                <span />
              </div>
              {newQuoteData.items.map((r, i) => {
                const amount = (+r.q || 0) * (+r.p || 0);
                return (
                  <div
                    key={i}
                    className="pl"
                    style={{ gridTemplateColumns: '2fr 1.1fr 60px 1.2fr 1fr 30px' }}
                  >
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
                      value={r.type || 'One-time'}
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
                      <option value="Bulanan">Monthly</option>
                      <option value="Per Project">Per Project</option>
                      <option value="Retainer">Retainer</option>
                      <option value="Hourly">Hourly</option>
                    </select>
                    <input
                      className="in"
                      type="number"
                      min="0"
                      value={r.q}
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
                    <button
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
                    >
                      <Icon name="x" />
                    </button>
                  </div>
                );
              })}
            </div>
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
                <button
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
                >
                  <Icon name="x" />
                </button>
              </div>
            ))}
          </div>

          {/* Syarat & Ketentuan */}
          <div className="panel">
            <h3>Terms &amp; conditions</h3>
            <div className="f">
              <label htmlFor="qpt">Payment terms</label>
              <input
                id="qpt"
                type="text"
                placeholder="e.g. 50% upfront, 50% upon completion"
                value={newQuoteData.paymentTerms}
                onChange={(e) =>
                  setNewQuoteData((prev) => ({ ...prev, paymentTerms: e.target.value }))
                }
              />
            </div>
            <div className="f" style={{ margin: 0 }}>
              <label htmlFor="qo">Additional notes</label>
              <AutoTextarea
                id="qo"
                placeholder="Special notes, revision limits, or additional terms…"
                value={newQuoteData.note}
                onChange={(e) =>
                  setNewQuoteData((prev) => ({ ...prev, note: e.target.value }))
                }
              />
            </div>
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
              When the client accepts, convert it to a project in one click.
            </p>
            <button
              className="btn pri"
              id="mk"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleSaveQuotationSubmit}
            >
              Save quotation
            </button>
          </div>
        </div>

        {/* Right Column: Live Quotation Preview */}
        <div className="project-preview-col">
          <div className="project-preview-sticky-wrap">
            <div className="docx-paper">
              <div className="docx-body-content">
                {/* Header */}
                <div className="docx-header-grid">
                  <div>
                    <div className="docx-h-title">Quotation</div>
                    <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                      No. Quotation {getNextQuoteNo(newQuoteData.date)} (Draft)
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
                      <th style={{ width: '52%' }}>Item</th>
                      <th className="c" style={{ width: '24%' }}>
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
                        <td>{it.d || `Item Layanan ${idx + 1}`}</td>
                        <td className="c">{it.type || 'One-time'}</td>
                        <td className="c" style={{ fontWeight: 700 }}>
                          Rp{(+it.p || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
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
                  {newQuoteData.note && <li>{newQuoteData.note}</li>}
                  {newQuoteData.paymentTerms && (
                    <li>
                      <b>Syarat pembayaran: {newQuoteData.paymentTerms}</b>
                    </li>
                  )}
                  <li>
                    Quotation ini berlaku {newQuoteData.validDays || 7} hari dari tanggal dikirimkan.
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
          </div>
        </div>
      </div>
    </div>
  );
}
